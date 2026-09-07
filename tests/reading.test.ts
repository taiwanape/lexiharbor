import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addContextCard, createArticle, createReadingState, deleteArticle, editContextCard,
  exportReadingState, extractContext, getDueCards, getReadingStats, markArticleRead,
  mergeReadingState, parseReadingState, READING_LIMITS, removeContextCard,
  reviewContextCard, tokenizeReading, type ReadingState,
} from '../src/domain/reading';
import { REVIEW_INTERVALS_MS } from '../src/domain/study';

const now = new Date(2026, 8, 7, 12).getTime();
const body = 'Dr. Chen said, “Don’t give up.”\nWe carry on with the well-known project.\n\nKeep learning!';
function article(text = body): ReadingState {
  return createArticle(createReadingState(), { id: 'a1', title: 'My article', body: text }, now);
}
function saved(text = 'give up'): ReadingState {
  const start = body.indexOf(text);
  return addContextCard(article(), { id: 'c1', articleId: 'a1', start, end: start + text.length, meaning: '放棄' }, now);
}
function roundtrip(state: ReadingState): ReadingState {
  const parsed = parseReadingState(exportReadingState(state));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.state;
}

test('new state has no fictitious content or learning statistics', () => {
  assert.deepEqual(createReadingState(), { version: 1, articles: [], cards: [] });
  assert.deepEqual(getReadingStats(createReadingState(), now), { reviewCount: 0, todayReviewCount: 0, streak: 0, knownWords: [] });
  assert.deepEqual(parseReadingState(null), { ok: true, state: createReadingState() });
  assert.notEqual(createReadingState().articles, createReadingState().articles);
});

test('arbitrary user text, whitespace, Unicode and HTML remain exact plain text', () => {
  const text = '  <script>alert("hi")</script>\n\tCafé isn’t naïve — 你好 👋!\r\n';
  const state = article(text);
  assert.equal(state.articles[0]!.body, text);
  assert.deepEqual(roundtrip(state), state);
  assert.equal(tokenizeReading(text).map(token => token.text).join(''), text);
});

test('article validation refuses empty, duplicate, oversized and invalid timestamps', () => {
  assert.throws(() => article(' \n'));
  assert.throws(() => article('a'.repeat(READING_LIMITS.body + 1)));
  assert.throws(() => createArticle(article(), { id: 'a1', title: 'Duplicate', body: 'Text' }, now));
  assert.throws(() => createArticle(createReadingState(), { id: 'a1', title: 'Text', body: 'Text' }, NaN));
  assert.throws(() => article('Null\u0000byte'));
});

test('read timestamps are monotonic and do not change creation time', () => {
  const initial = article();
  const read = markArticleRead(initial, 'a1', now + 1000);
  assert.equal(initial.articles[0]!.lastReadAt, null);
  assert.equal(read.articles[0]!.lastReadAt, now + 1000);
  assert.equal(read.articles[0]!.createdAt, now);
  assert.equal(markArticleRead(read, 'a1', now), read);
  assert.deepEqual(roundtrip(read), read);
});

test('tokens preserve offsets, apostrophes, Unicode hyphens and decomposed accents', () => {
  const text = 'Don’t\tstop!\r\nwell-known non‑stop lʼami cafe\u0301 42 👩‍💻';
  const tokens = tokenizeReading(text);
  assert.equal(tokens.map(token => token.text).join(''), text);
  assert.deepEqual(tokens.filter(token => token.isWord).map(token => token.text), ['Don’t', 'stop', 'well-known', 'non‑stop', 'lʼami', 'cafe\u0301', '42']);
  for (const [index, token] of tokens.entries()) {
    assert.equal(text.slice(token.start, token.end), token.text);
    assert.equal(token.start, index === 0 ? 0 : tokens[index - 1]!.end);
  }
  assert.deepEqual(tokenizeReading(''), []);
});

test('context preserves full sentence including quotes and common abbreviations', () => {
  const start = body.indexOf('give up');
  assert.equal(extractContext(body, start, start + 7), 'Dr. Chen said, “Don’t give up.”');
  const next = body.indexOf('well-known');
  assert.equal(extractContext(body, next, next + 10), 'We carry on with the well-known project.');
});

test('phrases spanning sentences retain both sentences and exact selected substring', () => {
  const text = 'One ends here. Another starts now. Third sentence.';
  const start = text.indexOf('here'); const end = text.indexOf('now') + 3;
  assert.equal(extractContext(text, start, end), 'One ends here. Another starts now.');
  const state = addContextCard(article(text), { id: 'phrase', articleId: 'a1', start, end }, now);
  assert.equal(state.cards[0]!.text, text.slice(start, end));
  assert.deepEqual(roundtrip(state), state);
});

