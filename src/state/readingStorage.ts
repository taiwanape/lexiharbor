import {
  createReadingState,
  exportReadingState,
  mergeReadingState,
  parseReadingState,
  ReadingState,
} from '../domain/reading';

// Reading data is deliberately separate from the original dictionary favorites.
export const READING_STATE_KEY = '@lexiharbor/reading/v1';
export const READING_BACKUP_KEY = '@lexiharbor/reading/recovery-latest';
export const READING_BACKUP_SLOTS = [`${READING_STATE_KEY}/backup/0`, `${READING_STATE_KEY}/backup/1`] as const;

const CONFLICT_NOTICE = '另一個分頁已更新閱讀資料。本頁變更尚未存好；請先匯出本頁備份，再重新整理頁面，避免覆蓋另一頁的內容。';
class ReadingConflictError extends Error {}
export class ReadingWriteUnavailableError extends Error {}

export interface ReadingStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  /** Web adapters must hold one origin-wide lock across read/check/write. */
  runExclusive?<T>(operation: () => Promise<T>): Promise<T>;
}

export type ReadingSaveStatus = 'loading' | 'saving' | 'saved' | 'error';
export interface ReadingStorageSnapshot {
  state: ReadingState;
  ready: boolean;
  notice: string;
  saveStatus: ReadingSaveStatus;
}

