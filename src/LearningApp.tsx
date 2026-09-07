import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon, IconName } from './components/Icons';
import { learningSample, LearningEntry } from './data/learningSample';
import { ChineseEntry, ChineseSample, dailyWord, findLearningWord, searchChineseEntries, searchLearningWords } from './domain/search';
import { getDueWords, getStudyStats, recordReview, rememberSearch, toggleSavedWord } from './domain/study';
import { useLearning, ThemePreference } from './state/useLearning';
import { useReading } from './state/useReading';
import { usePronunciation } from './state/usePronunciation';
import naturalVoices from './data/naturalVoiceManifest.json';
import { ContextLibrary, ContextReview, ReadingBackup, ReadingFeedback, ReadingLibrary } from './screens/ReadingWorkspace';
import { ReviewRating } from './types';
import chineseData from '../public/data/cedict-sample.json';

const reference = chineseData as ChineseSample;
type Tab = 'reading' | 'search' | 'saved' | 'review' | 'settings';
type Colors = { bg: string; card: string; ink: string; muted: string; line: string; soft: string };
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'reading', label: '閱讀', icon: 'book-outline' },
  { id: 'search', label: '查字', icon: 'search-outline' },
  { id: 'saved', label: '單字本', icon: 'bookmark-outline' },
  { id: 'review', label: '複習', icon: 'albums-outline' },
  { id: 'settings', label: '設定', icon: 'options-outline' },
];

