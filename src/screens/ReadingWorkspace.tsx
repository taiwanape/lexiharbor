import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/Icons';
import { readingSamples } from '../data/readingSamples';
import { searchLearningWords } from '../domain/search';
import { addContextCard, createArticle, deleteArticle, editContextCard, exportReadingState, extractContext, getDueCards, getReadingStats, markArticleRead, removeContextCard, reviewContextCard, tokenizeReading, READING_LIMITS, type ContextCard } from '../domain/reading';
import type { useReading } from '../state/useReading';
import type { ReviewRating } from '../types';

export type ReadingColors = { bg: string; card: string; ink: string; muted: string; line: string; soft: string };
type ReaderData = ReturnType<typeof useReading>;
type Props = { data: ReaderData; colors: ReadingColors; speak: (text: string) => void; onReview: () => void };
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作未完成，請再試一次。';
export const ReadingFeedback = createContext<{ data: ReaderData; speechStatus?: string; stopSpeech?: () => void } | null>(null);

function Button({ label, onPress, colors, quiet, disabled, icon }: { label: string; onPress: () => void; colors: ReadingColors; quiet?: boolean; disabled?: boolean; icon?: IconName }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={[styles.button, { backgroundColor: quiet ? colors.soft : '#27664D', opacity: disabled ? 0.45 : 1 }]}>{icon && <Icon name={icon} size={18} color={quiet ? colors.ink : '#fff'} />}<Text style={[styles.buttonText, { color: quiet ? colors.ink : '#fff' }]}>{label}</Text></Pressable>;
}
function Message({ text, colors }: { text: string; colors: ReadingColors }) { return text ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.ink, backgroundColor: colors.soft }]}>{text}</Text> : null; }
function Sheet({ title, open, close, children, colors, scrollRef }: { title: string; open: boolean; close: () => void; children: React.ReactNode; colors: ReadingColors; scrollRef?: React.RefObject<ScrollView | null> }) {
  const feedback = useContext(ReadingFeedback);
  return <Modal visible={open} animationType="slide" onRequestClose={close}><SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><View style={styles.frame}><View style={[styles.sheetHeader, { borderColor: colors.line }]}><Text style={[styles.heading, { color: colors.ink }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`關閉${title}`} onPress={close} style={styles.iconButton}><Icon name="close" color={colors.ink} /></Pressable></View>
    {feedback && feedback.data.saveStatus !== 'saved' && <View style={{ padding: 12, gap: 8 }}><Message text={feedback.data.notice || (feedback.data.saveStatus === 'saving' ? '正在儲存到這台裝置，請稍候。' : '正在讀取閱讀資料…')} colors={colors} />{feedback.data.saveStatus === 'error' && <Button label="重試儲存閱讀變更" colors={colors} onPress={() => void feedback.data.retrySave()} />}</View>}
    {!!feedback?.speechStatus && <View style={{ paddingHorizontal: 22, paddingVertical: 8, gap: 6 }}><Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.muted }]}>{feedback.speechStatus}</Text>{feedback.stopSpeech && <Button label="停止播放" quiet colors={colors} onPress={feedback.stopSpeech} />}</View>}
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView></View></SafeAreaView></Modal>;
}

