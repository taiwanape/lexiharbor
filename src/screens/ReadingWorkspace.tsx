import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton as Button } from '../components/ActionButton';
import { Icon, IconName } from '../components/Icons';
import { readingSamples } from '../data/readingSamples';
import { searchLearningWords } from '../domain/search';
import { addContextCard, createArticle, deleteArticle, editContextCard, exportReadingState, extractContext, getDueCards, getReadingStats, markArticleRead, removeContextCard, reviewContextCard, tokenizeReading, READING_LIMITS, type ContextCard } from '../domain/reading';
import type { useReading } from '../state/useReading';
import type { ReviewRating } from '../types';
import type { AppColors } from '../design/theme';

export type ReadingColors = AppColors;
export type ReadingArtwork = { hero: ImageSourcePropType; work: ImageSourcePropType; weekend: ImageSourcePropType; travel: ImageSourcePropType };
type ReaderData = ReturnType<typeof useReading>;
type Props = { data: ReaderData; colors: ReadingColors; speak: (text: string) => void; onReview: () => void; onVoicePreview?: () => void; artwork?: ReadingArtwork };
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作未完成，請再試一次。';
export const ReadingFeedback = createContext<{ data: ReaderData; speechStatus?: string; stopSpeech?: () => void } | null>(null);

function Message({ text, colors }: { text: string; colors: ReadingColors }) { return text ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.ink, backgroundColor: colors.soft, fontFamily: colors.font, borderColor: colors.line }]}>{text}</Text> : null; }
function Sheet({ title, open, close, children, colors, scrollRef }: { title: string; open: boolean; close: () => void; children: React.ReactNode; colors: ReadingColors; scrollRef?: React.RefObject<ScrollView | null> }) {
  const feedback = useContext(ReadingFeedback);
  const { width, height } = useWindowDimensions();
  const desktop = width >= 1080;
  return <Modal visible={open} transparent={desktop} animationType={desktop ? 'fade' : 'slide'} onRequestClose={close}><SafeAreaView style={[styles.sheetBackdrop, { backgroundColor: desktop ? 'rgba(12, 19, 35, 0.58)' : colors.bg }, desktop && { padding: 32 }]}><View style={[styles.frame, { backgroundColor: colors.bg }, desktop && { maxHeight: height - 64, borderRadius: 24, borderWidth: 1, borderColor: colors.line }]}><View style={[styles.sheetHeader, { borderColor: colors.line, paddingHorizontal: desktop ? 32 : 20 }]}><View style={styles.inlineRow}><View style={[styles.headerMark, { backgroundColor: colors.accent }]} /><Text style={[styles.heading, { color: colors.ink, fontFamily: colors.font }]}>{title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`關閉${title}`} onPress={close} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.soft, transform: [{ translateY: pressed ? 1 : 0 }] }]}><Icon name="close" color={colors.ink} /></Pressable></View>
    {feedback && feedback.data.saveStatus !== 'saved' && <View style={{ paddingHorizontal: desktop ? 32 : 20, paddingTop: 12, gap: 8 }}><Message text={feedback.data.notice || (feedback.data.saveStatus === 'saving' ? '正在儲存到這台裝置，請稍候。' : '正在讀取閱讀資料…')} colors={colors} />{feedback.data.saveStatus === 'error' && <Button label="重試儲存閱讀變更" colors={colors} onPress={() => void feedback.data.retrySave()} />}</View>}
    {!!feedback?.speechStatus && <View style={[styles.speechBar, { paddingHorizontal: desktop ? 32 : 20, borderColor: colors.line }]}><Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.muted, fontFamily: colors.font, flex: 1 }]}>{feedback.speechStatus}</Text>{feedback.stopSpeech && <Button label="停止播放" quiet colors={colors} onPress={feedback.stopSpeech} />}</View>}
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.sheetContent, { paddingHorizontal: desktop ? 36 : 20 }]}>{children}</ScrollView></View></SafeAreaView></Modal>;
}