function Action({ label, onPress, icon, quiet = false, disabled = false, colors }: { label: string; onPress: () => void; icon?: IconName; quiet?: boolean; disabled?: boolean; colors: Colors }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.button, { backgroundColor: quiet ? colors.soft : '#27664D', opacity: disabled ? 0.45 : 1 }]}>
    {icon && <Icon name={icon} size={18} color={quiet ? colors.ink : '#FFFFFF'} />}<Text style={[s.buttonText, { color: quiet ? colors.ink : '#FFFFFF' }]}>{label}</Text>
  </Pressable>;
}
function WordRow({ entry, saved, onOpen, onSave, colors }: { entry: LearningEntry; saved: boolean; onOpen: () => void; onSave: () => void; colors: Colors }) {
  return <View style={[s.wordRow, { backgroundColor: colors.card, borderColor: colors.line }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`查看 ${entry.word}`} onPress={onOpen} style={s.wordLink}><Text style={[s.word, { color: colors.ink }]}>{entry.word}</Text><Text style={[s.translation, { color: colors.muted }]}>{entry.translation}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? '取消收藏' : '收藏'} ${entry.word}`} onPress={onSave} style={s.iconButton}><Icon name={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? '#B87829' : colors.muted} /></Pressable>
  </View>;
}
function Empty({ title, description, colors }: { title: string; description: string; colors: Colors }) {
  return <View style={[s.empty, { backgroundColor: colors.card, borderColor: colors.line }]}><Icon name="leaf-outline" size={32} color="#60906B" /><Text style={[s.sectionTitle, { color: colors.ink }]}>{title}</Text><Text style={[s.body, { color: colors.muted }]}>{description}</Text></View>;
}

function Application() {
  const data = useLearning();
  const reader = useReading();
  const pronunciation = usePronunciation(naturalVoices.clips);
  const system = useColorScheme();
  const dark = data.theme === 'dark' || data.theme === 'system' && system === 'dark';
  const colors: Colors = dark ? { bg: '#102322', card: '#1A3230', ink: '#F0F7F3', muted: '#AAC0B8', line: '#34514B', soft: '#244B41' }
    : { bg: '#F5F7F2', card: '#FFFFFF', ink: '#183D33', muted: '#657A70', line: '#DEE7DE', soft: '#E9F0E7' };
  const [tab, setTab] = useState<Tab>('reading');
  const [reviewMode, setReviewMode] = useState<'context' | 'dictionary'>('context');
  const [mode, setMode] = useState<'learning' | 'reference'>('learning');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LearningEntry | null>(null);
  const [selectedChinese, setSelectedChinese] = useState<ChineseEntry | null>(null);
  const [segment, setSegment] = useState<'saved' | 'history'>('saved');
  const [flipped, setFlipped] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState<'sources' | 'privacy' | 'backup' | null>(null);
  const [backup, setBackup] = useState('');
  const [importing, setImporting] = useState(false);
  const [backupMode, setBackupMode] = useState<'export' | 'import'>('export');
  const stats = useMemo(() => getStudyStats(data.state, clock), [data.state, clock]);
  const today = dailyWord(new Date(clock));
  const results = useMemo(() => searchLearningWords(query), [query]);
  const chineseResults = useMemo(() => searchChineseEntries(reference.entries, query), [query]);
  const reviewCandidates = useMemo(() => data.state.savedWords.length
    ? data.state.savedWords.filter((word) => findLearningWord(word))
    : learningSample.slice(0, 10).map((entry) => entry.word), [data.state.savedWords]);
  const due = useMemo(() => getDueWords(data.state, reviewCandidates, clock), [data.state, reviewCandidates, clock]);
  const reviewEntry = due[0] ? findLearningWord(due[0]) : undefined;
  const textColor = { color: colors.ink }, mutedColor = { color: colors.muted };
  const cardColor = { backgroundColor: colors.card, borderColor: colors.line };
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { setFlipped(false); }, [reviewEntry?.id, tab]);

  const speak = (text: string, language: string = data.voice) => {
    pronunciation.speak(text, language);
  };
  const openWord = (entry: LearningEntry) => { data.change((state) => rememberSearch(state, entry.word)); setSelected(entry); };
  const save = (entry: LearningEntry) => data.change((state) => toggleSavedWord(state, entry.word));
  const openLink = (url: string) => { void Linking.openURL(url).catch(() => setMessage('連結暫時無法開啟，請稍後再試。')); };
  const rate = (rating: ReviewRating) => {
    if (!reviewEntry || !flipped) return;
    const now = Date.now(); data.change((state) => recordReview(state, reviewEntry.word, rating, now)); setClock(now); setFlipped(false);
  };
  const close = () => { if (!importing) { setSelected(null); setSelectedChinese(null); setInfo(null); setMessage(''); } };
  const button = (label: string, onPress: () => void, quiet = false, icon?: IconName, disabled = false) => <Action label={label} onPress={onPress} quiet={quiet} icon={icon} colors={colors} disabled={disabled} />;
  const row = (entry: LearningEntry) => <WordRow key={entry.id} entry={entry} saved={data.state.savedWords.includes(entry.word)} onOpen={() => openWord(entry)} onSave={() => save(entry)} colors={colors} />;
  const empty = (title: string, description: string) => <Empty title={title} description={description} colors={colors} />;
  const exportData = async (recovery = false) => {
    setMessage('');
    try {
      const json = recovery ? await data.getRecoveryBackup() : JSON.stringify(data.state, null, 2);
      setBackup(json); setBackupMode('export'); setInfo('backup');
      if (Platform.OS !== 'web') await Share.share({ title: 'LexiHarbor 學習備份', message: json });
      else {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = recovery ? 'lexiharbor-recovery.json' : 'lexiharbor-backup.json'; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : '無法匯出備份，請稍後再試。'); }
  };

  return <ReadingFeedback.Provider value={{ data: reader, speechStatus: pronunciation.status, stopSpeech: pronunciation.stop }}><SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <View style={[s.frame, { backgroundColor: colors.bg }]}>
      <View style={[s.brandBar, { borderColor: colors.line }]}><View style={s.brand}><Icon name="book-outline" color={colors.ink} size={22} /><Text style={[s.brandText, textColor]}>LexiHarbor</Text></View><Text style={[s.badge, { backgroundColor: colors.soft, color: colors.ink }]}>閱讀試用版</Text></View>
      {!!pronunciation.status && <View style={[s.notice, { backgroundColor: colors.soft }]}><Text accessibilityLiveRegion="polite" style={[s.noticeText, textColor]}>{pronunciation.status}</Text>{button('停止播放', pronunciation.stop, true)}</View>}
      {!!reader.notice && <View style={[s.notice, { backgroundColor: colors.soft }]}><Text accessibilityRole="alert" style={[s.noticeText, textColor]}>{reader.notice}</Text>{reader.saveStatus === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel="重試閱讀資料儲存" onPress={() => void reader.retrySave()}><Text style={[s.link, textColor]}>重試</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="關閉閱讀提示" onPress={reader.dismissNotice}><Icon name="close" size={20} color={colors.ink} /></Pressable>}</View>}
      {(data.notice || message) && <View style={[s.notice, { backgroundColor: colors.soft }]}><Text style={[s.noticeText, textColor]}>{data.notice || message}</Text>
        {data.notice.includes('尚未存好') || data.notice.includes('仍無法儲存') || !data.ready ? <Pressable accessibilityRole="button" onPress={() => void data.retrySave()}><Text style={[s.link, textColor]}>{data.ready ? '重新儲存' : '重試'}</Text></Pressable> : <Pressable accessibilityLabel="關閉提示" onPress={() => { data.dismissNotice(); setMessage(''); }}><Icon name="close" size={20} color={colors.ink} /></Pressable>}
      </View>}
      {!data.ready ? <View style={s.loading}><ActivityIndicator color="#27664D" /><Text style={mutedColor}>正在讀取學習紀錄…</Text></View> : <ScrollView style={s.main} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {tab === 'reading' && <><ReadingLibrary data={reader} colors={colors} speak={speak} onReview={() => { setReviewMode('context'); setTab('review'); }} /><View style={[s.about, cardColor]}><Text style={[s.sectionTitle, textColor]}>讓英文聽起來更自然</Text><Text style={[s.body, mutedColor]}>精選短文與例句已加入美式 AI 合成語音。這是模型生成，不是真人錄音，仍待人工校聽。</Text>{button('試聽自然 AI 發音', () => speak('Hello, welcome to LexiHarbor.', 'en-US'), false, 'volume-medium-outline')}<Text style={[s.caption, mutedColor]}>自訂文章、未覆蓋的單字與英式發音仍使用裝置語音；播放時會清楚標示。</Text></View></>}
        {tab === 'search' && <>
          <Text style={[s.eyebrow, mutedColor]}>一個字，慢慢學會。</Text><Text style={[s.title, textColor]}>今天想查什麼？</Text>
          <View style={[s.search, cardColor]}><Icon name="search-outline" color={colors.muted} /><TextInput accessibilityLabel="搜尋英文或中文" placeholder="例如 apple、went、好奇" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} style={[s.searchInput, textColor]} />{!!query && <Pressable accessibilityLabel="清除搜尋" onPress={() => setQuery('')} style={s.iconButton}><Icon name="close-circle" size={20} color={colors.muted} /></Pressable>}</View>
          <View style={s.segment}>{button('英文學習', () => setMode('learning'), mode !== 'learning')}{button('漢英參考', () => setMode('reference'), mode !== 'reference')}</View>
          <Text style={[s.caption, mutedColor]}>{mode === 'learning' ? `${learningSample.length} 個試用詞條 · 英文、詞形與中文查詢` : `${reference.entries.length} 筆漢英小樣 · 輸入英文可反查相關中文詞`}</Text>
          {mode === 'learning' ? query.trim() ? <><Text style={[s.sectionTitle, textColor]}>搜尋結果{results.length ? ` · ${results.length}` : ''}</Text>{results.length ? results.map(row) : empty('這個詞還沒收錄', '目前是小量試用詞庫。可以試試 apple、bank、run 或 take off。')}</> : <>
            {today && <View style={s.daily}><View style={s.between}><Text style={s.dailyLabel}>每日一字</Text><Text style={s.dailyLabel}>{new Date(clock).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}</Text></View><Text style={s.dailyWord}>{today.word}</Text><Text style={s.dailyMeaning}>{today.translation}</Text><View style={s.dailyActions}>{button('看看意思', () => openWord(today))}<Pressable accessibilityRole="button" accessibilityLabel={`播放 ${today.word}`} onPress={() => speak(today.word)} style={s.iconButton}><Icon name="volume-medium-outline" color="#E7F3DD" /></Pressable></View></View>}
            <View style={s.between}><Text style={[s.sectionTitle, textColor]}>從這些字開始</Text><Text style={[s.caption, mutedColor]}>查到 → 收藏 → 複習</Text></View>{learningSample.slice(0, 6).map(row)}
          </> : <>
            {/[a-z]/i.test(query) && <Text style={[s.caption, mutedColor]}>英文反查結果是相關中文詞，不是逐義項的英漢翻譯。</Text>}
            {chineseResults.length ? chineseResults.map((entry) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`查看 ${entry.traditional}`} onPress={() => setSelectedChinese(entry)} style={[s.referenceRow, cardColor]}><Text style={[s.word, textColor]}>{entry.traditional} <Text style={[s.caption, mutedColor]}>{entry.pinyin}</Text></Text><Text numberOfLines={2} style={[s.body, mutedColor]}>{entry.definitions.join('；')}</Text></Pressable>) : empty('小樣中找不到這個詞', '可試試「蘋果」「銀行」或 apple。詞形查詢請使用英文學習頁。')}
            <Pressable accessibilityRole="button" onPress={() => setInfo('sources')}><Text style={[s.sourceLink, mutedColor]}>資料：CC-CEDICT · CC BY-SA 4.0 · 查看來源</Text></Pressable>
          </>}
        </>}
        {tab === 'saved' && <>
          <Text style={[s.eyebrow, mutedColor]}>留下想記住的字</Text><Text style={[s.title, textColor]}>我的單字本</Text>
          <ContextLibrary data={reader} colors={colors} speak={speak} onReview={() => { setReviewMode('context'); setTab('review'); }} />
          <Text style={[s.sectionTitle, textColor]}>詞庫收藏與查詢紀錄</Text><View style={s.segment}>{button(`收藏 ${data.state.savedWords.length}`, () => setSegment('saved'), segment !== 'saved')}{button('最近查過', () => setSegment('history'), segment !== 'history')}</View>
          {(segment === 'saved' ? data.state.savedWords : data.state.history).length ? <>{(segment === 'saved' ? data.state.savedWords : data.state.history).map((word) => { const entry = findLearningWord(word); return entry ? row(entry) : <View key={word} style={[s.referenceRow, cardColor]}><Text style={[s.word, textColor]}>{word}</Text><Text style={mutedColor}>此字尚未收錄於新版小樣，原紀錄仍保留。</Text></View>; })}{segment === 'saved' && button('複習收藏的單字', () => { setReviewMode('dictionary'); setTab('review'); }, false, 'albums-outline')}</> : empty(segment === 'saved' ? '先收藏第一個單字' : '還沒有查詢紀錄', '在查字頁開啟單字，按下書籤就能加入單字本。')}
        </>}
        {tab === 'review' && <>
          <View style={s.segment}>{button('原句字卡', () => setReviewMode('context'), reviewMode !== 'context')}{button('詞庫單字', () => setReviewMode('dictionary'), reviewMode !== 'dictionary')}</View>
          {reviewMode === 'context' ? <ContextReview data={reader} colors={colors} speak={speak} onRead={() => setTab('reading')} /> : <>
          <Text style={[s.eyebrow, mutedColor]}>{data.state.savedWords.length ? '複習你的收藏' : '先試試 10 個入門字'}</Text><Text style={[s.title, textColor]}>每天記得一點</Text>
          <View style={s.stats}>{[{ value: stats.todayReviewCount, label: '今日複習' }, { value: stats.streak, label: '連續學習天數' }, { value: due.length, label: '待複習' }].map((stat) => <View key={stat.label} style={[s.stat, cardColor]}><Text style={[s.statNumber, textColor]}>{stat.value}</Text><Text style={[s.caption, mutedColor]}>{stat.label}</Text></View>)}</View>
          {reviewEntry ? <><Pressable accessibilityRole="button" accessibilityLabel={flipped ? '收起答案' : '查看答案'} onPress={() => setFlipped((value) => !value)} style={[s.flashcard, cardColor]}><Text style={[s.caption, mutedColor]}>{flipped ? '核對你的答案' : '想一想，這個字是什麼意思？'}</Text><Text style={[s.flashWord, textColor]}>{reviewEntry.word}</Text>{flipped ? <><Text style={[s.flashMeaning, textColor]}>{reviewEntry.translation}</Text><Text style={[s.body, mutedColor]}>{reviewEntry.definitions[0]?.example}</Text></> : <Text style={[s.link, mutedColor]}>輕觸查看解釋</Text>}</Pressable>
            {button('聽發音', () => speak(reviewEntry.word), true, 'volume-medium-outline')}
            {flipped ? <View style={s.ratings}>{button('再看看 · 1 分鐘', () => rate('again'), true)}{button('記得 · 3 天', () => rate('good'))}{button('熟悉 · 7 天', () => rate('easy'), true)}</View> : <Text style={[s.centerCaption, mutedColor]}>先在心裡回答，再翻面評分。</Text>}
          </> : <>{empty('目前沒有到期的單字', '你的下次複習時間已保存。選「再看看」的字會在 1 分鐘後回來，也可以繼續收藏新字。')}{button('回去查字', () => setTab('search'))}</>}
          </>}
        </>}
        {tab === 'settings' && <>
          <Text style={[s.eyebrow, mutedColor]}>照自己的節奏</Text><Text style={[s.title, textColor]}>設定</Text><Text style={[s.sectionTitle, textColor]}>顯示模式</Text>
          <View style={s.segment}>{([{ id: 'system', label: '跟隨系統' }, { id: 'light', label: '淺色' }, { id: 'dark', label: '深色' }] as { id: ThemePreference; label: string }[]).map((item) => <Action key={item.id} label={item.label} quiet={data.theme !== item.id} colors={colors} onPress={() => data.changeTheme(item.id)} />)}</View>
          <Text style={[s.sectionTitle, textColor]}>英文發音</Text><View style={s.segment}>{button('美式', () => data.changeVoice('en-US'), data.voice !== 'en-US')}{button('英式', () => data.changeVoice('en-GB'), data.voice !== 'en-GB')}{button('試聽', () => speak('Hello, welcome to LexiHarbor.'), true)}</View><Text style={[s.caption, mutedColor]}>網頁版美式精選文章與例句：Kokoro AI 合成語音，非真人錄音。其他文字、英式及原生 App 目前使用裝置語音，播放時會標示來源。AI 音檔需連線載入，正式發音編校仍待完成。</Text>
          <ReadingBackup data={reader} colors={colors} />
          <Text style={[s.sectionTitle, textColor]}>詞庫收藏備份（不含閱讀）</Text><View style={s.stack}>{button('匯出詞庫收藏', () => void exportData(), true, 'download-outline')}{button('匯入詞庫收藏', () => { setBackup(''); setBackupMode('import'); setInfo('backup'); }, true, 'push-outline')}{button('匯出自動保留的舊資料', () => void exportData(true), true, 'time-outline')}</View>
          <Text style={[s.sectionTitle, textColor]}>關於這個版本</Text><View style={[s.about, cardColor]}><Text style={[s.body, textColor]}>閱讀：貼上自己的文章、保存原句字卡與安排複習。{'\n'}英文學習：{learningSample.length} 個自行編寫的試用詞條。{'\n'}漢英參考：{reference.entries.length} 筆 CC-CEDICT 小樣。</Text><Text style={[s.body, mutedColor]}>內容仍在測試與編校中。本版不收費，不需要建立帳號。學習紀錄保存在這台裝置，換裝置前請分別匯出閱讀與詞庫收藏備份。</Text>{button('詞庫來源與授權', () => setInfo('sources'), true)}{button('隱私說明', () => setInfo('privacy'), true)}</View><Text style={[s.centerCaption, mutedColor]}>LexiHarbor · 0.3 閱讀試用版</Text>
        </>}
      </ScrollView>}
      <View style={[s.nav, { backgroundColor: colors.card, borderColor: colors.line }]}>{tabs.map((item) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} accessibilityLabel={item.label} onPress={() => { setTab(item.id); setMessage(''); }} style={[s.navItem, tab === item.id && { backgroundColor: colors.soft }]}><Icon name={item.icon} color={tab === item.id ? colors.ink : colors.muted} /><Text style={[s.navLabel, { color: tab === item.id ? colors.ink : colors.muted }]}>{item.label}</Text></Pressable>)}</View>
    </View>
    <Modal visible={Boolean(selected || selectedChinese || info)} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}><View style={s.frame}><View style={s.modalHeader}><Text style={[s.caption, mutedColor]}>{selected ? '英文學習詞條' : selectedChinese ? 'CC-CEDICT 漢英詞條' : info === 'sources' ? '詞庫來源與授權' : info === 'backup' ? '學習資料備份' : '隱私說明'}</Text><Pressable accessibilityRole="button" accessibilityLabel="關閉詳情" onPress={close} style={s.iconButton}><Icon name="close" color={colors.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {!!pronunciation.status && <View style={[s.notice, { backgroundColor: colors.soft }]}><Text accessibilityLiveRegion="polite" style={[s.noticeText, textColor]}>{pronunciation.status}</Text>{button('停止播放', pronunciation.stop, true)}</View>}
          {selected && <><Text style={[s.detailWord, textColor]}>{selected.word}</Text><Text style={[s.caption, mutedColor]}>{selected.partOfSpeech}{selected.phonetic ? ` · ${selected.phonetic}` : ''}</Text><Text style={[s.detailMeaning, textColor]}>{selected.translation}</Text><View style={s.segment}>{button('聽發音', () => speak(selected.word), false, 'volume-medium-outline')}{button(data.state.savedWords.includes(selected.word) ? '已收藏' : '加入單字本', () => save(selected), true, 'bookmark-outline')}</View>
            {selected.definitions.map((definition, index) => <View key={index} style={[s.definition, cardColor]}><Text style={[s.definitionNumber, mutedColor]}>義項 {index + 1}</Text><Text style={[s.definitionText, textColor]}>{definition.text}</Text><Text style={[s.example, textColor]}>{definition.example}</Text>{definition.translation && <Text style={[s.body, mutedColor]}>{definition.translation}</Text>}<Pressable accessibilityRole="button" accessibilityLabel={`播放例句 ${index + 1}`} onPress={() => speak(definition.example)}><Text style={[s.link, mutedColor]}>聽例句</Text></Pressable></View>)}
            {!!selected.forms.length && <><Text style={[s.sectionTitle, textColor]}>也可以這樣查</Text><Text style={[s.body, mutedColor]}>{selected.forms.join(' · ')}</Text></>}{!!selected.synonyms.length && <><Text style={[s.sectionTitle, textColor]}>相關詞</Text><Text style={[s.body, mutedColor]}>{selected.synonyms.join(' · ')}</Text></>}<Text style={[s.sourceLink, mutedColor]}>本專案獨立編寫的學習小樣 · 正式編校待完成</Text>
          </>}
          {selectedChinese && <><Text style={[s.detailWord, textColor]}>{selectedChinese.traditional}</Text><Text style={[s.body, mutedColor]}>{selectedChinese.pinyin} · 簡體：{selectedChinese.simplified}</Text>{button('中文發音', () => speak(selectedChinese.traditional, 'zh-TW'), false, 'volume-medium-outline')}<Text style={[s.sectionTitle, textColor]}>英文解釋</Text>{selectedChinese.definitions.map((definition, index) => <View key={index} style={[s.definition, cardColor]}><Text style={[s.body, textColor]}>{index + 1}. {definition}</Text></View>)}<Text style={[s.body, mutedColor]}>這是以中文詞為中心的漢英參考資料，不提供英文單字卡。</Text>{button('查看資料授權', () => { setSelectedChinese(null); setInfo('sources'); }, true)}</>}
          {info === 'sources' && <><Text style={[s.title, textColor]}>每份內容都有出處</Text><Text style={[s.sectionTitle, textColor]}>英文學習小樣</Text><Text style={[s.body, mutedColor]}>本專案以 AI 輔助獨立編寫英文解釋、繁中意思與例句，經模型檢查；尚待人類編輯正式審閱。目前收錄 {learningSample.length} 個詞條，不代表完整字典。</Text><Text style={[s.sectionTitle, textColor]}>CC-CEDICT 漢英小樣</Text><Text style={[s.body, mutedColor]}>來源：CC-CEDICT，由 MDBG 維護、社群貢獻，延續 Paul Denisowski 於 1997 年發起的 CEDICT。{'\n\n'}授權：Creative Commons 姓名標示－相同方式分享 4.0 國際（CC BY-SA 4.0）。{'\n\n'}本版從已發布資料篩選小樣，轉為 JSON 並加入識別碼；這份衍生資料同樣依 CC BY-SA 4.0 分享。資料按原樣提供，不能保證完整或無誤。</Text><View style={s.stack}>{button('官方資料與出處', () => openLink('https://www.mdbg.net/chinese/dictionary?page=cedict'), true)}{button('完整授權條款', () => openLink('https://creativecommons.org/licenses/by-sa/4.0/legalcode.zh-Hant'), true)}{button('下載本版漢英小樣與來源紀錄', () => openLink('https://github.com/taiwanape/lexiharbor/tree/main/public/data'), true)}</View></>}
          {info === 'sources' && <><Text style={[s.sectionTitle, textColor]}>原創短文與自然 AI 語音</Text><Text style={[s.body, mutedColor]}>練習短文由本專案獨立編寫。美式精選音檔使用 Kokoro-82M 模型在開發端預先生成，非真人錄音；模型與生成程式有 Apache-2.0 授權，相關工具另有各自條款。音檔已做訊號檢查，尚未完成人工發音校聽。</Text>{button('語音來源、版本與完整授權', () => openLink('https://github.com/taiwanape/lexiharbor/blob/main/public/audio/NOTICE.md'), true)}</>}
          {info === 'privacy' && <><Text style={[s.title, textColor]}>你的學習紀錄</Text><Text style={[s.body, textColor]}>文章、原句字卡、收藏、查詢歷史、複習和顯示偏好保存在目前裝置的本機儲存。本試用版沒有帳號、廣告追蹤或收費功能，不主動上傳文章與學習紀錄。{'\n\n'}清除瀏覽器資料或移除 App 可能使本機紀錄消失，請定期分別匯出閱讀與詞庫收藏備份。匯出檔案由你自行保管，可能包含私人文章。{'\n\n'}精選 AI 音檔已預先生成；播放時向本站載入音檔，不會把文章送到 AI 生成服務。未覆蓋的文字使用裝置語音，是否連網與如何處理文字依該引擎而定。不要用不信任的引擎朗讀敏感內容。{'\n\n'}GitHub Pages 等網站主機可能處理 IP 與音檔請求等連線紀錄。「到 Cambridge 查證」會將選取的詞句帶入外部網址，適用對方政策。{'\n\n'}正式上架前仍需補齊開發者聯絡資訊與正式隱私政策。</Text></>}
          {info === 'backup' && <><Text style={[s.title, textColor]}>{backupMode === 'import' ? '貼上你的備份' : '保存這份學習紀錄'}</Text><Text style={[s.body, mutedColor]}>{backupMode === 'import' ? '匯入會取代目前的收藏與複習紀錄；取代前會自動保留本機備份。' : '已準備備份檔。你也可以選取下方文字，複製保存。'}</Text><TextInput accessibilityLabel="學習備份內容" multiline editable={!importing} value={backup} onChangeText={setBackup} style={[s.backupInput, cardColor, textColor]} autoCapitalize="none" autoCorrect={false} />{backupMode === 'import' && button(importing ? '正在匯入…' : '匯入並取代目前紀錄', () => { setMessage(''); setImporting(true); void data.importData(backup).then(() => setInfo(null)).catch((error: Error) => setMessage(error.message)).finally(() => setImporting(false)); }, false, undefined, importing || !backup.trim())}</>}
          {!!message && <Text accessibilityRole="alert" style={[s.error, { color: dark ? '#FFD4A0' : '#96551A' }]}>{message}</Text>}
        </ScrollView>
      </View></SafeAreaView>
    </Modal>
  </SafeAreaView></ReadingFeedback.Provider>;
}

export default function App() { return <SafeAreaProvider><Application /></SafeAreaProvider>; }

const s = StyleSheet.create({
  safe: { flex: 1 }, frame: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  brandBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandText: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 }, badge: { fontSize: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 },
  main: { flex: 1 }, content: { padding: 22, paddingBottom: 36, gap: 12 }, eyebrow: { fontSize: 12, letterSpacing: 1.3, marginTop: 8 }, title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginBottom: 10 },
  search: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, borderWidth: 1, borderRadius: 16, minHeight: 58 }, searchInput: { flex: 1, fontSize: 16, minHeight: 54, minWidth: 0 }, segment: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12 }, buttonText: { fontSize: 13, fontWeight: '700', flexShrink: 1 }, caption: { fontSize: 11, lineHeight: 17 }, centerCaption: { textAlign: 'center', fontSize: 12, lineHeight: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 14, marginBottom: 2 }, body: { fontSize: 14, lineHeight: 23 }, between: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  wordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, overflow: 'hidden' }, wordLink: { flex: 1, padding: 16 }, word: { fontSize: 20, fontWeight: '700', flexShrink: 1 }, translation: { fontSize: 13, marginTop: 5, lineHeight: 20 }, iconButton: { padding: 12, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  daily: { padding: 23, borderRadius: 21, marginTop: 8, gap: 12, backgroundColor: '#214F3F' }, dailyLabel: { color: '#B8D7B7', fontSize: 11 }, dailyWord: { color: '#F5F8E9', fontWeight: '800', fontSize: 32, marginTop: 9 }, dailyMeaning: { color: '#DEEDD6', fontSize: 16, lineHeight: 25 }, dailyActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  referenceRow: { padding: 17, gap: 7, borderWidth: 1, borderRadius: 14 }, sourceLink: { fontSize: 11, lineHeight: 19, marginTop: 16, marginBottom: 4 }, empty: { padding: 25, gap: 12, borderWidth: 1, borderRadius: 18, alignItems: 'flex-start', marginVertical: 10 },
  stats: { flexDirection: 'row', gap: 9 }, stat: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, borderRadius: 14, alignItems: 'center', gap: 5 }, statNumber: { fontSize: 25, fontWeight: '800' },
  flashcard: { minHeight: 290, padding: 27, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 7 }, flashWord: { fontSize: 36, fontWeight: '800', textAlign: 'center' }, flashMeaning: { fontSize: 21, lineHeight: 30, textAlign: 'center' }, ratings: { gap: 9, marginTop: 6 },
  nav: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 6 }, navItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, gap: 4 }, navLabel: { fontSize: 11, fontWeight: '600' },
  notice: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 19 }, link: { fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  about: { padding: 20, gap: 15, borderRadius: 18, borderWidth: 1 }, stack: { gap: 9 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  detailWord: { fontSize: 38, fontWeight: '800', letterSpacing: -0.8 }, detailMeaning: { fontSize: 23, fontWeight: '700', lineHeight: 34, marginVertical: 8 }, definition: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 12 }, definitionNumber: { fontSize: 11 }, definitionText: { fontSize: 16, lineHeight: 25, fontWeight: '600' }, example: { fontSize: 15, lineHeight: 25, fontStyle: 'italic' },
  backupInput: { borderWidth: 1, borderRadius: 12, minHeight: 240, padding: 15, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlignVertical: 'top' }, error: { fontSize: 13, lineHeight: 21, marginTop: 10 },
});