export function ReadingLibrary({ data, colors, speak, onReview }: Props) {
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
  const c = { color: colors.ink }, muted = { color: colors.muted }, surface = { backgroundColor: colors.card, borderColor: colors.line };

  return <>
    <View style={styles.labelRow}><Text style={[styles.eyebrow, muted]}>READ. KEEP. REMEMBER.</Text><Text style={[styles.meta, muted]}>{data.saveStatus === 'saving' ? '正在儲存…' : data.saveStatus === 'saved' ? '已存到此裝置' : '請檢查儲存狀態'}</Text></View>
    <Text style={[styles.title, c]}>讀過的英文，{ '\n' }留在自己的單字本。</Text>
    <Text style={[styles.body, muted]}>貼上文章，點選想學的字。連同原句一起留下，讓下次複習有跡可循。</Text>
    <View style={styles.actionRow}><Button label="貼上英文，開始閱讀" icon="add-outline" colors={colors} disabled={!data.ready} onPress={() => { setCreating(true); setMessage(''); }} /><Button label="複習原句字卡" quiet colors={colors} onPress={onReview} /></View>
    <Message text={message} colors={colors} />
    <View style={styles.sectionRow}><Text style={[styles.heading, c]}>我的閱讀</Text><Text style={[styles.meta, muted]}>{data.state.articles.length} 篇 · {data.state.cards.length} 張原句字卡</Text></View>
    {data.state.articles.length ? [...data.state.articles].sort((a, b) => (b.lastReadAt ?? b.createdAt) - (a.lastReadAt ?? a.createdAt)).map((item) => <View key={item.id} style={[styles.articleCard, surface]}><Pressable accessibilityRole="button" accessibilityLabel={`閱讀 ${item.title}`} onPress={() => open(item.id)} style={styles.articleOpen}><Text style={[styles.heading, c]}>{item.title}</Text><Text numberOfLines={2} style={[styles.preview, muted]}>{item.body.replace(/\s+/g, ' ')}</Text><Text style={[styles.meta, muted]}>{tokenizeReading(item.body).filter((token) => token.isWord).length} 詞 · {data.state.cards.filter((card) => card.articleId === item.id).length} 張字卡</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`移除文章 ${item.title}`} onPress={() => setRemoveId(item.id)} style={styles.iconButton}><Icon name="trash-outline" size={19} color={colors.muted} /></Pressable></View>) : <View style={[styles.empty, surface]}><Icon name="document-text-outline" size={30} color={colors.muted} /><Text style={[styles.heading, c]}>第一篇，從你有興趣的內容開始</Text><Text style={[styles.body, muted]}>可以是自己的筆記、一段英文信件，或先試讀下方的原創短文。</Text></View>}
    <Text style={[styles.heading, c, { marginTop: 12 }]}>先讀一篇，試試看</Text>
    {readingSamples.map((sample, index) => <Pressable key={sample.id} accessibilityRole="button" accessibilityLabel={`試讀 ${sample.title}`} onPress={() => addSample(sample)} style={[styles.sampleCard, surface]}><Text style={[styles.sampleNumber, { color: colors.muted }]}>0{index + 1}</Text><View style={{ flex: 1, gap: 5 }}><Text style={[styles.meta, muted]}>{sample.tag} · 約 {sample.minutes} 分鐘</Text><Text style={[styles.heading, c]}>{sample.title}</Text></View><Icon name="arrow-forward-outline" color={colors.ink} /></Pressable>)}
    <Text style={[styles.meta, muted]}>文章與字卡僅保存在這台裝置。本版內建詞義仍為小樣；未收錄的字可自行填寫，不會產生假翻譯。</Text>

    <Sheet title="新增閱讀" open={creating} close={() => setCreating(false)} colors={colors}>
      <Text style={[styles.body, muted]}>只貼上你有權使用的文字。內容不會送到翻譯或 AI 服務。</Text>
      <Text style={[styles.fieldLabel, c]}>文章名稱</Text><TextInput accessibilityLabel="文章名稱" value={title} onChangeText={setTitle} maxLength={120} placeholder="例如：下週的會議邀請" placeholderTextColor={colors.muted} style={[styles.input, surface, c]} />
      <Text style={[styles.fieldLabel, c]}>英文內容</Text><TextInput accessibilityLabel="英文文章內容" value={body} onChangeText={setBody} maxLength={20000} multiline placeholder="貼上想閱讀的英文…" placeholderTextColor={colors.muted} style={[styles.input, styles.articleInput, surface, c]} />
      <Text style={[styles.meta, muted]}>{body.length.toLocaleString()} / 20,000 字元</Text><Message text={message} colors={colors} /><Button label="保存並開始閱讀" colors={colors} disabled={!title.trim() || !body.trim() || !data.ready} onPress={create} />
    </Sheet>
    <Sheet title="閱讀文章" open={Boolean(article)} close={() => { setArticleId(null); setSelection(null); setMessage(''); setLookupY(0); }} colors={colors} scrollRef={articleScroll}>
      {article && <><Text style={[styles.meta, muted]}>我的閱讀 · {articleCards.length} 張已收藏字卡</Text><Text style={[styles.title, c]}>{article.title}</Text>
        <View style={styles.actionRow}><Button label={rangeMode ? '取消片語選取' : '選取片語'} colors={colors} quiet onPress={() => { setRangeMode(!rangeMode); setRangeStart(null); }} /><Button label="聽文章" icon="volume-medium-outline" colors={colors} quiet onPress={() => speak(article.body)} /></View>
        <Text style={[styles.meta, muted]}>{rangeMode ? rangeStart === null ? '先點片語的第一個字，再點最後一個字。' : '再點最後一個字，完成片語選取。' : '點選任何英文單字，下方會出現原句字卡。'}</Text>
        <Message text={message} colors={colors} />
        <Text style={[styles.readingText, c]}>{tokens.map((token) => <Text key={token.start} accessibilityRole={token.isWord ? 'button' : undefined} accessibilityLabel={token.isWord ? `選字 ${token.text}，位置 ${token.start}` : undefined} onPress={token.isWord ? () => pick(token.start, token.end) : undefined} style={selection && token.start >= selection.start && token.end <= selection.end ? { backgroundColor: '#FFE5A0', color: '#302B19' } : articleCards.some((card) => card.selectionStart <= token.start && card.selectionEnd >= token.end) && token.isWord ? { textDecorationLine: 'underline', textDecorationColor: '#57A283' } : undefined}>{token.text}</Text>)}</Text>
        {selection && <View onLayout={(event) => setLookupY(event.nativeEvent.layout.y)} style={[styles.lookup, surface]}><Button label="回到文章繼續選字" colors={colors} quiet onPress={() => articleScroll.current?.scrollTo({ y: 0, animated: true })} /><View style={styles.sectionRow}><Text style={[styles.lookupWord, c]}>{selectedText}</Text><Button label="聽選取內容" colors={colors} quiet icon="volume-medium-outline" onPress={() => speak(selectedText)} /></View><Text style={[styles.quote, c]}>{selectedContext}</Text><Button label="聽這段原句" colors={colors} quiet icon="volume-medium-outline" onPress={() => speak(selectedContext)} />
          {match ? <><Text style={[styles.fieldLabel, c]}>內建詞義參考 · {match.word}</Text><Text style={[styles.body, muted]}>{match.translation}</Text><Button label="填入參考意思" colors={colors} quiet onPress={() => setMeaning(match.translation)} /><Text style={[styles.meta, muted]}>多義詞請留下適合這一句的意思。詞庫內容仍待正式編校。</Text></> : <><Text style={[styles.body, muted]}>內建詞庫尚未收錄。可自行填寫意思，或開啟外部字典查證。</Text><Button label="到 Cambridge 查證（外部網站）" quiet colors={colors} onPress={() => { void Linking.openURL(`https://dictionary.cambridge.org/dictionary/english-chinese-traditional/${encodeURIComponent(selectedText.toLowerCase())}`).catch(() => setMessage('外部字典暫時無法開啟。')); }} /></>}
          <Text style={[styles.fieldLabel, c]}>這句話裡的意思</Text><TextInput accessibilityLabel="原句字卡意思" value={meaning} onChangeText={setMeaning} maxLength={2000} multiline placeholder="留下你真正要記住的意思" placeholderTextColor={colors.muted} style={[styles.input, surface, c]} />
          <Text style={[styles.fieldLabel, c]}>自己的筆記（選填）</Text><TextInput accessibilityLabel="原句字卡筆記" value={note} onChangeText={setNote} maxLength={2000} multiline placeholder="容易搞混的用法、自己的聯想…" placeholderTextColor={colors.muted} style={[styles.input, surface, c]} />
          <Button label={existingCard ? '更新這張原句字卡' : '加入原句字卡'} colors={colors} icon="bookmark-outline" onPress={saveCard} /><Message text={message} colors={colors} />
        </View>}
      </>}
    </Sheet>
    <Sheet title="移除文章" open={Boolean(removeId)} close={() => setRemoveId(null)} colors={colors}><Text style={[styles.body, c]}>移除後文章將不再出現在閱讀列表；已收藏的字卡、原句與複習紀錄仍然保留。</Text><Button label="確認移除文章" colors={colors} onPress={removeArticle} /><Button label="保留文章" colors={colors} quiet onPress={() => setRemoveId(null)} /></Sheet>
  </>;
}