test('long context is bounded without losing the selected phrase', () => {
  const text = 'x '.repeat(6000) + 'important phrase' + ' y'.repeat(6000);
  const start = text.indexOf('important');
  const context = extractContext(text, start, start + 16);
  assert.ok(context.length <= READING_LIMITS.context);
  assert.ok(context.includes('important phrase'));
});

test('invalid ranges, punctuation-only and split surrogate selections are rejected', () => {
  assert.throws(() => extractContext(body, -1, 2));
  assert.throws(() => extractContext(body, 3, 3));
  assert.throws(() => extractContext(body, 0, body.length + 1));
  assert.throws(() => extractContext('👋 hello', 1, 4));
  assert.throws(() => addContextCard(article('...'), { id: 'c', articleId: 'a1', start: 0, end: 3 }, now));
});

test('contextual card supports arbitrary vocabulary, exact case and duplicate-tap protection', () => {
  const initial = article('Quantum entanglement is fascinating.');
  const state = addContextCard(initial, { id: 'c1', articleId: 'a1', start: 0, end: 20, meaning: '量子糾纏', note: '自己的筆記' }, now);
  assert.equal(state.cards[0]!.text, 'Quantum entanglement');
  assert.equal(state.cards[0]!.note, '自己的筆記');
  assert.equal(initial.cards.length, 0);
  assert.equal(addContextCard(state, { id: 'c2', articleId: 'a1', start: 0, end: 20 }, now + 1), state);
  assert.deepEqual(roundtrip(state), state);
});

test('edit and removal are immutable, and old clocks cannot overwrite newer notes', () => {
  const original = saved();
  const edited = editContextCard(original, 'c1', { meaning: '不再嘗試', note: '<b>not HTML</b>' }, now + 10);
  assert.equal(original.cards[0]!.meaning, '放棄');
  assert.equal(edited.cards[0]!.note, '<b>not HTML</b>');
  assert.equal(editContextCard(edited, 'c1', { note: 'stale' }, now), edited);
  assert.equal(removeContextCard(edited, 'c1').cards.length, 0);
  assert.equal(edited.cards.length, 1);
});

test('deleting an article retains cards, source title, original context and reviews', () => {
  const before = reviewContextCard(saved(), 'c1', 'good', now);
  const after = deleteArticle(before, 'a1');
  assert.equal(after.articles.length, 0);
  assert.equal(after.cards[0]!.articleId, null);
  assert.equal(after.cards[0]!.sourceTitle, 'My article');
  assert.equal(after.cards[0]!.context, before.cards[0]!.context);
  assert.deepEqual(after.cards[0]!.reviews, before.cards[0]!.reviews);
  assert.deepEqual(roundtrip(after), after);
});

test('actual again/good/easy intervals survive export and enforce exact due boundary', () => {
  for (const rating of ['again', 'good', 'easy'] as const) {
    const initial = saved();
    assert.equal(getDueCards(initial, now).length, 1);
    const state = roundtrip(reviewContextCard(initial, 'c1', rating, now));
    assert.equal(state.cards[0]!.reviews[0]!.dueAt, now + REVIEW_INTERVALS_MS[rating]);
    assert.equal(getDueCards(state, now + REVIEW_INTERVALS_MS[rating] - 1).length, 0);
    assert.equal(getDueCards(state, now + REVIEW_INTERVALS_MS[rating]).length, 1);
  }
});

test('double taps, stale clocks and nonexistent cards cannot add reviews', () => {
  const once = reviewContextCard(saved(), 'c1', 'again', now);
  assert.equal(reviewContextCard(once, 'c1', 'good', now), once);
  assert.equal(reviewContextCard(once, 'c1', 'easy', now - 1), once);
  assert.equal(reviewContextCard(once, 'missing', 'good', now + 60_000), once);
  assert.equal(reviewContextCard(once, 'c1', 'good', now + 60_000).cards[0]!.reviews.length, 2);
  assert.throws(() => getDueCards(once, NaN));
});

test('real statistics count by local day and omit future reviews after clock rollback', () => {
  const initial = saved();
  const state = reviewContextCard(initial, 'c1', 'good', now);
  assert.equal(getReadingStats(state, now).todayReviewCount, 1);
  assert.equal(getReadingStats(state, now).streak, 1);
  assert.equal(getReadingStats(state, now + 86_400_000).todayReviewCount, 0);
  assert.equal(getReadingStats(state, now - 1).reviewCount, 0);
  assert.equal(getDueCards(initial, now - 1).length, 0);
});