function SampleCard({ sample, index, artwork, desktop, colors, onPress }: { sample: typeof readingSamples[number]; index: number; artwork?: ImageSourcePropType; desktop: boolean; colors: ReadingColors; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`試讀 ${sample.title}`} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => [styles.sampleCard, { backgroundColor: colors.card, borderColor: hovered || pressed ? colors.blue : colors.line, width: desktop ? '31.8%' : '100%', flexDirection: desktop ? 'column' : 'row', padding: desktop ? 0 : 12, opacity: 1, transform: [{ translateY: desktop && hovered ? -3 : 0 }] }]}>
    {artwork && <View style={{ backgroundColor: '#f9ebaf', width: desktop ? '100%' : 96, height: desktop ? 180 : 106, borderRadius: desktop ? 0 : 10, borderBottomWidth: desktop ? 1.5 : 0, borderColor: colors.line, padding: desktop ? 12 : 5, flexShrink: 0 }}><Image source={artwork} accessible={false} accessibilityIgnoresInvertColors resizeMode="contain" style={{ width: '100%', height: '100%' }} /></View>}
    <View style={[styles.sampleCopy, { padding: desktop ? 18 : 0, paddingLeft: desktop ? 18 : 14 }]}>
      <View style={styles.labelRow}><Text style={[styles.meta, { color: colors.muted, fontFamily: colors.font }]}>{sample.tag} · 約 {sample.minutes} 分鐘</Text>{desktop && <Text style={[styles.meta, { color: colors.muted, fontFamily: colors.font }]}>0{index + 1}</Text>}</View>
      <Text style={[styles.heading, { color: colors.ink, fontFamily: colors.font, fontSize: desktop ? 18 : 16, lineHeight: desktop ? 27 : 24 }]}>{sample.title}</Text>
      <View style={[styles.inlineRow, { marginTop: 'auto' }]}><Text style={[styles.fieldLabel, { marginTop: 0, color: colors.blue, fontFamily: colors.font }]}>開始閱讀</Text><Icon name="arrow-forward-outline" size={16} color={colors.blue} /></View>
    </View>
  </Pressable>;
}

function CardPreview({ card, colors, desktop, open }: { card: ContextCard; colors: ReadingColors; desktop: boolean; open: () => void }) {
  const [hovered, setHovered] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`開啟原句字卡 ${card.text}`} onPress={open} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={({ pressed }) => [styles.contextCard, desktop ? styles.twoColumn : styles.fullWidth, { backgroundColor: colors.card, borderColor: hovered || pressed ? colors.blue : colors.line, opacity: 1 }]}>
    <View style={styles.labelRow}><Text style={[styles.lookupWord, { color: colors.ink, flex: 1, fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : colors.font }]}>{card.text}</Text><View style={[styles.articleIcon, { backgroundColor: colors.accentSoft }]}><Icon name="bookmark-outline" color={colors.ink} size={18} /></View></View>
    <Text style={[styles.body, { color: colors.ink, fontFamily: colors.font }]}>{card.meaning || '尚未填寫意思'}</Text>
    <View style={[styles.quoteBlock, { borderColor: colors.line }]}><Text numberOfLines={2} style={[styles.quote, { color: colors.muted }]}>{card.context}</Text></View>
    <View style={[styles.labelRow, { marginTop: 'auto' }]}><Text numberOfLines={1} style={[styles.meta, { color: colors.muted, fontFamily: colors.font, flex: 1 }]}>來自 {card.sourceTitle}</Text><Icon name="arrow-forward-outline" size={18} color={colors.blue} /></View>
  </Pressable>;
}