export function ContextLibrary({ data, colors, speak, onReview }: Props) {
  const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.state.cards.find((card) => card.id === selectedId);
  const [meaning, setMeaning] = useState(''); const [note, setNote] = useState(''); const [message, setMessage] = useState(''); const [removing, setRemoving] = useState(false);
  const visible = data.state.cards.filter((card) => `${card.text} ${card.meaning} ${card.context} ${card.sourceTitle}`.toLowerCase().includes(query.toLowerCase()));
  const c = { color: colors.ink }, muted = { color: colors.muted }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  const open = (card: ContextCard) => { setSelectedId(card.id); setMeaning(card.meaning); setNote(card.note); setMessage(''); setRemoving(false); };
  const save = () => { try { if (!selected || !meaning.trim()) return; data.change((state) => editContextCard(state, selected.id, { meaning, note })); setMessage('字卡已更新。'); } catch (error) { setMessage(errorText(error)); } };
  return <><View style={styles.sectionRow}><Text style={[styles.heading, c]}>原句字卡</Text><Text style={[styles.meta, muted]}>{data.state.cards.length} 張</Text></View>
    {data.state.cards.length > 0 ? <><TextInput accessibilityLabel="搜尋原句字卡" value={query} onChangeText={setQuery} placeholder="找單字、意思或文章" placeholderTextColor={colors.muted} style={[styles.input, surface, c]} />{visible.map((card) => <Pressable accessibilityRole="button" accessibilityLabel={`開啟原句字卡 ${card.text}`} key={card.id} onPress={() => open(card)} style={[styles.lookup, surface]}><Text style={[styles.lookupWord, c]}>{card.text}</Text><Text style={[styles.body, c]}>{card.meaning || '尚未填寫意思'}</Text><Text numberOfLines={2} style={[styles.quote, muted]}>{card.context}</Text><Text style={[styles.meta, muted]}>來自 {card.sourceTitle}</Text></Pressable>)}{!visible.length && <Text style={[styles.body, muted]}>沒有符合的字卡。</Text>}<Button label="開始複習原句字卡" colors={colors} onPress={onReview} /></> : <Text style={[styles.body, muted]}>到「閱讀」貼上文章，選取英文就能建立第一張原句字卡。</Text>}
    <Sheet title="編輯原句字卡" open={Boolean(selected)} close={() => setSelectedId(null)} colors={colors}>{selected && <><Text style={[styles.title, c]}>{selected.text}</Text><Text style={[styles.quote, c]}>{selected.context}</Text><Text style={[styles.meta, muted]}>來源：{selected.sourceTitle}</Text><View style={styles.actionRow}><Button label="聽單字" quiet colors={colors} onPress={() => speak(selected.text)} /><Button label="聽原句" quiet colors={colors} onPress={() => speak(selected.context)} /></View><Text style={[styles.fieldLabel, c]}>意思</Text><TextInput accessibilityLabel="編輯字卡意思" value={meaning} onChangeText={setMeaning} maxLength={2000} multiline style={[styles.input, surface, c]} /><Text style={[styles.fieldLabel, c]}>筆記</Text><TextInput accessibilityLabel="編輯字卡筆記" value={note} onChangeText={setNote} maxLength={2000} multiline style={[styles.input, surface, c]} /><Button label="儲存字卡修改" disabled={!meaning.trim()} colors={colors} onPress={save} /><Message text={message} colors={colors} />{removing ? <><Text style={[styles.body, c]}>這張字卡與它的複習紀錄會一起移除，請先確認已備份。</Text><Button label="確認移除字卡" colors={colors} onPress={() => { try { data.change((state) => removeContextCard(state, selected.id)); setSelectedId(null); } catch (error) { setMessage(errorText(error)); } }} /><Button label="保留字卡" colors={colors} quiet onPress={() => setRemoving(false)} /></> : <Button label="移除這張字卡" colors={colors} quiet onPress={() => setRemoving(true)} />}</>}</Sheet>
  </>;
}

