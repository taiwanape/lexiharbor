import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icons';
import { PHRASES } from '../data/phrases';
import { palette } from '../theme';

const categories = ['全部', '旅行', '用餐', '工作', '日常', '緊急'];

export function PhrasesScreen({ dark }: { dark: boolean }) {
  const [category, setCategory] = useState('全部');
  const phrases = useMemo(() => category === '全部' ? PHRASES : PHRASES.filter((item) => item.category === category), [category]);
  const ink = dark ? '#F4FFFD' : palette.ink;
  const muted = dark ? '#A2B8B5' : palette.muted;
  const card = dark ? palette.nightCard : palette.paper;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: ink }]}>旅行會話</Text>
      <Text style={[styles.subtitle, { color: muted }]}>需要時，說得出口</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, { borderColor: dark ? '#2D4946' : palette.line }, category === item && styles.activeCategory]}><Text style={[styles.categoryText, { color: category === item ? '#FFFFFF' : ink }]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.list}>
        {phrases.map((phrase) => (
          <View key={phrase.id} style={[styles.card, { backgroundColor: card }]}>
            <View style={styles.phraseTop}><Text style={[styles.source, { color: ink }]}>{phrase.source}</Text><Pressable hitSlop={10} onPress={() => Speech.speak(phrase.source, { language: 'en-US', rate: 0.86 })} style={styles.sound}><Icon name="volume-medium" size={19} color={palette.teal} /></Pressable></View>
            <Text style={[styles.target, { color: muted }]}>{phrase.target}</Text>
            <View style={styles.categoryLabel}><Icon name="pricetag-outline" size={12} color={palette.teal} /><Text style={styles.categoryLabelText}>{phrase.category}</Text></View>
          </View>
        ))}
      </View>
      <View style={styles.offline}><Icon name="airplane-outline" color={palette.teal} /><View><Text style={[styles.offlineTitle, { color: ink }]}>離線也能使用</Text><Text style={[styles.offlineCopy, { color: muted }]}>常用句已儲存在裝置上</Text></View></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 27, fontWeight: '900', marginTop: 8 },
  subtitle: { fontSize: 13, marginTop: 4 },
  categories: { gap: 8, paddingVertical: 20 },
  category: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 9 },
  activeCategory: { backgroundColor: palette.teal, borderColor: palette.teal },
  categoryText: { fontSize: 12, fontWeight: '800' },
  list: { gap: 11 },
  card: { borderRadius: 19, padding: 17, shadowColor: '#0A332F', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  phraseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  source: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '800' },
  sound: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  target: { fontSize: 13, marginTop: 7 },
  categoryLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  categoryLabelText: { color: palette.teal, fontSize: 10, fontWeight: '800' },
  offline: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: palette.mintSoft, borderRadius: 18, padding: 15, marginTop: 18 },
  offlineTitle: { fontSize: 13, fontWeight: '800' },
  offlineCopy: { fontSize: 11, marginTop: 2 },
});