export function ReadingLibrary({ data, colors, speak, onReview, onVoicePreview, artwork }: Props) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1080;
  const heroWide = width >= 760;
  const articleScroll = useRef<ScrollView>(null);
  const [lookupY, setLookupY] = useState(0);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [meaning, setMeaning] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const article = data.state.articles.find((item) => item.id === articleId);
  const selectedText = article && selection ? article.body.slice(selection.start, selection.end) : '';
  const selectedContext = article && selection ? extractContext(article.body, selection.start, selection.end) : '';
  const tokens = useMemo(() => tokenizeReading(article?.body ?? ''), [article?.body]);
  const match = useMemo(() => searchLearningWords(selectedText).find((entry) => entry.word === selectedText.toLowerCase() || entry.forms.includes(selectedText.toLowerCase())), [selectedText]);
  const articleCards = data.state.cards.filter((card) => card.articleId === articleId);
  const existingCard = articleCards.find((card) => card.selectionStart === selection?.start && card.selectionEnd === selection?.end);
  useEffect(() => { setMeaning(existingCard?.meaning ?? ''); setNote(existingCard?.note ?? ''); setMessage(''); }, [selection?.start, selection?.end, articleId]);
  useEffect(() => { if (selection && !rangeMode && lookupY > 0) articleScroll.current?.scrollTo({ y: Math.max(0, lookupY - 16), animated: true }); }, [selection?.start, selection?.end, rangeMode, lookupY]);
  const attempt = (fn: () => void) => { try { fn(); } catch (error) { setMessage(errorText(error)); } };
  const open = (id: string) => attempt(() => { data.change((state) => markArticleRead(state, id)); setArticleId(id); setSelection(null); setRangeStart(null); setRangeMode(false); setMessage(''); });
  const create = () => attempt(() => { const id = uid(); data.change((state) => createArticle(state, { id, title, body })); setCreating(false); setBody(''); setTitle(''); open(id); });
  const addSample = (sample: typeof readingSamples[number]) => attempt(() => {
    const existing = data.state.articles.find((item) => item.title === sample.title && item.body === sample.body);
    // Each device needs its own creation identity so independently added samples
    // can be merged without colliding on different creation timestamps.
    const id = existing?.id ?? `sample-${sample.id}-${uid()}`;
    if (!existing) data.change((state) => createArticle(state, { id, title: sample.title, body: sample.body }));
    open(id);
  });
  const pick = (start: number, end: number) => {
    if (end - start > READING_LIMITS.selectedText) { setMessage('一次最多選取 200 字元，請選較短的詞句。'); return; }
    if (rangeMode) {
      if (rangeStart === null) { setRangeStart(start); setSelection({ start, end }); return; }
      const firstEnd = tokens.find((token) => token.start === rangeStart)?.end ?? end;
      if (Math.max(end, firstEnd) - Math.min(start, rangeStart) > READING_LIMITS.selectedText) { setMessage('片語最多 200 字元，請點選較近的最後一個字。'); return; }
      setSelection({ start: Math.min(start, rangeStart), end: Math.max(end, firstEnd) }); setRangeStart(null); setRangeMode(false);
    } else setSelection({ start, end });
  };
  const saveCard = () => attempt(() => {
    if (!article || !selection) return;
    if (!meaning.trim()) { setMessage('請先填寫你在這句話裡要記住的意思。'); return; }
    if (existingCard) {
      data.change((state) => editContextCard(state, existingCard.id, { meaning: meaning.trim(), note }));
      setMessage('已更新這張原句字卡，儲存狀態會顯示在上方。');
    } else {
      data.change((state) => addContextCard(state, { id: uid(), articleId: article.id, start: selection.start, end: selection.end, meaning: meaning.trim(), note }));
      setMessage('已加入原句字卡，可到「單字本」查看；儲存狀態會顯示在上方。');
    }
  });
  const removeArticle = () => attempt(() => { if (!removeId) return; data.change((state) => deleteArticle(state, removeId)); setRemoveId(null); setMessage('文章已移除，已收藏的原句字卡仍保留。'); });
  const c = { color: colors.ink, fontFamily: colors.font }, muted = { color: colors.muted, fontFamily: colors.font }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  const startReading = () => { setCreating(true); setMessage(''); };
  const sampleArtwork = [artwork?.work, artwork?.weekend, artwork?.travel];
  const dueCount = getDueCards(data.state).length;

  return <>
    <View style={[styles.hero, surface, { backgroundColor: colors.accentSoft, padding: desktop ? 32 : heroWide ? 22 : 18, gap: heroWide ? 24 : 14, flexDirection: heroWide ? 'row' : 'column' }]}>
      <View style={[styles.heroCopy, { flex: heroWide ? 1 : undefined, gap: heroWide ? 18 : 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
            {heroWide && <View style={styles.inlineRow}><View style={[styles.eyebrowDot, { backgroundColor: colors.blue }]} /><Text style={[styles.eyebrow, muted]}>YOUR EVERYDAY ENGLISH</Text></View>}
            <Text style={[styles.heroTitle, c, desktop ? styles.heroTitleDesktop : styles.heroTitleMobile]}>把英文讀進{ '\n' }你的生活。</Text>
          </View>
          {!heroWide && artwork?.hero && <Image source={artwork.hero} accessible={false} resizeMode="contain" style={{ width: 76, height: 100, flexShrink: 0 }} />}
        </View>
        <Text style={[styles.body, muted, { maxWidth: 390 }]}>從一篇想讀的文章開始。留下新單字、原句，還有屬於你的理解。</Text>
        <View style={[styles.actionRow, { alignItems: 'flex-start' }]}><Button label="貼上英文，開始閱讀" icon="add-outline" colors={colors} disabled={!data.ready} onPress={startReading} />{onVoicePreview && <Button label="試聽自然 AI 發音" icon="volume-medium-outline" quiet colors={colors} onPress={onVoicePreview} />}</View>
        <View style={styles.inlineRow}><Icon name={data.saveStatus === 'saved' ? 'checkmark-circle-outline' : 'cloud-outline'} size={15} color={colors.muted} /><Text style={[styles.meta, muted]}>{data.saveStatus === 'saving' ? '正在儲存…' : data.saveStatus === 'saved' ? '閱讀紀錄已存到這台裝置' : '請檢查儲存狀態'}</Text></View>
      </View>
      {heroWide && artwork?.hero && <View style={[styles.heroArt, { width: heroWide ? '42%' : '100%', height: desktop ? 300 : heroWide ? 220 : 185, backgroundColor: colors.accentSoft }]}><Image source={artwork.hero} accessibilityLabel="戴圓眼鏡、拿著星星書籤的書本小夥伴" resizeMode="contain" style={styles.fillImage} /></View>}
    </View>
    <View style={[styles.statsStrip, surface]}>
      <View style={styles.stripStat}><Text style={[styles.stripValue, c]}>{data.state.articles.length}<Text style={[styles.statUnit, muted]}> 篇</Text></Text><Text style={[styles.meta, muted]}>我的閱讀</Text></View>
      <View style={[styles.stripStat, styles.stripDivider, { borderColor: colors.line }]}><Text style={[styles.stripValue, c]}>{data.state.cards.length}<Text style={[styles.statUnit, muted]}> 張</Text></Text><Text style={[styles.meta, muted]}>原句字卡</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`開始複習，${dueCount} 張待複習`} onPress={onReview} style={({ pressed }) => [styles.stripStat, styles.stripDivider, { borderColor: colors.line, transform: [{ translateY: pressed ? 1 : 0 }] }]}><Text style={[styles.stripValue, { color: colors.blue, fontFamily: colors.font }]}>{dueCount}<Text style={[styles.statUnit, muted]}> 張</Text></Text><View style={styles.inlineRow}><Text style={[styles.meta, muted]}>待複習</Text><Icon name="arrow-forward-outline" size={14} color={colors.blue} /></View></Pressable>
    </View>
    <Message text={message} colors={colors} />
    <View style={styles.sectionRow}><View><Text style={[styles.heading, c]}>我的閱讀</Text><Text style={[styles.meta, muted]}>接著讀，或開啟一個新故事。</Text></View>{data.state.articles.length > 0 && <Button label="新增文章" colors={colors} quiet icon="add-outline" disabled={!data.ready} onPress={startReading} />}</View>
    {data.state.articles.length ? <View style={styles.grid}>{[...data.state.articles].sort((a, b) => (b.lastReadAt ?? b.createdAt) - (a.lastReadAt ?? a.createdAt)).map((item) => <View key={item.id} style={[styles.articleCard, surface, desktop ? styles.twoColumn : styles.fullWidth]}><Pressable accessibilityRole="button" accessibilityLabel={`閱讀 ${item.title}`} onPress={() => open(item.id)} style={({ pressed }) => [styles.articleOpen, { transform: [{ translateY: pressed ? 1 : 0 }] }]}><View style={styles.inlineRow}><View style={[styles.articleIcon, { backgroundColor: colors.accentSoft }]}><Icon name="document-text-outline" size={19} color={colors.ink} /></View><Text style={[styles.meta, muted]}>我的文章</Text></View><Text style={[styles.heading, c]}>{item.title}</Text><Text numberOfLines={2} style={[styles.preview, muted]}>{item.body.replace(/\s+/g, ' ')}</Text><View style={styles.labelRow}><Text style={[styles.meta, muted]}>{tokenizeReading(item.body).filter((token) => token.isWord).length} 詞 · {data.state.cards.filter((card) => card.articleId === item.id).length} 張字卡</Text><Icon name="arrow-forward-outline" size={18} color={colors.blue} /></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`移除文章 ${item.title}`} onPress={() => setRemoveId(item.id)} style={({ pressed }) => [styles.articleDelete, styles.iconButton, { transform: [{ translateY: pressed ? 1 : 0 }] }]}><Icon name="trash-outline" size={17} color={colors.muted} /></Pressable></View>)}</View> : <View style={[styles.libraryEmpty, { borderColor: colors.line, flexDirection: desktop ? 'row' : 'column' }]}><View style={{ flex: desktop ? 1 : undefined, gap: 4 }}><Text style={[styles.fieldLabel, c, { marginTop: 0 }]}>你的第一篇文章，還在等你。</Text><Text style={[styles.meta, muted]}>貼上信件、筆記，或先讀讀下方的原創短文。</Text></View><Button label="加入第一篇文章" colors={colors} quiet icon="add-outline" disabled={!data.ready} onPress={startReading} /></View>}
    <View style={styles.sectionRow}><View><Text style={[styles.heading, c]}>給今天的一點英文</Text><Text style={[styles.meta, muted]}>三篇原創短文，點開就能開始。</Text></View><Text style={[styles.eyebrow, muted]}>THE READING EDIT</Text></View>
    <View style={styles.sampleGrid}>{readingSamples.map((sample, index) => <SampleCard key={sample.id} sample={sample} index={index} artwork={sampleArtwork[index]} desktop={desktop} colors={colors} onPress={() => addSample(sample)} />)}</View>
    <View style={[styles.privacyNote, { borderColor: colors.line }]}><Icon name="lock-closed-outline" size={15} color={colors.muted} /><Text style={[styles.meta, muted, { flex: 1 }]}>文章與字卡僅保存在這台裝置。內建詞義仍為小樣；未收錄的字可自行填寫，不會產生假翻譯。</Text></View>

    <Sheet title="新增閱讀" open={creating} close={() => setCreating(false)} colors={colors}>
      <Text style={[styles.body, muted]}>只貼上你有權使用的文字。內容不會送到翻譯或 AI 服務。</Text>
      <Text style={[styles.fieldLabel, c]}>文章名稱</Text><TextInput accessibilityLabel="文章名稱" value={title} onChangeText={setTitle} maxLength={120} placeholder="例如：下週的會議邀請" placeholderTextColor={colors.muted} style={[styles.input, surface, c, { borderColor: colors.controlBorder }]} />
      <Text style={[styles.fieldLabel, c]}>英文內容</Text><TextInput accessibilityLabel="英文文章內容" value={body} onChangeText={setBody} maxLength={20000} multiline placeholder="貼上想閱讀的英文…" placeholderTextColor={colors.muted} style={[styles.input, styles.articleInput, surface, c, { borderColor: colors.controlBorder }]} />
      <Text style={[styles.meta, muted]}>{body.length.toLocaleString()} / 20,000 字元</Text><Message text={message} colors={colors} /><Button label="保存並開始閱讀" colors={colors} disabled={!title.trim() || !body.trim() || !data.ready} onPress={create} />
    </Sheet>
    <Sheet title="閱讀文章" open={Boolean(article)} close={() => { setArticleId(null); setSelection(null); setMessage(''); setLookupY(0); }} colors={colors} scrollRef={articleScroll}>
      {article && <><Text style={[styles.meta, muted]}>我的閱讀 · {articleCards.length} 張已收藏字卡</Text><Text style={[styles.title, c]}>{article.title}</Text>
        <View style={styles.actionRow}><Button label={rangeMode ? '取消片語選取' : '選取片語'} colors={colors} quiet onPress={() => { setRangeMode(!rangeMode); setRangeStart(null); }} /><Button label="聽文章" icon="volume-medium-outline" colors={colors} quiet onPress={() => speak(article.body)} /></View>
        <Text style={[styles.meta, muted]}>{rangeMode ? rangeStart === null ? '先點片語的第一個字，再點最後一個字。' : '再點最後一個字，完成片語選取。' : '點選任何英文單字，下方會出現原句字卡。'}</Text>
        <Message text={message} colors={colors} />
        <Text style={[c, styles.readingText]}>{tokens.map((token) => <Text key={token.start} accessibilityRole={token.isWord ? 'button' : undefined} accessibilityLabel={token.isWord ? `選字 ${token.text}，位置 ${token.start}` : undefined} onPress={token.isWord ? () => pick(token.start, token.end) : undefined} style={selection && token.start >= selection.start && token.end <= selection.end ? { backgroundColor: colors.accent, color: colors.onAccent } : articleCards.some((card) => card.selectionStart <= token.start && card.selectionEnd >= token.end) && token.isWord ? { textDecorationLine: 'underline', textDecorationColor: colors.blue } : undefined}>{token.text}</Text>)}</Text>
        {selection && <View onLayout={(event) => setLookupY(event.nativeEvent.layout.y)} style={[styles.lookup, styles.readerLookup, surface, { borderTopColor: colors.blue }]}><Button label="回到文章繼續選字" colors={colors} quiet onPress={() => articleScroll.current?.scrollTo({ y: 0, animated: true })} /><View style={styles.sectionRow}><Text style={[styles.lookupWord, c]}>{selectedText}</Text><Button label="聽選取內容" colors={colors} quiet icon="volume-medium-outline" onPress={() => speak(selectedText)} /></View><Text style={[c, styles.quote]}>{selectedContext}</Text><Button label="聽這段原句" colors={colors} quiet icon="volume-medium-outline" onPress={() => speak(selectedContext)} />
          {match ? <><Text style={[styles.fieldLabel, c]}>內建詞義參考 · {match.word}</Text><Text style={[styles.body, muted]}>{match.translation}</Text><Button label="填入參考意思" colors={colors} quiet onPress={() => setMeaning(match.translation)} /><Text style={[styles.meta, muted]}>多義詞請留下適合這一句的意思。詞庫內容仍待正式編校。</Text></> : <><Text style={[styles.body, muted]}>內建詞庫尚未收錄。可自行填寫意思，或開啟外部字典查證。</Text><Button label="到 Cambridge 查證（外部網站）" quiet colors={colors} onPress={() => { void Linking.openURL(`https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(selectedText.toLowerCase())}`).catch(() => setMessage('外部字典暫時無法開啟。')); }} /></>}
          <Text style={[styles.fieldLabel, c]}>這句話裡的意思</Text><TextInput accessibilityLabel="原句字卡意思" value={meaning} onChangeText={setMeaning} maxLength={2000} multiline placeholder="留下你真正要記住的意思" placeholderTextColor={colors.muted} style={[styles.input, surface, c, { borderColor: colors.controlBorder }]} />
          <Text style={[styles.fieldLabel, c]}>自己的筆記（選填）</Text><TextInput accessibilityLabel="原句字卡筆記" value={note} onChangeText={setNote} maxLength={2000} multiline placeholder="容易搞混的用法、自己的聯想…" placeholderTextColor={colors.muted} style={[styles.input, surface, c, { borderColor: colors.controlBorder }]} />
          <Button label={existingCard ? '更新這張原句字卡' : '加入原句字卡'} colors={colors} icon="bookmark-outline" onPress={saveCard} /><Message text={message} colors={colors} />
        </View>}
      </>}
    </Sheet>
    <Sheet title="移除文章" open={Boolean(removeId)} close={() => setRemoveId(null)} colors={colors}><Text style={[styles.body, c]}>移除後文章將不再出現在閱讀列表；已收藏的字卡、原句與複習紀錄仍然保留。</Text><Button label="確認移除文章" colors={colors} onPress={removeArticle} /><Button label="保留文章" colors={colors} quiet onPress={() => setRemoveId(null)} /></Sheet>
  </>;
}

