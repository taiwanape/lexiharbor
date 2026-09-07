import { ReadingStorageAdapter, ReadingWriteUnavailableError } from './readingStorage';

const READING_WRITE_LOCK = 'lexiharbor-reading-write-v1';

/** A same-origin Web Lock prevents two tabs from both passing the raw-value check. */
export function withWebReadingLock(adapter: ReadingStorageAdapter): ReadingStorageAdapter {
  return {
    getItem: (key) => adapter.getItem(key),
    setItem: (key, value) => adapter.setItem(key, value),
    async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
      if (typeof navigator === 'undefined' || !navigator.locks?.request) {
        throw new ReadingWriteUnavailableError('此瀏覽器不支援安全的跨分頁儲存，這次變更尚未存好。請先匯出本頁備份，再使用支援 Web Locks 的最新版瀏覽器開啟。');
      }
      return navigator.locks.request(READING_WRITE_LOCK, { mode: 'exclusive' }, operation);
    },
  };
}
