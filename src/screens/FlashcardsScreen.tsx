import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icons';
import { WORDS } from '../data/dictionary';
import { useAppState } from '../state/AppContext';
import { palette } from '../theme';
import { ReviewRating } from '../types';

export function FlashcardsScreen({ dark }: { dark: boolean }) {
  const { reviewWord, reviewCount, knownWords, streak } = useAppState();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const deck = useMemo(() => WORDS.filter((entry) => !knownWords.includes(entry.word)).concat(WORDS.filter((entry) => knownWords.includes(entry.word))), [knownWords]);
  const entry = deck[index % deck.length]!;
  const ink = dark ? '#F4FFFD' : palette.ink;
  const muted = dark ? '#A2B8B5' : palette.muted;

  const rate = (rating: ReviewRating) => {
    reviewWord(entry.word, rating);
    setFlipped(false);
    setIndex((current) => (current + 1) % deck.length);
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View><Text style={[styles.title, { color: ink }]}>今日複習</Text><Text style={[styles.subtitle, { color: muted }]}>每天一點，記得更久</Text></View>
        <View style={styles.streak}><Text style={styles.flame}>🔥</Text><Text style={styles.streakText}>{streak} 天</Text></View>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, ((reviewCount % 10) / 10) * 100)}%` }]} /></View>
      <Text style={[styles.progressCopy, { color: muted }]}>今日 {reviewCount % 10} / 10</Text>

      <Pressable onPress={() => setFlipped((value) => !value)} style={styles.cardWrap}>
        <LinearGradient colors={flipped ? ['#155E75', '#0E7490'] : ['#0F766E', '#149485']} style={styles.card}>
          <View style={styles.cardTop}><Text style={styles.level}>{entry.level}</Text><Pressable onPress={(event) => { event.stopPropagation(); Speech.speak(entry.word, { language: 'en-US', rate: 0.82 }); }}><Icon name="volume-medium" color="#FFFFFF" /></Pressable></View>
          {!flipped ? (
            <View style={styles.cardCenter}>
              <Text style={styles.cardWord}>{entry.word}</Text>
              <Text style={styles.cardPhonetic}>{entry.phonetic}</Text>
              <Text style={styles.tapHint}>輕觸卡片查看解釋</Text>
            </View>
          ) : (
            <View style={styles.cardCenter}>
              <Text style={styles.cardTranslation}>{entry.translation}</Text>
              <Text style={styles.definition}>{entry.definitions[0]!.text}</Text>
              <Text style={styles.example}>“{entry.definitions[0]!.example}”</Text>
            </View>
          )}
          <Text style={styles.cardIndex}>{(index % deck.length) + 1} / {deck.length}</Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.actions}>
        <RateButton label="再看看" caption="1 分鐘" color={palette.coral} icon="refresh" onPress={() => rate('again')} />
        <RateButton label="記得" caption="3 天" color={palette.teal} icon="checkmark" onPress={() => rate('good')} />
        <RateButton label="太簡單" caption="7 天" color={palette.amber} icon="flash" onPress={() => rate('easy')} />
      </View>
      <View style={[styles.tip, { backgroundColor: dark ? palette.nightCard : palette.paper }]}>
        <Icon name="bulb-outline" color={palette.amber} />
        <Text style={[styles.tipText, { color: muted }]}>先在腦中說出答案，再翻面確認，記憶效果會更好。</Text>
      </View>
    </View>
  );
}

function RateButton({ label, caption, color, icon, onPress }: { label: string; caption: string; color: string; icon: 'refresh' | 'checkmark' | 'flash'; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.rateButton}><View style={[styles.rateIcon, { backgroundColor: `${color}18` }]}><Icon name={icon} size={19} color={color} /></View><Text style={[styles.rateLabel, { color }]}>{label}</Text><Text style={styles.rateCaption}>{caption}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  title: { fontSize: 27, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7E0', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 7 },
  flame: { fontSize: 15 }, streakText: { color: '#9A5704', fontWeight: '800', fontSize: 12 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: palette.line, marginTop: 24, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.teal, borderRadius: 4 },
  progressCopy: { textAlign: 'right', fontSize: 11, marginTop: 5 },
  cardWrap: { flex: 1, maxHeight: 430, minHeight: 330, marginVertical: 20 },
  card: { flex: 1, borderRadius: 30, padding: 23, shadowColor: '#064E3B', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  level: { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, fontSize: 11, fontWeight: '900' },
  cardCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWord: { color: '#FFFFFF', fontSize: 39, fontWeight: '900', letterSpacing: -1 },
  cardPhonetic: { color: '#C7F3EB', fontSize: 14, marginTop: 8 },
  tapHint: { color: '#BCE7E0', fontSize: 11, marginTop: 38 },
  cardTranslation: { color: '#FFFFFF', textAlign: 'center', fontSize: 24, fontWeight: '900' },
  definition: { color: '#E8FFFC', textAlign: 'center', lineHeight: 22, fontSize: 14, marginTop: 19 },
  example: { color: '#BFE8E4', textAlign: 'center', fontStyle: 'italic', fontSize: 13, lineHeight: 20, marginTop: 16 },
  cardIndex: { color: '#BCE7E0', fontSize: 11, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  rateButton: { alignItems: 'center', minWidth: 78 },
  rateIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rateLabel: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  rateCaption: { color: palette.muted, fontSize: 10, marginTop: 2 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 16, padding: 13, marginTop: 17 },
  tipText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