export function ContextLibrary({ data, colors, speak, onReview }: Props) {
  const desktop = useWindowDimensions().width >= 1080;
  const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.state.cards.find((card) => card.id === selectedId);
  const [meaning, setMeaning] = useState(''); const [note, setNote] = useState(''); const [message, setMessage] = useState(''); const [removing, setRemoving] = useState(false);
  const visible = data.state.cards.filter((card) => `${card.text} ${card.meaning} ${card.context} ${card.sourceTitle}`.toLowerCase().includes(query.toLowerCase()));
  const c = { color: colors.ink, fontFamily: colors.font }, muted = { color: colors.muted, fontFamily: colors.font }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  const open = (card: ContextCard) => { setSelectedId(card.id); setMeaning(card.meaning); setNote(card.note); setMessage(''); setRemoving(false); };
  const save = () => { try { if (!selected || !meaning.trim()) return; data.change((state) => editContextCard(state, selected.id, { meaning, note })); setMessage('字卡已更新。'); } catch (error) { setMessage(errorText(error)); } };
  return <><View style={styles.sectionRow}><View style={{ gap: 4 }}><Text style={[styles.eyebrow, muted]}>YOUR WORDS, IN CONTEXT</Text><Text style={[styles.title, c]}>自己的原句字卡</Text></View><Text style={[styles.countPill, { color: colors.onAccent, backgroundColor: colors.accent, fontFamily: colors.font }]}>{data.state.cards.length} 張收藏</Text></View>
    {data.state.cards.length > 0 ? <><View style={[styles.labelRow, { alignItems: 'center', gap: 14 }]}><TextInput accessibilityLabel="搜尋原句字卡" value={query} onChangeText={setQuery} placeholder="找單字、意思或文章" placeholderTextColor={colors.muted} style={[styles.input, surface, c, { flex: 1, minWidth: 210 }, { borderColor: colors.controlBorder }]} /><Button label="開始複習原句字卡" colors={colors} onPress={onReview} /></View><View style={styles.grid}>{visible.map((card) => <CardPreview key={card.id} card={card} colors={colors} desktop={desktop} open={() => open(card)} />)}</View>{!visible.length && <Text style={[styles.body, muted]}>沒有符合的字卡。</Text>}</> : <View style={[styles.libraryEmpty, { borderColor: colors.line }]}><Text style={[styles.body, muted]}>到「閱讀」貼上文章，選取英文就能建立第一張原句字卡。</Text></View>}
    <Sheet title="編輯原句字卡" open={Boolean(selected)} close={() => setSelectedId(null)} colors={colors}>{selected && <><Text style={[styles.title, c]}>{selected.text}</Text><Text style={[styles.quote, c]}>{selected.context}</Text><Text style={[styles.meta, muted]}>來源：{selected.sourceTitle}</Text><View style={styles.actionRow}><Button label="聽單字" quiet colors={colors} onPress={() => speak(selected.text)} /><Button label="聽原句" quiet colors={colors} onPress={() => speak(selected.context)} /></View><Text style={[styles.fieldLabel, c]}>意思</Text><TextInput accessibilityLabel="編輯字卡意思" value={meaning} onChangeText={setMeaning} maxLength={2000} multiline style={[styles.input, surface, c, { borderColor: colors.controlBorder }]} /><Text style={[styles.fieldLabel, c]}>筆記</Text><TextInput accessibilityLabel="編輯字卡筆記" value={note} onChangeText={setNote} maxLength={2000} multiline style={[styles.input, surface, c, { borderColor: colors.controlBorder }]} /><Button label="儲存字卡修改" disabled={!meaning.trim()} colors={colors} onPress={save} /><Message text={message} colors={colors} />{removing ? <><Text style={[styles.body, c]}>這張字卡與它的複習紀錄會一起移除，請先確認已備份。</Text><Button label="確認移除字卡" colors={colors} onPress={() => { try { data.change((state) => removeContextCard(state, selected.id)); setSelectedId(null); } catch (error) { setMessage(errorText(error)); } }} /><Button label="保留字卡" colors={colors} quiet onPress={() => setRemoving(false)} /></> : <Button label="移除這張字卡" colors={colors} quiet onPress={() => setRemoving(true)} />}</>}</Sheet>
  </>;
}

