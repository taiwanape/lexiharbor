import type { ReviewRating } from '../types';
import { getStudyStats, localDateKey, REVIEW_INTERVALS_MS, type StudyStats } from './study';

export const READING_LIMITS = {
  articles: 100, body: 30_000, title: 160, cards: 2_000,
  selectedText: 200, context: 4_000, meaning: 2_000, note: 2_000,
  reviewsPerCard: 1_000, reviews: 25_000, json: 12_000_000,
} as const;

export type ReadingArticle = {
  id: string; title: string; body: string;
  createdAt: number; updatedAt: number; lastReadAt: number | null;
};
export type CardReview = {
  rating: ReviewRating; reviewedAt: number; dueAt: number; studyDate: string;
};
export type ContextCard = {
  id: string; articleId: string | null; sourceTitle: string;
  /** Exact original spelling and UTF-16 selection offsets, never normalized. */
  text: string; context: string; selectionStart: number; selectionEnd: number;
  meaning: string; note: string; createdAt: number; updatedAt: number;
  reviews: CardReview[];
};
export type ReadingState = { version: 1; articles: ReadingArticle[]; cards: ContextCard[] };
export type ReadingLoadResult = { ok: true; state: ReadingState } | { ok: false; error: string };
export type ReadingToken = { text: string; start: number; end: number; isWord: boolean };

export function createReadingState(): ReadingState { return { version: 1, articles: [], cards: [] }; }

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function fail(message: string): never { throw new Error(message); }
function timestamp(value: unknown): value is number {
  // Keep local calendar labels within four-digit years, including date arithmetic.
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 253_402_214_399_999;
}
function checkTime(value: unknown): asserts value is number {
  if (!timestamp(value)) fail('時間資料無效。');
}
function checkText(value: unknown, limit: number, label: string, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || value.length > limit || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(`${label}無效或超過 ${limit} 字元上限。`);
  }
}
function checkId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{0,119}$/.test(value)) fail('識別碼無效。');
}
function rating(value: unknown): value is ReviewRating { return value === 'again' || value === 'good' || value === 'easy'; }
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function checkSelection(text: string, start: number, end: number): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > text.length) fail('請選取文章中的單字或片語。');
  for (const index of [start, end]) {
    if (index > 0 && index < text.length && /[\uD800-\uDBFF]/.test(text[index - 1]!) && /[\uDC00-\uDFFF]/.test(text[index]!)) fail('選取範圍不能切開文字字元。');
  }
}

/** Deterministic UTF-16 offsets; joining every token reproduces the input exactly. */
export function tokenizeReading(text: string): ReadingToken[] {
  const tokens: ReadingToken[] = [];
  const words = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’ʼ\-‐‑][\p{L}\p{M}\p{N}]+)*/gu;
  let offset = 0;
  for (const match of text.matchAll(words)) {
    const start = match.index!;
    if (start > offset) tokens.push({ text: text.slice(offset, start), start: offset, end: start, isWord: false });
    const end = start + match[0].length;
    tokens.push({ text: match[0], start, end, isWord: true });
    offset = end;
  }
  if (offset < text.length) tokens.push({ text: text.slice(offset), start: offset, end: text.length, isWord: false });
  return tokens;
}

/** Plain text only. A context may span several sentences when the selection does. */
export function extractContext(text: string, start: number, end: number): string {
  checkSelection(text, start, end);
  if (end - start > READING_LIMITS.selectedText) fail(`請選取不超過 ${READING_LIMITS.selectedText} 字元的片語。`);
  const boundaries = [0];
  const separators = /[.!?。！？]+["'”’）)\]]*(?=\s|$)|\n+/g;
  for (const match of text.matchAll(separators)) {
    const position = match.index!;
    const before = text.slice(0, position);
    // Avoid splitting common English abbreviations and single-letter initials.
    if (match[0] === '.' && /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)|\b[A-Za-z]|\b(?:e\.g|i\.e))$/i.test(before)) continue;
    boundaries.push(position + match[0].length);
  }
  boundaries.push(text.length);
  let left = 0;
  let right = text.length;
  for (const boundary of boundaries) {
    if (boundary <= start) left = boundary;
    if (boundary >= end) { right = boundary; break; }
  }
  while (left < start && /\s/.test(text[left]!)) left++;
  while (right > end && /\s/.test(text[right - 1]!)) right--;
  if (right - left > READING_LIMITS.context) {
    const spare = READING_LIMITS.context - (end - start);
    left = Math.max(left, start - Math.floor(spare / 2));
    right = Math.min(right, left + READING_LIMITS.context);
    if (right < end) { right = end; left = right - READING_LIMITS.context; }
    // Never cut a surrogate pair when limiting a very long unpunctuated paragraph.
    if (left > 0 && /[\uDC00-\uDFFF]/.test(text[left]!)) left++;
    if (right < text.length && /[\uDC00-\uDFFF]/.test(text[right]!)) right--;
  }
  return text.slice(left, right);
}

