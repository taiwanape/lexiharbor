import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icons';
import { WordRow } from '../components/WordRow';
import { getWord, searchWords, WORDS } from '../data/dictionary';
import { useAppState } from '../state/AppContext';
import { palette } from '../theme';
import { WordEntry } from '../types';

export function DictionaryScreen({ dark, onUpgrade }: { dark: boolean; onUpgrade: () => void }) {
  const { savedWords, toggleSaved, rememberSearch, history, streak } = useAppState();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WordEntry | null>(null);
  const ink = dark ? '#F4FFFD' : palette.ink;
  const muted = dark ? '#9BB5B2' : palette.muted;
  const card = dark ? palette.nightCard : palette.paper;
  const results = useMemo(() => searchWords(query), [query]);

  const openWord = (entry: WordEntry) => {
    Keyboard.dismiss();
    rememberSearch(entry.word);
    setSelected(entry);
  };

  return (
    <View style={styles.flex}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0F766E', '#159889']} style={styles.hero}>
          <View style={styles.topLine}>
            <View>
              <Text style={styles.eyebrow}>LEXIHARBOR</Text>
              <Text style={styles.greeting}>今天想學什麼？</Text>
            </View>
            <Pressable onPress={onUpgrade} style={styles.proButton}>
              <Icon name="sparkles" size={16} color="#FFF7D6" />
              <Text style={styles.proText}>升級</Text>
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Icon name="search" size={22} color={palette.teal} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="輸入英文或中文…"
              placeholderTextColor="#78918E"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.input}
              accessibilityLabel="搜尋字典"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}><Icon name="close-circle" size={20} color="#9AAEAB" /></Pressable>
            ) : (
              <Pressable onPress={() => Speech.speak('Say the word you want to find')} hitSlop={10}><Icon name="mic-outline" size={21} color={palette.teal} /></Pressable>
            )}
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>英 ⇄ 繁中</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroMetaText}>離線可查</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroMetaText}>連續 {streak} 天</Text>
          </View>
        </LinearGradient>

        {query ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: ink }]}>搜尋結果</Text>
              <Text style={[styles.count, { color: muted }]}>{results.length} 個詞條</Text>
            </View>
            {results.length ? results.map((entry) => (
              <WordRow key={entry.word} entry={entry} dark={dark} saved={savedWords.includes(entry.word)} onPress={() => openWord(entry)} onSave={() => toggleSaved(entry.word)} />
            )) : (
              <View style={[styles.empty, { backgroundColor: card }]}>
                <Icon name="telescope-outline" size={34} color={palette.teal} />
                <Text style={[styles.emptyTitle, { color: ink }]}>找不到「{query}」</Text>
                <Text style={[styles.emptyCopy, { color: muted }]}>目前是示範詞庫；正式版匯入完整授權詞庫後即可搜尋更多單字。</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: ink }]}>每日一字</Text>
                <Text style={styles.datePill}>TODAY</Text>
              </View>
              <Pressable onPress={() => openWord(WORDS[0]!)} style={[styles.dailyCard, { backgroundColor: card }]}>
                <View style={styles.dailyAccent} />
                <View style={styles.dailyTop}>
                  <View>
                    <Text style={[styles.dailyWord, { color: ink }]}>serendipity</Text>
                    <Text style={styles.dailyPhonetic}>/ˌser.ənˈdɪp.ə.ti/ · noun</Text>
                  </View>
                  <Pressable onPress={(event) => { event.stopPropagation(); Speech.speak('serendipity', { language: 'en-US', rate: 0.85 }); }} style={styles.soundButton}>
                    <Icon name="volume-medium" color={palette.teal} />
                  </Pressable>
                </View>
                <Text style={[styles.dailyTranslation, { color: ink }]}>意外發現美好事物的巧合</Text>
                <Text style={[styles.dailyExample, { color: muted }]}>“Finding this quiet bookshop was pure serendipity.”</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: ink }]}>最近查過</Text>
                <Text style={[styles.link, { color: palette.teal }]}>全部</Text>
              </View>
              <View style={styles.chips}>
                {history.slice(0, 5).map((word) => (
                  <Pressable key={word} onPress={() => { const entry = getWord(word); if (entry) openWord(entry); }} style={[styles.chip, { backgroundColor: card, borderColor: dark ? '#294440' : palette.line }]}>
                    <Icon name="time-outline" size={15} color={palette.teal} />
                    <Text style={[styles.chipText, { color: ink }]}>{word}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: ink, marginBottom: 12 }]}>為你精選</Text>
              {WORDS.slice(1, 4).map((entry) => (
                <WordRow key={entry.word} entry={entry} dark={dark} saved={savedWords.includes(entry.word)} onPress={() => openWord(entry)} onSave={() => toggleSaved(entry.word)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.scrim} onPress={() => setSelected(null)} />
        {selected && (
          <View style={[styles.sheet, { backgroundColor: dark ? palette.nightCard : palette.paper }]}>
            <View style={styles.handle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <View style={styles.wordHeader}>
                <View style={styles.wordHeaderCopy}>
                  <View style={styles.titleLine}>
                    <Text style={[styles.sheetWord, { color: ink }]}>{selected.word}</Text>
                    <Text style={styles.level}>{selected.level}</Text>
                  </View>
                  <Text style={styles.sheetPhonetic}>{selected.phonetic} · {selected.partOfSpeech}</Text>
                </View>
                <Pressable onPress={() => Speech.speak(selected.word, { language: 'en-US', rate: 0.85 })} style={styles.roundButton}>
                  <Icon name="volume-medium" color={palette.teal} />
                </Pressable>
                <Pressable onPress={() => toggleSaved(selected.word)} style={styles.roundButton}>
                  <Icon name={savedWords.includes(selected.word) ? 'bookmark' : 'bookmark-outline'} color={savedWords.includes(selected.word) ? palette.amber : palette.teal} />
                </Pressable>
              </View>
              <Text style={[styles.sheetTranslation, { color: ink }]}>{selected.translation}</Text>
              <Text style={[styles.detailLabel, { color: muted }]}>英文解釋</Text>
              {selected.definitions.map((definition, index) => (
                <View key={definition.text} style={styles.definition}>
                  <Text style={styles.number}>{index + 1}</Text>
                  <View style={styles.definitionCopy}>
                    <Text style={[styles.definitionText, { color: ink }]}>{definition.text}</Text>
                    <Text style={[styles.example, { color: muted }]}>{definition.example}</Text>
                  </View>
                </View>
              ))}
              <Text style={[styles.detailLabel, { color: muted }]}>同義詞</Text>
              <View style={styles.chips}>{selected.synonyms.map((item) => <Text key={item} style={styles.synonym}>{item}</Text>)}</View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: { margin: 14, marginBottom: 8, borderRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#BAEDE6', fontSize: 10, letterSpacing: 2.2, fontWeight: '900' },
  greeting: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 4 },
  proButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 },
  proText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  searchBox: { height: 54, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 17, marginTop: 22, paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, height: '100%', color: palette.ink, fontSize: 16, fontWeight: '600' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 9 },
  heroMetaText: { color: '#D9F6F1', fontSize: 11, fontWeight: '600' },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#9DDBD1' },
  section: { paddingHorizontal: 18, marginTop: 19 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  count: { fontSize: 12 },
  datePill: { color: palette.tealDark, backgroundColor: palette.mint, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, letterSpacing: 1.2, fontWeight: '900' },
  dailyCard: { borderRadius: 22, padding: 20, overflow: 'hidden', shadowColor: '#0A332F', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  dailyAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: palette.amber },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyWord: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  dailyPhonetic: { color: palette.teal, fontSize: 12, marginTop: 3 },
  soundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  dailyTranslation: { marginTop: 16, fontSize: 16, fontWeight: '800' },
  dailyExample: { fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginTop: 8 },
  link: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 28, borderRadius: 22 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyCopy: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 6 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3,18,17,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: '#B8C7C5', marginTop: 10 },
  sheetContent: { padding: 22, paddingBottom: 38 },
  wordHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordHeaderCopy: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sheetWord: { fontSize: 31, fontWeight: '900', letterSpacing: -0.7 },
  sheetPhonetic: { color: palette.teal, marginTop: 4, fontSize: 13 },
  level: { color: palette.tealDark, backgroundColor: palette.mint, fontSize: 10, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  roundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.mintSoft, alignItems: 'center', justifyContent: 'center' },
  sheetTranslation: { fontSize: 18, fontWeight: '800', marginTop: 22, paddingBottom: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  detailLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 22, marginBottom: 11 },
  definition: { flexDirection: 'row', marginBottom: 17 },
  number: { width: 25, height: 25, textAlign: 'center', lineHeight: 25, borderRadius: 13, backgroundColor: palette.mint, color: palette.tealDark, fontSize: 11, fontWeight: '900', marginRight: 11 },
  definitionCopy: { flex: 1 },
  definitionText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  example: { fontSize: 13, fontStyle: 'italic', marginTop: 6, lineHeight: 19 },
  synonym: { backgroundColor: palette.mintSoft, color: palette.tealDark, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, fontWeight: '700' },
});