export function ContextReview({ data, colors, speak, onRead }: Omit<Props, 'onReview'> & { onRead: () => void }) {
  const [clock, setClock] = useState(Date.now()); const [flipped, setFlipped] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const due = getDueCards(data.state, clock); const card = due[0]; const stats = getReadingStats(data.state, clock);
  useEffect(() => { setFlipped(false); }, [card?.id]);
  const rate = (rating: ReviewRating) => { if (!card || !flipped) return; try { data.change((state) => reviewContextCard(state, card.id, rating)); setFlipped(false); setClock(Date.now()); } catch (error) { setMessage(errorText(error)); } };
  const c = { color: colors.ink, fontFamily: colors.font }, muted = { color: colors.muted, fontFamily: colors.font }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  return <><Text style={[styles.eyebrow, muted]}>記得那個字，也記得在哪裡遇見它。</Text><Text style={[styles.title, c]}>原句複習</Text><View style={styles.stats}>{[{ label: '今日完成', value: stats.todayReviewCount }, { label: '待複習', value: due.length }, { label: '連續天數', value: stats.streak }].map((item) => <View key={item.label} style={[styles.stat, surface]}><Text style={[styles.statValue, c]}>{item.value}</Text><Text style={[styles.meta, muted]}>{item.label}</Text></View>)}</View>
    {card ? <><View style={[styles.reviewCard, surface]}><Text style={[styles.meta, muted]}>來自 {card.sourceTitle}</Text><Text style={[styles.title, c, { textAlign: 'center' }]}>{card.text}</Text><Text style={[styles.quote, c]}>{card.context}</Text>{flipped ? <><View style={[styles.separator, { backgroundColor: colors.line }]} /><Text style={[styles.meaning, c]}>{card.meaning}</Text>{!!card.note && <Text style={[styles.body, muted]}>{card.note}</Text>}</> : <Button label="翻開原句字卡答案" colors={colors} onPress={() => setFlipped(true)} />}</View><Button label="聽這張字卡的原句" colors={colors} quiet onPress={() => speak(card.context)} />{flipped && <View style={{ gap: 8 }}><Button label="原句：再看看 · 1 分鐘" colors={colors} quiet onPress={() => rate('again')} /><Button label="原句：記得 · 3 天" colors={colors} onPress={() => rate('good')} /><Button label="原句：熟悉 · 7 天" colors={colors} quiet onPress={() => rate('easy')} /></View>}</> : <View style={[styles.empty, surface]}><Icon name="checkmark-circle-outline" size={38} color={colors.ink} /><Text style={[styles.heading, c]}>{data.state.cards.length ? '這一輪完成了' : '從自己的原句開始'}</Text><Text style={[styles.body, muted]}>{data.state.cards.length ? '下次複習時間已排好。現在可以繼續閱讀，遇見新的字。' : '先在文章中保存一張字卡，這裡就會開始安排複習。'}</Text><Button label="回到閱讀" colors={colors} onPress={onRead} /></View>}<Message text={message} colors={colors} />
  </>;
}