function validateReviews(value: unknown, createdAt: number): CardReview[] {
  if (!Array.isArray(value) || value.length > READING_LIMITS.reviewsPerCard) fail('複習資料無效或超過上限。');
  const reviews: CardReview[] = [];
  for (const item of value) {
    if (!object(item) || !rating(item.rating) || !timestamp(item.reviewedAt) || !timestamp(item.dueAt)
      || item.reviewedAt < createdAt || item.dueAt !== item.reviewedAt + REVIEW_INTERVALS_MS[item.rating]
      || !validDate(item.studyDate)) fail('複習日期或間隔無效。');
    // Calendar labels are kept across travel, but must be possible in a real timezone.
    const labelledMidnight = Date.parse(`${item.studyDate}T00:00:00Z`);
    if (item.reviewedAt < labelledMidnight - 14 * 3_600_000 || item.reviewedAt >= labelledMidnight + 36 * 3_600_000) fail('複習日期與時間不符。');
    reviews.push({ rating: item.rating, reviewedAt: item.reviewedAt, dueAt: item.dueAt, studyDate: item.studyDate });
  }
  reviews.sort((a, b) => a.reviewedAt - b.reviewedAt);
  for (let i = 1; i < reviews.length; i++) if (reviews[i]!.reviewedAt < reviews[i - 1]!.dueAt) fail('備份含重複或過早的複習紀錄。');
  return reviews;
}

/** Strict, all-or-nothing validation. Unknown fields never enter application state. */
export function validateReadingState(value: unknown): ReadingState {
  if (!object(value) || value.version !== 1) fail('不支援的閱讀備份版本。');
  if (!Array.isArray(value.articles) || value.articles.length > READING_LIMITS.articles
    || !Array.isArray(value.cards) || value.cards.length > READING_LIMITS.cards) fail('文章或卡片資料無效或超過上限。');
  const articles: ReadingArticle[] = [];
  const articleIds = new Set<string>();
  for (const item of value.articles) {
    if (!object(item)) fail('文章資料無效。');
    checkId(item.id); checkText(item.title, READING_LIMITS.title, '文章標題'); checkText(item.body, READING_LIMITS.body, '文章');
    checkTime(item.createdAt); checkTime(item.updatedAt);
    if (articleIds.has(item.id) || item.updatedAt < item.createdAt
      || (item.lastReadAt !== null && (!timestamp(item.lastReadAt) || item.lastReadAt < item.createdAt || item.lastReadAt > item.updatedAt))) fail('文章識別碼或日期無效。');
    articleIds.add(item.id);
    articles.push({ id: item.id, title: item.title, body: item.body, createdAt: item.createdAt, updatedAt: item.updatedAt, lastReadAt: item.lastReadAt as number | null });
  }
  const cards: ContextCard[] = [];
  const cardIds = new Set<string>();
  let reviewCount = 0;
  for (const item of value.cards) {
    if (!object(item)) fail('卡片資料無效。');
    checkId(item.id); if (item.articleId !== null) checkId(item.articleId);
    checkText(item.sourceTitle, READING_LIMITS.title, '來源標題'); checkText(item.text, READING_LIMITS.selectedText, '選取文字');
    checkText(item.context, READING_LIMITS.context, '原句'); checkText(item.meaning, READING_LIMITS.meaning, '意思', true); checkText(item.note, READING_LIMITS.note, '筆記', true);
    checkTime(item.createdAt); checkTime(item.updatedAt);
    if (cardIds.has(item.id) || item.updatedAt < item.createdAt || !/[\p{L}\p{N}]/u.test(item.text)
      || !Number.isSafeInteger(item.selectionStart) || !Number.isSafeInteger(item.selectionEnd)
      || (item.selectionStart as number) < 0 || (item.selectionEnd as number) > READING_LIMITS.body
      || (item.selectionEnd as number) - (item.selectionStart as number) !== item.text.length
      || !item.context.includes(item.text)) fail('卡片內容、識別碼或日期無效。');
    if (item.articleId !== null) {
      const source = articles.find(article => article.id === item.articleId);
      if (!source || source.body.slice(item.selectionStart as number, item.selectionEnd as number) !== item.text
        || source.title !== item.sourceTitle || item.createdAt < source.createdAt) fail('卡片與來源文章不符。');
      checkSelection(source.body, item.selectionStart as number, item.selectionEnd as number);
    }
    const reviews = validateReviews(item.reviews, item.createdAt);
    if (reviews.some(review => review.reviewedAt > (item.updatedAt as number))) fail('卡片更新時間早於複習紀錄。');
    reviewCount += reviews.length;
    if (reviewCount > READING_LIMITS.reviews) fail('複習紀錄超過備份上限。');
    cardIds.add(item.id);
    cards.push({ id: item.id, articleId: item.articleId as string | null, sourceTitle: item.sourceTitle,
      text: item.text, context: item.context, selectionStart: item.selectionStart as number, selectionEnd: item.selectionEnd as number,
      meaning: item.meaning, note: item.note, createdAt: item.createdAt, updatedAt: item.updatedAt, reviews });
  }
  return { version: 1, articles, cards };
}

