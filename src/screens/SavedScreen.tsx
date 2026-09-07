import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icons';
import { WordRow } from '../components/WordRow';
import { getWord } from '../data/dictionary';
import { useAppState } from '../state/AppContext';
import { palette } from '../theme';

export function SavedScreen({ dark }: { dark: boolean }) {
  const { savedWords, history, toggleSaved, clearHistory } = useAppState();
  const [segment, setSegment] = useState<'saved' | 'history'>('saved');
  const words = useMemo(() => (segment === 'saved' ? savedWords : history).map(getWord).filter((item) => Boolean(item)), [history, savedWords, segment]);
  const ink = dark ? '#F4FFFD' : palette.ink;
  const muted = dark ? '#A2B8B5' : palette.muted;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.title, { color: ink }]}>我的詞庫</Text><Text style={[styles.subtitle, { color: muted }]}>把想記住的字放在這裡</Text></View>{segment === 'history' && history.length > 0 && <Pressable onPress={clearHistory}><Text style={styles.clear}>清除</Text></Pressable>}</View>
      <View style={[styles.segment, { backgroundColor: dark ? palette.nightCard : '#E8F0EE' }]}>
        <Pressable onPress={() => setSegment('saved')} style={[styles.segmentButton, segment === 'saved' && { backgroundColor: dark ? '#24413E' : palette.paper }]}><Icon name="bookmark" size={16} color={segment === 'saved' ? palette.teal : muted} /><Text style={[styles.segmentText, { color: segment === 'saved' ? ink : muted }]}>收藏 {savedWords.length}</Text></Pressable>
        <Pressable onPress={() => setSegment('history')} style={[styles.segmentButton, segment === 'history' && { backgroundColor: dark ? '#24413E' : palette.paper }]}><Icon name="time" size={16} color={segment === 'history' ? palette.teal : muted} /><Text style={[styles.segmentText, { color: segment === 'history' ? ink : muted }]}>歷史 {history.length}</Text></Pressable>
      </View>
      {words.length ? words.map((entry) => entry && <WordRow key={entry.word} entry={entry} dark={dark} saved={savedWords.includes(entry.word)} onPress={() => undefined} onSave={() => toggleSaved(entry.word)} />) : (
        <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={segment === 'saved' ? 'bookmark-outline' : 'time-outline'} size={33} color={palette.teal} /></View><Text style={[styles.emptyTitle, { color: ink }]}>{segment === 'saved' ? '還沒有收藏單字' : '還沒有搜尋紀錄'}</Text><Text style={[styles.emptyCopy, { color: muted }]}>在字典頁找到單字後，按下書籤即可保存。</Text></View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { fontSize: 27, fontWeight: '900' }, subtitle: { fontSize: 13, marginTop: 4 }, clear: { color: palette.coral, fontSize: 12, fontWeight: '800' },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 17, marginVertical: 20 },
  segmentButton: { flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 10 },
  segmentText: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 35 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900', marginTop: 15 }, emptyCopy: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 6 },
});
