import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { createReadingStorage } from './readingStorage';
import { withWebReadingLock } from './readingWebStorage';

export function useReading() {
  const [storage] = useState(() => createReadingStorage(Platform.OS === 'web' ? withWebReadingLock(AsyncStorage) : AsyncStorage));
  const snapshot = useSyncExternalStore(storage.subscribe, storage.getSnapshot, storage.getSnapshot);
  useEffect(() => { void storage.load(); }, [storage]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !snapshot.ready || snapshot.saveStatus === 'saved') return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [snapshot.ready, snapshot.saveStatus]);
  return {
    ...snapshot,
    change: storage.change,
    retrySave: storage.retrySave,
    importData: storage.importData,
    getRecoveryBackup: storage.getRecoveryBackup,
    dismissNotice: storage.dismissNotice,
  };
}