export function parseReadingState(raw: string | null): ReadingLoadResult {
  if (raw === null) return { ok: true, state: createReadingState() };
  if (typeof raw !== 'string' || raw.length > READING_LIMITS.json) return { ok: false, error: '備份檔案過大或格式無效。' };
  try { return { ok: true, state: validateReadingState(JSON.parse(raw) as unknown) }; }
  catch (error) { return { ok: false, error: error instanceof SyntaxError ? '備份不是有效的 JSON。' : error instanceof Error ? error.message : '備份無效。' }; }
}
export function exportReadingState(state: ReadingState): string {
  const raw = JSON.stringify(validateReadingState(state), null, 2);
  if (raw.length > READING_LIMITS.json) fail('備份檔案超過上限。');
  return raw;
}

export function createArticle(state: ReadingState, input: { id: string; title: string; body: string }, now = Date.now()): ReadingState {
  checkTime(now); checkId(input.id); checkText(input.title, READING_LIMITS.title, '文章標題'); checkText(input.body, READING_LIMITS.body, '文章');
  if (state.articles.length >= READING_LIMITS.articles) fail('文章數量已達上限，請先備份並整理舊文章。');
  if (state.articles.some(article => article.id === input.id)) fail('文章識別碼重複。');
  return { ...state, articles: [{ id: input.id, title: input.title.trim(), body: input.body, createdAt: now, updatedAt: now, lastReadAt: null }, ...state.articles] };
}
export function markArticleRead(state: ReadingState, id: string, now = Date.now()): ReadingState {
  checkTime(now);
  const article = state.articles.find(item => item.id === id);
  if (!article || now < article.updatedAt || now === article.lastReadAt) return state;
  return { ...state, articles: state.articles.map(item => item.id === id ? { ...item, updatedAt: now, lastReadAt: now } : item) };
}
export function deleteArticle(state: ReadingState, id: string): ReadingState {
  if (!state.articles.some(article => article.id === id)) return state;
  return { ...state, articles: state.articles.filter(article => article.id !== id),
    cards: state.cards.map(card => card.articleId === id ? { ...card, articleId: null } : card) };
}
export function addContextCard(state: ReadingState, input: { id: string; articleId: string; start: number; end: number; meaning?: string; note?: string }, now = Date.now()): ReadingState {
  checkTime(now); checkId(input.id);
  const article = state.articles.find(item => item.id === input.articleId);
  if (!article) fail('找不到來源文章。');
  if (now < article.createdAt) fail('卡片日期不能早於文章。');
  checkSelection(article.body, input.start, input.end);
  const text = article.body.slice(input.start, input.end);
  checkText(text, READING_LIMITS.selectedText, '選取文字');
  if (!/[\p{L}\p{N}]/u.test(text)) fail('請選取包含文字的單字或片語。');
  const meaning = input.meaning ?? ''; const note = input.note ?? '';
  checkText(meaning, READING_LIMITS.meaning, '意思', true); checkText(note, READING_LIMITS.note, '筆記', true);
  // Repeated UI taps on the same occurrence do not produce duplicate cards.
  if (state.cards.some(card => card.articleId === input.articleId && card.selectionStart === input.start && card.selectionEnd === input.end)) return state;
  if (state.cards.some(card => card.id === input.id)) fail('卡片識別碼重複。');
  if (state.cards.length >= READING_LIMITS.cards) fail('卡片數量已達上限，請先備份並整理。');
  const card: ContextCard = { id: input.id, articleId: article.id, sourceTitle: article.title, text,
    context: extractContext(article.body, input.start, input.end), selectionStart: input.start, selectionEnd: input.end,
    meaning, note, createdAt: now, updatedAt: now, reviews: [] };
  return { ...state, cards: [card, ...state.cards] };
}
export function editContextCard(state: ReadingState, id: string, patch: { meaning?: string; note?: string }, now = Date.now()): ReadingState {
  checkTime(now);
  if (patch.meaning !== undefined) checkText(patch.meaning, READING_LIMITS.meaning, '意思', true);
  if (patch.note !== undefined) checkText(patch.note, READING_LIMITS.note, '筆記', true);
  const card = state.cards.find(item => item.id === id);
  if (!card || now < card.updatedAt) return state;
  return { ...state, cards: state.cards.map(item => item.id === id ? { ...item, meaning: patch.meaning ?? item.meaning, note: patch.note ?? item.note, updatedAt: now } : item) };
}
export function removeContextCard(state: ReadingState, id: string): ReadingState {
  if (!state.cards.some(card => card.id === id)) return state;
  return { ...state, cards: state.cards.filter(card => card.id !== id) };
}
function latest(card: ContextCard): CardReview | undefined { return card.reviews[card.reviews.length - 1]; }
export function getDueCards(state: ReadingState, now = Date.now()): ContextCard[] {
  checkTime(now);
  return state.cards.filter(card => card.createdAt <= now && (!latest(card) || latest(card)!.dueAt <= now))
    .sort((a, b) => (latest(a)?.dueAt ?? a.createdAt) - (latest(b)?.dueAt ?? b.createdAt) || a.id.localeCompare(b.id));
}
export function reviewContextCard(state: ReadingState, id: string, reviewRating: ReviewRating, now = Date.now()): ReadingState {
  checkTime(now);
  const card = state.cards.find(item => item.id === id);
  if (!card || !rating(reviewRating) || now < card.updatedAt || (latest(card)?.dueAt ?? card.createdAt) > now) return state;
  if (card.reviews.length >= READING_LIMITS.reviewsPerCard || state.cards.reduce((n, item) => n + item.reviews.length, 0) >= READING_LIMITS.reviews) fail('複習紀錄已達上限，請先匯出備份。');
  const dueAt = now + REVIEW_INTERVALS_MS[reviewRating]; checkTime(dueAt);
  const record: CardReview = { rating: reviewRating, reviewedAt: now, dueAt, studyDate: localDateKey(now) };
  return { ...state, cards: state.cards.map(item => item.id === id ? { ...item, updatedAt: now, reviews: [...item.reviews, record] } : item) };
}
export function getReadingStats(state: ReadingState, now = Date.now()): StudyStats {
  checkTime(now);
  return getStudyStats({ version: 2, savedWords: [], history: [],
    reviews: state.cards.flatMap(card => card.reviews.map(review => ({ ...review, word: card.id }))) }, now);
}

