import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadingState, exportReadingState, parseReadingState, ReadingState } from '../src/domain/reading';
import { createReadingStorage, READING_BACKUP_KEY, READING_BACKUP_SLOTS, READING_STATE_KEY, ReadingStorageAdapter } from '../src/state/readingStorage';
import { withWebReadingLock } from '../src/state/readingWebStorage';

function memoryAdapter(initial: [string, string][] = []) {
  const values = new Map(initial);
  const writes: string[] = [];
  let failRead = false;
  let failWrite: (key: string) => boolean = () => false;
  let hold: Promise<void> | null = null;
  const adapter: ReadingStorageAdapter = {
    async getItem(key) {
      if (failRead) throw new Error('Read blocked');
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      if (hold) await hold;
      if (failWrite(key)) throw new Error('Storage full');
      values.set(key, value);
      writes.push(key);
    },
  };
  return { values, writes, adapter, failReads: (value: boolean) => { failRead = value; }, failWrites: (fn: (key: string) => boolean) => { failWrite = fn; }, holdWrites: (promise: Promise<void> | null) => { hold = promise; } };
}

function withMemoryLock(adapter: ReadingStorageAdapter): ReadingStorageAdapter {
  let tail: Promise<void> = Promise.resolve();
  return { ...adapter, runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  } };
}

const article = (id: string) => ({ id, title: `Article ${id}`, body: 'A useful sentence.', createdAt: 1000, updatedAt: 1000, lastReadAt: null });
const addArticle = (id: string) => (state: ReadingState): ReadingState => ({ ...state, articles: [...state.articles, article(id)] });
const storedState = (raw: string | undefined) => {
  assert.ok(raw);
  const parsed = parseReadingState(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.state;
};

test('ready gate protects startup, and loading does not touch old dictionary data', async () => {
  const original = '{"savedWords":["bank"]}';
  const memory = memoryAdapter([['@lexiharbor/state/v2', original]]);
  const store = createReadingStorage(memory.adapter);
  assert.throws(() => store.change(addArticle('a1')), /尚未讀取/);
  await store.load();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  assert.deepEqual(store.getSnapshot().state, createReadingState());
  assert.equal(memory.values.get('@lexiharbor/state/v2'), original);
  assert.deepEqual(memory.writes, []);
});

test('rapid updates and retry use the latest state without stale-write data loss', async () => {
  const memory = memoryAdapter();
  const store = createReadingStorage(memory.adapter);
  await store.load();
  let release!: () => void;
  memory.holdWrites(new Promise<void>((resolve) => { release = resolve; }));
  store.change(addArticle('a1'));
  const retry = store.retrySave();
  store.change(addArticle('a2'));
  assert.equal(store.getSnapshot().state.articles.length, 2);
  assert.equal(store.getSnapshot().saveStatus, 'saving');
  release();
  await retry;
  await store.whenIdle();
  assert.equal(storedState(memory.values.get(READING_STATE_KEY)).articles.length, 2);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  const reloaded = createReadingStorage(memory.adapter);
  await reloaded.load();
  assert.deepEqual(reloaded.getSnapshot().state, store.getSnapshot().state);
});

test('storage failures retain the live state and can be retried without losing edits', async () => {
  const memory = memoryAdapter();
  const store = createReadingStorage(memory.adapter);
  await store.load();
  memory.failWrites(() => true);
  store.change(addArticle('a1'));
  await store.whenIdle();
  assert.equal(store.getSnapshot().saveStatus, 'error');
  assert.match(store.getSnapshot().notice, /尚未存好/);
  assert.equal(store.getSnapshot().state.articles.length, 1);
  memory.failWrites(() => false);
  assert.equal(await store.retrySave(), true);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  assert.equal(store.getSnapshot().notice, '');
  assert.equal(storedState(memory.values.get(READING_STATE_KEY)).articles.length, 1);
});

test('failed initial read never initializes over existing data and can be retried', async () => {
  const existing = exportReadingState(addArticle('a1')(createReadingState()));
  const memory = memoryAdapter([[READING_STATE_KEY, existing]]);
  memory.failReads(true);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(store.getSnapshot().saveStatus, 'error');
  assert.equal(memory.values.get(READING_STATE_KEY), existing);
  assert.deepEqual(memory.writes, []);
  memory.failReads(false);
  assert.equal(await store.retrySave(), true);
  assert.equal(store.getSnapshot().state.articles.length, 1);
});

test('corrupt raw is recoverable and protected from change/retry until explicit valid import', async () => {
  const corrupt = '{ damaged record';
  const memory = memoryAdapter([[READING_STATE_KEY, corrupt]]);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().saveStatus, 'error');
  assert.equal(memory.values.get(READING_STATE_KEY), corrupt);
  assert.equal(await store.getRecoveryBackup(), corrupt);
  assert.throws(() => store.change(addArticle('a1')), /需要修復/);
  assert.equal(await store.retrySave(), false);
  assert.equal(memory.values.get(READING_STATE_KEY), corrupt);
  await store.importData(exportReadingState(addArticle('a1')(createReadingState())));
  assert.equal(store.getSnapshot().state.articles.length, 1);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  assert.equal(await store.getRecoveryBackup(), corrupt);
  store.change(addArticle('a2'));
  await store.whenIdle();
  assert.equal(store.getSnapshot().state.articles.length, 2);
});