export function ContextReview({ data, colors, speak, onRead }: Omit<Props, 'onReview'> & { onRead: () => void }) {
  const [clock, setClock] = useState(Date.now()); const [flipped, setFlipped] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const due = getDueCards(data.state, clock); const card = due[0]; const stats = getReadingStats(data.state, clock);
  useEffect(() => { setFlipped(false); }, [card?.id]);
  const rate = (rating: ReviewRating) => { if (!card || !flipped) return; try { data.change((state) => reviewContextCard(state, card.id, rating)); setFlipped(false); setClock(Date.now()); } catch (error) { setMessage(errorText(error)); } };
  const c = { color: colors.ink }, muted = { color: colors.muted }, surface = { backgroundColor: colors.card, borderColor: colors.line };
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
  const c = { color: colors.ink }, muted = { color: colors.muted }, surface = { backgroundColor: colors.card, borderColor: colors.line };
  return <><Text style={[styles.heading, c]}>閱讀與原句字卡備份</Text><Text style={[styles.body, muted]}>換裝置前先匯出。匯入會合併文章與字卡，不清空現在的紀錄。</Text><Button label="匯出閱讀與字卡" colors={colors} quiet onPress={() => void download()} /><Button label="匯入閱讀與字卡" colors={colors} quiet disabled={!data.ready} onPress={() => { setRaw(''); setMessage(''); setMode('import'); }} /><Button label="取回閱讀自動備份" colors={colors} quiet onPress={() => void download(true)} /><Message text={message} colors={colors} /><Sheet title="閱讀資料備份" open={Boolean(mode)} close={() => { if (!busy) setMode(null); }} colors={colors}><Text style={[styles.body, muted]}>{mode === 'import' ? '貼上之前匯出的閱讀備份。格式錯誤不會修改現有資料。' : '已準備下載。也可以複製下方文字保存。'}</Text><TextInput accessibilityLabel="閱讀備份內容" value={raw} onChangeText={setRaw} editable={!busy} multiline autoCapitalize="none" autoCorrect={false} style={[styles.input, styles.articleInput, c, surface]} />{mode === 'import' && <Button label={busy ? '合併中…' : '合併閱讀備份'} disabled={busy || !raw.trim()} colors={colors} onPress={() => { setBusy(true); setMessage(''); void data.importData(raw).then(() => { setMode(null); setMessage('閱讀備份已合併。'); }).catch((error: unknown) => setMessage(errorText(error))).finally(() => setBusy(false)); }} />}<Message text={message} colors={colors} /></Sheet></>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 860, alignSelf: 'center' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 10, borderBottomWidth: 1 }, sheetContent: { padding: 22, gap: 16, paddingBottom: 48 },
  title: { fontSize: 31, lineHeight: 42, fontWeight: '800', letterSpacing: -0.6 }, heading: { fontSize: 18, lineHeight: 27, fontWeight: '700' }, body: { fontSize: 16, lineHeight: 26 }, meta: { fontSize: 12, lineHeight: 20 }, eyebrow: { fontSize: 12, letterSpacing: 1.1, lineHeight: 20 }, labelRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginVertical: 5 },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, buttonText: { fontSize: 14, fontWeight: '700', flexShrink: 1 }, iconButton: { minWidth: 44, minHeight: 44, padding: 11, justifyContent: 'center', alignItems: 'center' }, sectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  articleCard: { borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }, articleOpen: { padding: 18, gap: 9, flex: 1 }, preview: { fontSize: 15, lineHeight: 23 }, empty: { borderWidth: 1, borderRadius: 18, padding: 24, gap: 12, marginVertical: 4 }, sampleCard: { borderWidth: 1, borderRadius: 14, padding: 18, gap: 14, flexDirection: 'row', alignItems: 'center' }, sampleNumber: { fontSize: 24, fontWeight: '300' },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginTop: 8 }, input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 49, fontSize: 16, lineHeight: 24 }, articleInput: { minHeight: 230, textAlignVertical: 'top' }, readingText: { fontSize: 21, lineHeight: 39, fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined, marginVertical: 12 }, lookup: { padding: 20, borderWidth: 1, borderRadius: 18, gap: 13 }, lookupWord: { fontSize: 27, lineHeight: 36, fontWeight: '700' }, quote: { fontSize: 17, lineHeight: 28 }, message: { padding: 12, borderRadius: 10, fontSize: 14, lineHeight: 23 },
  stats: { flexDirection: 'row', gap: 9 }, stat: { borderWidth: 1, borderRadius: 14, padding: 13, alignItems: 'center', flex: 1, gap: 5 }, statValue: { fontSize: 25, fontWeight: '800' }, reviewCard: { borderWidth: 1, borderRadius: 22, padding: 25, gap: 22, alignItems: 'stretch', marginVertical: 10 }, separator: { height: 1, width: '100%' }, meaning: { fontSize: 24, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
});