test('malformed roots, unknown revisions and oversized JSON reject without replacement state', () => {
  for (const raw of ['', '{invalid', 'null', '[]', '{}', '{"version":2,"articles":[],"cards":[]}', '{"version":1,"articles":[],"cards":null}', ' '.repeat(READING_LIMITS.json + 1)]) {
    const result = parseReadingState(raw);
    assert.equal(result.ok, false);
    assert.equal('state' in result, false);
  }
});

test('one malformed item rejects an entire otherwise valid backup, including duplicate identifiers', () => {
  const state = saved();
  const variants = [
    { ...state, cards: [...state.cards, null] },
    { ...state, cards: [...state.cards, state.cards[0]] },
    { ...state, articles: [...state.articles, state.articles[0]] },
    { ...state, cards: [{ ...state.cards[0], text: 'fake selection' }] },
    { ...state, cards: [{ ...state.cards[0], articleId: 'missing' }] },
    { ...state, cards: [{ ...state.cards[0], meaning: 'x'.repeat(READING_LIMITS.meaning + 1) }] },
  ];
  for (const variant of variants) assert.equal(parseReadingState(JSON.stringify(variant)).ok, false);
});

test('invalid or duplicate/early imported reviews reject atomically instead of discarding records', () => {
  const state = reviewContextCard(saved(), 'c1', 'again', now);
  const record = state.cards[0]!.reviews[0]!;
  for (const reviews of [
    [record, record],
    [record, { ...record, reviewedAt: now + 1, dueAt: now + 60_001 }],
    [{ ...record, dueAt: now + 2 }],
    [{ ...record, studyDate: '2026-02-30' }],
    [{ ...record, studyDate: '2020-01-01' }],
    [{ ...record, rating: 'paid' }],
  ]) assert.equal(parseReadingState(JSON.stringify({ ...state, cards: [{ ...state.cards[0], reviews }] })).ok, false);
});

test('unknown object properties cannot smuggle premium flags or prototype changes into state', () => {
  const json = JSON.stringify({ ...saved(), isPremium: true }).replace('"version":1', '"version":1,"__proto__":{"polluted":true}');
  const result = parseReadingState(json);
  assert.ok(result.ok);
  assert.equal('isPremium' in result.state, false);
  assert.equal(Object.hasOwn(result.state, '__proto__'), false);
  assert.equal('polluted' in {}, false);
});

test('additive imports preserve local articles, notes and reviews absent from an older backup', () => {
  const old = saved();
  let current = editContextCard(old, 'c1', { note: 'Newest note' }, now + 10);
  current = reviewContextCard(current, 'c1', 'good', now + 20);
  current = createArticle(current, { id: 'a2', title: 'New article', body: 'Keep me.' }, now + 30);
  const merged = mergeReadingState(current, old);
  assert.equal(merged.articles.length, 2);
  assert.equal(merged.cards[0]!.note, 'Newest note');
  assert.equal(merged.cards[0]!.reviews.length, 1);
  assert.deepEqual(mergeReadingState(current, createReadingState()), current);
  assert.deepEqual(roundtrip(merged), merged);
});

test('compatible newer import adds review history and notes without removing local data', () => {
  const old = reviewContextCard(saved(), 'c1', 'again', now);
  let incoming = reviewContextCard(old, 'c1', 'good', now + 60_000);
  incoming = editContextCard(incoming, 'c1', { note: 'Updated elsewhere' }, now + 60_001);
  const merged = mergeReadingState(old, incoming);
  assert.equal(merged.cards[0]!.reviews.length, 2);
  assert.equal(merged.cards[0]!.note, 'Updated elsewhere');
  assert.deepEqual(mergeReadingState(merged, incoming), merged);
});

test('colliding article content and incompatible review histories refuse merge and preserve inputs', () => {
  const initial = saved();
  assert.throws(() => mergeReadingState(initial, article('Different content using same ID.')));
  const first = reviewContextCard(initial, 'c1', 'again', now);
  const second = reviewContextCard(initial, 'c1', 'good', now);
  assert.throws(() => mergeReadingState(first, second));
  assert.equal(initial.cards[0]!.reviews.length, 0);
  assert.equal(first.cards[0]!.reviews[0]!.rating, 'again');
});