test('corrupt raw still exports if writing the recovery copy fails', async () => {
  const corrupt = 'invalid';
  const memory = memoryAdapter([[READING_STATE_KEY, corrupt]]);
  memory.failWrites(() => true);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  assert.equal(store.getSnapshot().saveStatus, 'error');
  assert.equal(await store.getRecoveryBackup(), corrupt);
  assert.equal(memory.values.get(READING_STATE_KEY), corrupt);
});

test('import merges, locks out edits, and saves an exportable pre-import backup', async () => {
  const before = addArticle('a1')(createReadingState());
  const memory = memoryAdapter([[READING_STATE_KEY, exportReadingState(before)]]);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  let release!: () => void;
  memory.holdWrites(new Promise<void>((resolve) => { release = resolve; }));
  const importing = store.importData(exportReadingState(addArticle('a2')(createReadingState())));
  assert.throws(() => store.change(addArticle('a3')), /正在匯入/);
  assert.equal(await store.retrySave(), false);
  await assert.rejects(() => store.importData(exportReadingState(before)), /正在匯入/);
  assert.deepEqual(store.getSnapshot().state, before);
  release();
  await importing;
  assert.equal(store.getSnapshot().state.articles.length, 2);
  assert.deepEqual(storedState(await store.getRecoveryBackup()), before);
  assert.equal(memory.writes.at(-1), READING_STATE_KEY);
  assert.equal(memory.writes.at(-2), READING_BACKUP_KEY);
});

test('failed backup or final import write never applies incoming state', async () => {
  for (const failingKey of [READING_BACKUP_KEY, READING_STATE_KEY]) {
    const before = addArticle('a1')(createReadingState());
    const beforeRaw = exportReadingState(before);
    const memory = memoryAdapter([[READING_STATE_KEY, beforeRaw]]);
    const store = createReadingStorage(memory.adapter);
    await store.load();
    memory.failWrites((key) => key === failingKey);
    await assert.rejects(() => store.importData(exportReadingState(addArticle('a2')(createReadingState()))), /未套用/);
    assert.deepEqual(store.getSnapshot().state, before);
    assert.equal(memory.values.get(READING_STATE_KEY), beforeRaw);
    assert.equal(store.getSnapshot().saveStatus, 'error');
    memory.failWrites(() => false);
    await store.importData(exportReadingState(addArticle('a2')(createReadingState())));
    assert.equal(store.getSnapshot().state.articles.length, 2);
  }
});