/** A framework-independent store: all writes share one queue and one latest state. */
export function createReadingStorage(adapter: ReadingStorageAdapter) {
  let snapshot: ReadingStorageSnapshot = {
    state: createReadingState(), ready: false, notice: '', saveStatus: 'loading',
  };
  const listeners = new Set<() => void>();
  let queue: Promise<void> = Promise.resolve();
  let loading: Promise<void> | null = null;
  let locked = false;
  let revision = 0;
  let protectedRaw: string | null = null;
  let expectedRaw: string | null = null;
  let conflicted = false;

  function publish(update: Partial<ReadingStorageSnapshot>) {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    // A failed write must not prevent later writes or recovery from running.
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function retainBackup(raw: string) {
    const previous = await adapter.getItem(READING_BACKUP_KEY);
    const key = previous === READING_BACKUP_SLOTS[0] ? READING_BACKUP_SLOTS[1] : READING_BACKUP_SLOTS[0];
    await adapter.setItem(key, raw);
    // Only overwrite the inactive slot; a failed backup/pointer write leaves the
    // previous active backup recoverable. Legacy timestamp keys are not removed.
    await adapter.setItem(READING_BACKUP_KEY, key);
  }

  const runExclusive = <T,>(operation: () => Promise<T>): Promise<T> => adapter.runExclusive ? adapter.runExclusive(operation) : operation();

  async function assertFresh() {
    if (conflicted || await adapter.getItem(READING_STATE_KEY) !== expectedRaw) throw new ReadingConflictError(CONFLICT_NOTICE);
  }

  function reportFailure(error: unknown, fallback: string) {
    if (error instanceof ReadingConflictError) {
      conflicted = true;
      publish({ saveStatus: 'error', notice: CONFLICT_NOTICE });
    } else publish({ saveStatus: 'error', notice: error instanceof ReadingWriteUnavailableError ? error.message : fallback });
  }

  function load(): Promise<void> {
    if (snapshot.ready) return Promise.resolve();
    if (loading) return loading;
    publish({ saveStatus: 'loading', notice: '' });
    loading = enqueue(async () => {
      try {
        const raw = await adapter.getItem(READING_STATE_KEY);
        expectedRaw = raw;
        const parsed = parseReadingState(raw);
        if (!parsed.ok) {
          protectedRaw = raw;
          let backedUp = false;
          if (raw !== null) {
            try {
              await runExclusive(async () => { await assertFresh(); await retainBackup(raw); });
              backedUp = true;
            } catch (error) {
              if (error instanceof ReadingConflictError) conflicted = true;
              // The original key and in-memory raw are still untouched.
            }
          }
          publish({
            ready: true,
            saveStatus: 'error',
            notice: conflicted ? CONFLICT_NOTICE : backedUp
              ? '閱讀資料格式不正確，原始內容已保留備份且尚未覆寫。請先匯出復原備份，再匯入有效備份恢復使用。'
              : '閱讀資料格式不正確，原始內容仍保留，且尚未覆寫。可先匯出復原備份；請匯入有效備份恢復使用。',
          });
          return;
        }
        protectedRaw = null;
        publish({ state: parsed.state, ready: true, saveStatus: 'saved', notice: '' });
      } catch {
        publish({ ready: false, saveStatus: 'error', notice: '暫時無法讀取閱讀資料，原有內容未變更。請按「重新儲存」重試讀取。' });
      }
    }).finally(() => { loading = null; });
    return loading;
  }

  function assertWritable() {
    if (!snapshot.ready) throw new Error('閱讀資料尚未讀取完成，請稍後再試。');
    if (locked) throw new Error('正在匯入閱讀備份，請等完成後再操作。');
    if (conflicted) throw new Error(CONFLICT_NOTICE);
    if (protectedRaw !== null) throw new Error('原始閱讀資料需要修復；請先匯出復原備份，再匯入有效備份。');
  }

  function persist(raw: string, expectedRevision: number): Promise<boolean> {
    return enqueue(async () => {
      try {
        await runExclusive(async () => {
          await assertFresh();
          if (expectedRaw !== raw) await adapter.setItem(READING_STATE_KEY, raw);
          expectedRaw = raw;
        });
        if (expectedRevision === revision && !locked) publish({ saveStatus: 'saved', notice: '' });
        return true;
      } catch (error) {
        if (error instanceof ReadingConflictError || expectedRevision === revision && !locked) {
          reportFailure(error, '這次閱讀變更尚未存好。請按「重新儲存」，或先匯出備份；暫時不要關閉頁面。');
        }
        return false;
      }
    });
  }

  function change(updater: (state: ReadingState) => ReadingState): boolean {
    assertWritable();
    // Work from a detached snapshot, so even a throwing/mutating updater cannot
    // damage the live state before validation completes.
    const before = exportReadingState(snapshot.state);
    const detached = parseReadingState(before);
    if (!detached.ok) throw new Error(detached.error);
    const candidate = updater(detached.state);
    const raw = exportReadingState(candidate);
    const checked = parseReadingState(raw);
    if (!checked.ok) throw new Error(checked.error);
    if (raw === before) return false;
    revision += 1;
    publish({ state: checked.state, saveStatus: 'saving', notice: '' });
    void persist(raw, revision);
    return true;
  }

  async function retrySave(): Promise<boolean> {
    if (!snapshot.ready) { await load(); return snapshot.ready && snapshot.saveStatus === 'saved'; }
    if (locked) return false;
    if (conflicted) { publish({ saveStatus: 'error', notice: CONFLICT_NOTICE }); return false; }
    if (protectedRaw !== null) {
      publish({ saveStatus: 'error', notice: '原始資料尚未覆寫。請先匯出復原備份，再匯入有效備份恢復使用。' });
      return false;
    }
    const raw = exportReadingState(snapshot.state);
    revision += 1;
    publish({ saveStatus: 'saving', notice: '' });
    return persist(raw, revision);
  }

  async function importData(raw: string): Promise<void> {
    if (!snapshot.ready) throw new Error('閱讀資料尚未讀取完成，請先重試讀取。');
    if (locked) throw new Error('正在匯入閱讀備份，請等完成後再操作。');
    if (conflicted) throw new Error(CONFLICT_NOTICE);
    if (!raw.trim()) throw new Error('請先貼上有效的閱讀備份內容。');
    const parsed = parseReadingState(raw);
    if (!parsed.ok) throw new Error(parsed.error);
    // Validate the entire merge before any persistence or in-memory mutation.
    const merged = mergeReadingState(snapshot.state, parsed.state);
    const nextRaw = exportReadingState(merged);
    const currentRaw = exportReadingState(snapshot.state);
    const before = protectedRaw ?? currentRaw;
    const unchanged = protectedRaw === null && nextRaw === currentRaw;
    locked = true;
    revision += 1;
    publish({ saveStatus: 'saving', notice: '' });
    try {
      await enqueue(() => runExclusive(async () => {
        await assertFresh();
        if (!unchanged) await retainBackup(before);
        // A no-op merge may still contain this page's unsaved edits. Do not say
        // "saved" until those edits really reach storage (or a queued save did).
        const persisted = parseReadingState(expectedRaw);
        if (!persisted.ok || exportReadingState(persisted.state) !== nextRaw) await adapter.setItem(READING_STATE_KEY, nextRaw);
        else if (protectedRaw !== null) await adapter.setItem(READING_STATE_KEY, nextRaw);
        else return;
        expectedRaw = nextRaw;
      }));
      protectedRaw = null;
      publish({ state: merged, saveStatus: 'saved', notice: unchanged ? '備份與本頁內容相同，目前內容已確認儲存；沒有新增重複備份。' : '已合併匯入閱讀備份；匯入前的原始內容仍可匯出復原。' });
    } catch (error) {
      reportFailure(error, '匯入未完成，目前的閱讀內容未變更。請確認可用儲存空間後重試。');
      throw new Error(error instanceof ReadingConflictError || error instanceof ReadingWriteUnavailableError ? error.message : '無法完成備份與儲存，未套用匯入內容。');
    } finally {
      locked = false;
    }
  }

  function getRecoveryBackup(): Promise<string> {
    if (protectedRaw !== null) return Promise.resolve(protectedRaw);
    return enqueue(async () => {
      const key = await adapter.getItem(READING_BACKUP_KEY);
      const raw = key ? await adapter.getItem(key) : null;
      if (raw === null) throw new Error('目前沒有可匯出的閱讀復原備份。');
      return raw;
    });
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    change,
    retrySave,
    importData,
    getRecoveryBackup,
    dismissNotice: () => publish({ notice: '' }),
    whenIdle: () => queue,
  };
}