export function ReadingBackup({ data, colors }: Pick<Props, 'data' | 'colors'>) {
  const [mode, setMode] = useState<'export' | 'import' | null>(null); const [raw, setRaw] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const download = async (recovery = false) => {
    try {
      const content = recovery ? await data.getRecoveryBackup() : exportReadingState(data.state);
      setRaw(content); setMode('export'); setMessage('');
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url;
        link.download = `lexiharbor-reading-${new Date().toISOString().slice(0, 10)}.json`; link.click();
        setTimeout(() => { if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url); }, 30000);
      } else await Share.share({ message: content });
    } catch (error) { setMessage(errorText(error)); }
  };
  const c = { color: colors.ink, fontFamily: colors.font }, muted = { color: colors.muted, fontFamily: colors.font }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  return <><Text style={[styles.heading, c]}>閱讀與原句字卡備份</Text><Text style={[styles.body, muted]}>換裝置前先匯出。匯入會合併文章與字卡，不清空現在的紀錄。</Text><Button label="匯出閱讀與字卡" colors={colors} quiet onPress={() => void download()} /><Button label="匯入閱讀與字卡" colors={colors} quiet disabled={!data.ready} onPress={() => { setRaw(''); setMessage(''); setMode('import'); }} /><Button label="取回閱讀自動備份" colors={colors} quiet onPress={() => void download(true)} /><Message text={message} colors={colors} /><Sheet title="閱讀資料備份" open={Boolean(mode)} close={() => { if (!busy) setMode(null); }} colors={colors}><Text style={[styles.body, muted]}>{mode === 'import' ? '貼上之前匯出的閱讀備份。格式錯誤不會修改現有資料。' : '已準備下載。也可以複製下方文字保存。'}</Text><TextInput accessibilityLabel="閱讀備份內容" value={raw} onChangeText={setRaw} editable={!busy} multiline autoCapitalize="none" autoCorrect={false} style={[styles.input, styles.articleInput, c, surface, { borderColor: colors.controlBorder }]} />{mode === 'import' && <Button label={busy ? '合併中…' : '合併閱讀備份'} disabled={busy || !raw.trim()} colors={colors} onPress={() => { setBusy(true); setMessage(''); void data.importData(raw).then(() => { setMode(null); setMessage('閱讀備份已合併。'); }).catch((error: unknown) => setMessage(errorText(error))).finally(() => setBusy(false)); }} />}<Message text={message} colors={colors} /></Sheet></>;
}

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, gap: 12 },
  sheetContent: { paddingTop: 28, gap: 18, paddingBottom: 48 },
  headerMark: { width: 5, height: 24, borderRadius: 3 },
  speechBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1 },
  hero: { borderWidth: 1.5, borderRadius: 24, gap: 24, overflow: 'hidden' },
  heroCopy: { gap: 18, justifyContent: 'center', minWidth: 0 },
  heroTitle: { fontWeight: '800' },
  heroTitleDesktop: { fontSize: 48, lineHeight: 61, letterSpacing: -1.8 },
  heroTitleMobile: { fontSize: 30, lineHeight: 40, letterSpacing: -0.8 },
  heroArt: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden' },
  fillImage: { width: '100%', height: '100%' },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4 },
  title: { fontSize: 34, lineHeight: 46, fontWeight: '700', letterSpacing: -0.8 },
  heading: { fontSize: 20, lineHeight: 29, fontWeight: '700', letterSpacing: -0.25 },
  body: { fontSize: 16, lineHeight: 27 },
  meta: { fontSize: 12, lineHeight: 20 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, lineHeight: 20, fontWeight: '600' },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 2 },
  button: { minHeight: 44, maxWidth: '100%', minWidth: 0, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 },
  iconButton: { minWidth: 44, minHeight: 44, padding: 11, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  sectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 2 },
  statsStrip: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 16, paddingVertical: 16 },
  stripStat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3 },
  stripDivider: { borderLeftWidth: 1 },
  stripValue: { fontSize: 27, lineHeight: 34, fontWeight: '600' },
  statUnit: { fontSize: 12, lineHeight: 20, fontWeight: '400' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  twoColumn: { width: '48.8%' },
  fullWidth: { width: '100%' },
  articleCard: { borderWidth: 1.5, borderRadius: 16, minHeight: 224, overflow: 'hidden' },
  articleOpen: { padding: 22, gap: 12, flex: 1 },
  articleDelete: { position: 'absolute', right: 10, top: 10 },
  articleIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  preview: { fontSize: 15, lineHeight: 25 },
  libraryEmpty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 20, gap: 16, marginVertical: 4 },
  empty: { borderWidth: 1.5, borderRadius: 24, padding: 28, gap: 14, marginVertical: 4 },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  sampleCard: { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden' },
  sampleCopy: { flex: 1, gap: 9, minHeight: 106 },
  privacyNote: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderTopWidth: 1, paddingTop: 18, marginTop: 8 },
  contextCard: { borderWidth: 1.5, borderRadius: 16, padding: 24, gap: 16, minHeight: 240 },
  quoteBlock: { borderLeftWidth: 2, paddingLeft: 15 },
  countPill: { fontSize: 12, lineHeight: 20, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  fieldLabel: { fontSize: 14, lineHeight: 22, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 15, minHeight: 50, maxWidth: '100%', minWidth: 0, fontSize: 16, lineHeight: 26 },
  articleInput: { minHeight: 230, textAlignVertical: 'top' },
  readingText: { width: '100%', maxWidth: 760, alignSelf: 'center', fontSize: 23, lineHeight: 42, fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, marginVertical: 20 },
  lookup: { padding: 24, borderWidth: 1.5, borderRadius: 24, gap: 16 },
  readerLookup: { width: '100%', maxWidth: 760, alignSelf: 'center', borderTopWidth: 3 },
  lookupWord: { fontSize: 28, lineHeight: 38, fontWeight: '600', flexShrink: 1 },
  quote: { fontSize: 18, lineHeight: 30, fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined },
  message: { padding: 13, borderWidth: 1.5, borderRadius: 12, fontSize: 14, lineHeight: 24 },
  stats: { flexDirection: 'row', gap: 12, maxWidth: 780, width: '100%', alignSelf: 'center' },
  stat: { borderWidth: 1.5, borderRadius: 16, padding: 16, alignItems: 'center', flex: 1, gap: 5 },
  statValue: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  reviewCard: { borderWidth: 1.5, borderRadius: 24, padding: 32, gap: 24, alignItems: 'stretch', marginVertical: 10, width: '100%', maxWidth: 780, alignSelf: 'center' },
  separator: { height: 1, width: '100%' },
  meaning: { fontSize: 25, lineHeight: 36, fontWeight: '600', textAlign: 'center' },
});