test('invalid imports and domain updater errors propagate without changing live state', async () => {
  const memory = memoryAdapter();
  const store = createReadingStorage(memory.adapter);
  await store.load();
  const before = store.getSnapshot().state;
  await assert.rejects(() => store.importData('bad json'));
  await assert.rejects(() => store.importData(''));
  assert.throws(() => store.change((state) => {
    state.articles.push(article('a1'));
    throw new Error('invalid selection');
  }), /invalid selection/);
  assert.deepEqual(store.getSnapshot().state, before);
  assert.deepEqual(memory.writes, []);
});

test('stale tabs cannot overwrite a newer tab; local edits remain exportable and retry/import refuse', async () => {
  const memory = memoryAdapter();
  const first = createReadingStorage(memory.adapter);
  const second = createReadingStorage(memory.adapter);
  await Promise.all([first.load(), second.load()]);
  first.change(addArticle('a1'));
  await first.whenIdle();
  const committed = memory.values.get(READING_STATE_KEY);
  second.change(addArticle('a2'));
  await second.whenIdle();
  assert.equal(second.getSnapshot().saveStatus, 'error');
  assert.match(second.getSnapshot().notice, /另一個分頁/);
  assert.equal(memory.values.get(READING_STATE_KEY), committed);
  assert.equal(storedState(exportReadingState(second.getSnapshot().state)).articles[0]?.id, 'a2');
  assert.equal(await second.retrySave(), false);
  await assert.rejects(() => second.importData(exportReadingState(second.getSnapshot().state)), /另一個分頁/);
  assert.throws(() => second.change(addArticle('a3')), /另一個分頁/);
  assert.equal(memory.values.get(READING_STATE_KEY), committed);
});

test('a shared write lock serializes simultaneous tabs so exactly one raw-value check wins', async () => {
  const memory = memoryAdapter();
  const lockedAdapter = withMemoryLock(memory.adapter);
  const first = createReadingStorage(lockedAdapter);
  const second = createReadingStorage(lockedAdapter);
  await Promise.all([first.load(), second.load()]);
  first.change(addArticle('a1'));
  second.change(addArticle('a2'));
  await Promise.all([first.whenIdle(), second.whenIdle()]);
  assert.equal(first.getSnapshot().saveStatus, 'saved');
  assert.equal(second.getSnapshot().saveStatus, 'error');
  assert.deepEqual(storedState(memory.values.get(READING_STATE_KEY)).articles.map((entry) => entry.id), ['a1']);
  assert.deepEqual(memory.writes, [READING_STATE_KEY]);
});

test('stale import refuses before writing a backup or replacing newer content', async () => {
  const memory = memoryAdapter();
  const lockedAdapter = withMemoryLock(memory.adapter);
  const first = createReadingStorage(lockedAdapter);
  const second = createReadingStorage(lockedAdapter);
  await Promise.all([first.load(), second.load()]);
  first.change(addArticle('a1'));
  await first.whenIdle();
  await assert.rejects(() => second.importData(exportReadingState(addArticle('a2')(createReadingState()))), /另一個分頁/);
  assert.deepEqual(second.getSnapshot().state, createReadingState());
  assert.deepEqual(memory.writes, [READING_STATE_KEY]);
  assert.equal(storedState(memory.values.get(READING_STATE_KEY)).articles[0]?.id, 'a1');
});

test('a hundred identical imports need no duplicate backups or quota growth', async () => {
  const before = addArticle('a1')(createReadingState());
  before.articles[0]!.body = 'a'.repeat(10000);
  const raw = exportReadingState(before);
  const memory = memoryAdapter([[READING_STATE_KEY, raw]]);
  const quotaAdapter: ReadingStorageAdapter = { ...memory.adapter, async setItem(key, value) {
    const total = [...memory.values.values()].reduce((length, item) => length + item.length, 0) - (memory.values.get(key)?.length ?? 0) + value.length;
    if (total > 12000) throw new Error('quota exceeded');
    return memory.adapter.setItem(key, value);
  } };
  const store = createReadingStorage(quotaAdapter);
  await store.load();
  for (let index = 0; index < 100; index += 1) await store.importData(raw);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  assert.deepEqual([...memory.values.keys()], [READING_STATE_KEY]);
  assert.deepEqual(memory.writes, []);
});