/** Additive import: absent records never delete local data; incompatible histories reject atomically. */
export function mergeReadingState(current: ReadingState, incoming: ReadingState): ReadingState {
  const local = validateReadingState(current); const imported = validateReadingState(incoming);
  const articles = new Map(local.articles.map(article => [article.id, article]));
  for (const article of imported.articles) {
    const old = articles.get(article.id);
    if (old && (old.body !== article.body || old.title !== article.title || old.createdAt !== article.createdAt)) fail('文章識別碼衝突；未匯入，現有內容保持不變。');
    if (!old || article.updatedAt > old.updatedAt) articles.set(article.id, article);
  }
  const cards = new Map(local.cards.map(card => [card.id, card]));
  for (const card of imported.cards) {
    const old = cards.get(card.id);
    if (!old) { cards.set(card.id, card); continue; }
    if (old.text !== card.text || old.context !== card.context || old.sourceTitle !== card.sourceTitle || old.createdAt !== card.createdAt
      || old.selectionStart !== card.selectionStart || old.selectionEnd !== card.selectionEnd
      || (old.articleId !== null && card.articleId !== null && old.articleId !== card.articleId)) fail('卡片來源衝突；未匯入，現有內容保持不變。');
    const reviews = new Map(old.reviews.map(review => [review.reviewedAt, review]));
    for (const review of card.reviews) {
      const prior = reviews.get(review.reviewedAt);
      if (prior && (prior.rating !== review.rating || prior.studyDate !== review.studyDate)) fail('複習紀錄衝突；未匯入，現有內容保持不變。');
      reviews.set(review.reviewedAt, review);
    }
    const newer = card.updatedAt > old.updatedAt ? card : old;
    cards.set(card.id, { ...newer, reviews: validateReviews([...reviews.values()], old.createdAt) });
  }
  return validateReadingState({ version: 1, articles: [...articles.values()], cards: [...cards.values()] });
}
