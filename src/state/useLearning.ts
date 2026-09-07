import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { createInitialStudyState, parseStoredState, StudyState } from '../domain/study';

const KEY = '@lexiharbor/state/v2';
const OLD_KEY = '@lexiharbor/state/v1';
const BACKUP_KEY = '@lexiharbor/recovery-latest';
export type ThemePreference = 'system' | 'light' | 'dark';

export function useLearning() {
  const [state, setState] = useState<StudyState>(createInitialStudyState);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [voice, setVoice] = useState<'en-US' | 'en-GB'>('en-US');
  const [retry, setRetry] = useState(0);
  const queue = useRef(Promise.resolve());
  const current = useRef(state);
  const preference = useRef({ theme, voice });
  const readyRef = useRef(false);
  const locked = useRef(false);

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.current.then(operation);
    queue.current = result.then(() => undefined, () => undefined);
    return result;
  }

  async function retainBackup(raw: string) {
    const path = `${KEY}/backup/${Date.now()}`;
    await AsyncStorage.setItem(path, raw);
    await AsyncStorage.setItem(BACKUP_KEY, path);
  }

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        const raw = saved ?? await AsyncStorage.getItem(OLD_KEY);
        const parsed = parseStoredState(raw);
        if (raw && (parsed.status === 'migrated' || parsed.status === 'invalid' || parsed.issues.length)) {
          await retainBackup(raw);
        }
        const savedTheme = await AsyncStorage.getItem('@lexiharbor/theme');
        const speechPreference = await AsyncStorage.getItem('@lexiharbor/voice');
        if (!alive) return;
        await enqueue(() => AsyncStorage.setItem(KEY, JSON.stringify(parsed.state)));
        if (!alive) return;
        current.current = parsed.state;
        setState(parsed.state);
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') { setTheme(savedTheme); preference.current.theme = savedTheme; }
        if (speechPreference === 'en-US' || speechPreference === 'en-GB') { setVoice(speechPreference); preference.current.voice = speechPreference; }
        if (parsed.status === 'migrated') setNotice('已保留舊收藏與查詢紀錄。新版複習統計從今天重新累積。');
        else if (parsed.status === 'invalid') setNotice('舊資料無法完整讀取，已保存備份；目前使用可恢復的紀錄。');
        else if (parsed.issues.length) setNotice('已修復部分格式不正確的紀錄；原始內容已保存備份。');
        else setNotice('');
        readyRef.current = true; setReady(true);
      } catch { if (alive) setNotice('暫時無法讀取學習紀錄，請重試。原有紀錄仍保留。'); }
    };
    void load();
    return () => { alive = false; };
  }, [retry]);

  const change = (update: (value: StudyState) => StudyState) => {
    if (!readyRef.current || locked.current) return;
    const next = update(current.current);
    if (next === current.current) return;
    current.current = next; setState(next);
    const snapshot = JSON.stringify(next);
    void enqueue(() => AsyncStorage.setItem(KEY, snapshot)).catch(() => setNotice('這次變更尚未存好，請按「重新儲存」，暫時不要關閉頁面。'));
  };

  const changeTheme = (value: ThemePreference) => {
    preference.current.theme = value;
    setTheme(value);
    void enqueue(() => AsyncStorage.setItem('@lexiharbor/theme', value)).catch(() => setNotice('顯示偏好尚未存好，請稍後再試。'));
  };

  const retrySave = async () => {
    if (!ready) { setRetry((value) => value + 1); return; }
    if (locked.current) return;
    const snapshot = JSON.stringify(current.current);
    const { theme: latestTheme, voice: latestVoice } = preference.current;
    try { await enqueue(() => AsyncStorage.multiSet([[KEY, snapshot], ['@lexiharbor/theme', latestTheme], ['@lexiharbor/voice', latestVoice]])); setNotice(''); }
    catch { setNotice('仍無法儲存，請先在設定中匯出備份。'); }
  };

  const changeVoice = (value: 'en-US' | 'en-GB') => {
    preference.current.voice = value;
    setVoice(value);
    void enqueue(() => AsyncStorage.setItem('@lexiharbor/voice', value)).catch(() => setNotice('發音偏好尚未存好，請稍後再試。'));
  };

  const importData = async (raw: string) => {
    if (!readyRef.current || locked.current) throw new Error('資料仍在處理中，請稍後再試。');
    const parsed = parseStoredState(raw);
    if (parsed.status === 'invalid' || parsed.status === 'empty' || parsed.issues.length) throw new Error('備份格式不正確，現有紀錄未變更。');
    locked.current = true;
    const before = JSON.stringify(current.current);
    try {
      await enqueue(async () => { await retainBackup(before); await AsyncStorage.setItem(KEY, JSON.stringify(parsed.state)); });
      current.current = parsed.state; setState(parsed.state);
      setNotice('已匯入備份；可在設定匯出匯入前的紀錄。');
    } finally { locked.current = false; }
  };

  const getRecoveryBackup = () => enqueue(async () => {
    const path = await AsyncStorage.getItem(BACKUP_KEY);
    const raw = path ? await AsyncStorage.getItem(path) : null;
    if (!raw) throw new Error('目前沒有自動保留的舊資料。');
    return raw;
  });

  return { state, ready, notice, dismissNotice: () => setNotice(''), change, theme, changeTheme, voice, changeVoice, retrySave, importData, getRecoveryBackup };
}