test('a no-op import must really persist dirty state before claiming saved', async () => {
  const memory = memoryAdapter();
  const store = createReadingStorage(memory.adapter);
  await store.load();
  memory.failWrites((key) => key === READING_STATE_KEY);
  store.change(addArticle('a1'));
  await store.whenIdle();
  const ownBackup = exportReadingState(store.getSnapshot().state);
  await assert.rejects(() => store.importData(ownBackup), /未套用/);
  assert.equal(store.getSnapshot().saveStatus, 'error');
  assert.equal(memory.values.has(READING_STATE_KEY), false);
  assert.equal(memory.values.has(READING_BACKUP_KEY), false);
  memory.failWrites(() => false);
  await store.importData(ownBackup);
  assert.equal(store.getSnapshot().saveStatus, 'saved');
  assert.equal(memory.values.get(READING_STATE_KEY), ownBackup);
  assert.deepEqual(memory.writes, [READING_STATE_KEY]);
});

test('changed imports rotate only two backups and do not delete legacy backup keys', async () => {
  const legacyKey = `${READING_STATE_KEY}/backup/older-timestamp`;
  const memory = memoryAdapter([[legacyKey, 'legacy raw'], [READING_BACKUP_KEY, legacyKey]]);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  let before = createReadingState();
  for (let index = 0; index < 8; index += 1) {
    await store.importData(exportReadingState(addArticle(`a${index}`)(createReadingState())));
    assert.deepEqual(storedState(await store.getRecoveryBackup()), before);
    before = store.getSnapshot().state;
  }
  assert.equal(memory.values.get(legacyKey), 'legacy raw');
  assert.equal(memory.values.has(READING_BACKUP_SLOTS[0]), true);
  assert.equal(memory.values.has(READING_BACKUP_SLOTS[1]), true);
  assert.equal(memory.values.size, 5);
});

test('failure publishing a rotated backup preserves the active backup and existing main data', async () => {
  const initial = addArticle('a1')(createReadingState());
  const memory = memoryAdapter([[READING_STATE_KEY, exportReadingState(initial)]]);
  const store = createReadingStorage(memory.adapter);
  await store.load();
  await store.importData(exportReadingState(addArticle('a2')(createReadingState())));
  const oldBackup = await store.getRecoveryBackup();
  const oldMain = memory.values.get(READING_STATE_KEY);
  memory.failWrites((key) => key === READING_BACKUP_KEY);
  await assert.rejects(() => store.importData(exportReadingState(addArticle('a3')(createReadingState()))));
  assert.equal(await store.getRecoveryBackup(), oldBackup);
  assert.equal(memory.values.get(READING_STATE_KEY), oldMain);
});

test('web storage uses a named exclusive browser lock and refuses writes without Web Locks', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    const memory = memoryAdapter();
    let requests = 0;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { async request(name: string, options: { mode: string }, operation: () => Promise<unknown>) {
      assert.equal(name, 'lexiharbor-reading-write-v1');
      assert.equal(options.mode, 'exclusive');
      requests += 1;
      return operation();
    } } } });
    const store = createReadingStorage(withWebReadingLock(memory.adapter));
    await store.load();
    store.change(addArticle('a1'));
    await store.whenIdle();
    assert.equal(requests, 1);
    assert.equal(store.getSnapshot().saveStatus, 'saved');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    store.change(addArticle('a2'));
    await store.whenIdle();
    assert.equal(store.getSnapshot().saveStatus, 'error');
    assert.match(store.getSnapshot().notice, /不支援安全的跨分頁儲存/);
    assert.equal(storedState(memory.values.get(READING_STATE_KEY)).articles.length, 1);
    assert.equal(store.getSnapshot().state.articles.length, 2);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
