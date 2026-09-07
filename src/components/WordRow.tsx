import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';
import { WordEntry } from '../types';
import { Icon } from './Icons';

export function WordRow({ entry, saved, onPress, onSave, dark }: {
  entry: WordEntry;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  dark: boolean;
}) {
  const card = dark ? palette.nightCard : palette.paper;
  const ink = dark ? '#F0FDFA' : palette.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: card, opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text style={[styles.word, { color: ink }]}>{entry.word}</Text>
          <Text style={styles.level}>{entry.level}</Text>
        </View>
        <Text style={styles.phonetic}>{entry.phonetic} · {entry.partOfSpeech}</Text>
        <Text numberOfLines={1} style={[styles.translation, { color: ink }]}>{entry.translation}</Text>
      </View>
      <Pressable hitSlop={12} onPress={(event) => { event.stopPropagation(); onSave(); }}>
        <Icon name={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? palette.amber : palette.muted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 17, borderRadius: 18, marginBottom: 10, shadowColor: '#0A332F', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  copy: { flex: 1, paddingRight: 12 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 19, fontWeight: '800' },
  level: { color: palette.tealDark, backgroundColor: palette.mint, fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  phonetic: { color: palette.teal, fontSize: 12, marginTop: 3 },
  translation: { fontSize: 14, marginTop: 7 },
});
