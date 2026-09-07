import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialStudyState,
  getDueWords,
  getStudyStats,
  localDateKey,
  normalizeStoredState,
  parseStoredState,
  recordReview,
  rememberSearch,
  REVIEW_INTERVALS_MS,
  toggleSavedWord,
} from '../src/domain/study';

const at = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).getTime();

test('new learners start with empty, independent data and zero statistics', () => {
  const state = createInitialStudyState();
  assert.deepEqual(state, { version: 2, savedWords: [], history: [], reviews: [] });
  assert.deepEqual(getStudyStats(state, at(2026, 9, 7)), { reviewCount: 0, todayReviewCount: 0, streak: 0, knownWords: [] });
  assert.notEqual(state.savedWords, createInitialStudyState().savedWords);
});

test('favorites and history normalize words, deduplicate, and preserve original state', () => {
  const original = createInitialStudyState();
  let state = toggleSavedWord(original, ' Apple ');
  assert.deepEqual(state.savedWords, ['apple']);
  assert.deepEqual(toggleSavedWord(state, 'APPLE').savedWords, []);
  assert.deepEqual(original.savedWords, []);
  for (let i = 0; i < 40; i += 1) state = rememberSearch(state, `word${i}`);
  state = rememberSearch(state, ' word20 ');
  assert.equal(state.history.length, 30);
  assert.equal(state.history[0], 'word20');
  assert.equal(state.history.filter((word) => word === 'word20').length, 1);
  assert.equal(toggleSavedWord(state, ''), state);
});

test('each rating schedules its actual displayed interval and survives reload', () => {
  const now = at(2026, 9, 7);
  for (const rating of ['again', 'good', 'easy'] as const) {
    const state = recordReview(createInitialStudyState(), 'apple', rating, now);
    assert.equal(state.reviews[0]?.dueAt, now + REVIEW_INTERVALS_MS[rating]);
    assert.deepEqual(getDueWords(state, ['apple'], now + REVIEW_INTERVALS_MS[rating] - 1), []);
    assert.deepEqual(getDueWords(state, ['apple'], now + REVIEW_INTERVALS_MS[rating]), ['apple']);
    const restored = parseStoredState(JSON.stringify(state));
    assert.equal(restored.status, 'loaded');
    assert.deepEqual(restored.state, state);
  }
});

test('empty and not-yet-due decks stay empty; unseen words are immediately due', () => {
  const now = at(2026, 9, 7);
  const state = recordReview(createInitialStudyState(), 'apple', 'good', now);
  assert.deepEqual(getDueWords(state, [], now), []);
  assert.deepEqual(getDueWords(state, ['apple'], now), []);
  assert.deepEqual(getDueWords(state, ['Apple', 'bank', ' bank '], now), ['bank']);
});

test('repeated taps and a stale earlier clock cannot double-count a review', () => {
  const now = at(2026, 9, 7);
  const once = recordReview(createInitialStudyState(), 'apple', 'again', now);
  assert.equal(recordReview(once, 'apple', 'easy', now), once);
  assert.equal(recordReview(once, 'apple', 'good', now - 1000), once);
  assert.equal(recordReview(once, 'apple', 'again', now + 59_999), once);
  const twice = recordReview(once, 'apple', 'good', now + 60_000);
  assert.equal(twice.reviews.length, 2);
  assert.equal(getStudyStats(twice, now + 60_000).todayReviewCount, 2);
});

test('today counts real reviews beyond ten and resets at local midnight', () => {
  const now = at(2026, 9, 7, 23);
  let state = createInitialStudyState();
  for (let i = 0; i < 13; i += 1) state = recordReview(state, `word${i}`, 'good', now);
  assert.equal(getStudyStats(state, now).todayReviewCount, 13);
  assert.equal(getStudyStats(state, at(2026, 9, 8, 0)).todayReviewCount, 0);
  assert.equal(getStudyStats(state, at(2026, 9, 8, 0)).reviewCount, 13);
});

test('streak crosses month/year, survives the following day, and restarts after a gap', () => {
  let state = recordReview(createInitialStudyState(), 'one', 'good', at(2025, 12, 30));
  state = recordReview(state, 'two', 'good', at(2025, 12, 31));
  state = recordReview(state, 'three', 'good', at(2026, 1, 1));
  assert.equal(getStudyStats(state, at(2026, 1, 1)).streak, 3);
  assert.equal(getStudyStats(state, at(2026, 1, 2)).streak, 3);
  assert.equal(getStudyStats(state, at(2026, 1, 3)).streak, 0);
  state = recordReview(state, 'four', 'good', at(2026, 1, 3));
  assert.equal(getStudyStats(state, at(2026, 1, 3)).streak, 1);
});

test('calendar day differences handle leap years and daylight-saving transitions', () => {
  let state = recordReview(createInitialStudyState(), 'one', 'good', at(2024, 2, 28));
  state = recordReview(state, 'two', 'good', at(2024, 2, 29));
  state = recordReview(state, 'three', 'good', at(2024, 3, 1));
  assert.equal(getStudyStats(state, at(2024, 3, 1)).streak, 3);
  let spring = recordReview(createInitialStudyState(), 'one', 'good', at(2026, 3, 7));
  spring = recordReview(spring, 'two', 'good', at(2026, 3, 8));
  spring = recordReview(spring, 'three', 'good', at(2026, 3, 9));
  assert.equal(getStudyStats(spring, at(2026, 3, 9)).streak, 3);
});

test('date labels use local calendar fields, not the UTC timestamp prefix', () => {
  const now = at(2026, 9, 7, 0);
  assert.equal(localDateKey(now), '2026-09-07');
  assert.equal(recordReview(createInitialStudyState(), 'apple', 'good', now).reviews[0]?.studyDate, '2026-09-07');
});

test('historical local dates are retained when imported after travel', () => {
  const reviewedAt = Date.parse('2026-09-06T16:30:00Z');
  const state = normalizeStoredState({
    version: 2, savedWords: [], history: [],
    reviews: [{ word: 'apple', rating: 'good', reviewedAt, dueAt: reviewedAt + REVIEW_INTERVALS_MS.good, studyDate: '2026-09-07' }],
  }).state;
  assert.equal(state.reviews[0]?.studyDate, '2026-09-07');
});

test('latest rating determines known words, so forgotten cards do not remain mastered', () => {
  const now = at(2026, 9, 7);
  let state = recordReview(createInitialStudyState(), 'apple', 'easy', now);
  assert.deepEqual(getStudyStats(state, now).knownWords, ['apple']);
  state = recordReview(state, 'apple', 'again', now + REVIEW_INTERVALS_MS.easy);
  assert.deepEqual(getStudyStats(state, now + REVIEW_INTERVALS_MS.easy).knownWords, []);
});

test('v1 migration retains valid lists and legacy counters without inventing reviews or premium', () => {
  const loaded = normalizeStoredState({
    savedWords: ['apple', false, ' BANK ', 'apple', null],
    history: ['curious', 42, ''],
    reviewCount: 98,
    streak: 3,
    lastStudyDate: '2026-9-7',
    knownWords: ['apple'],
    isPremium: true,
  });
  assert.equal(loaded.status, 'migrated');
  assert.deepEqual(loaded.state.savedWords, ['apple', 'bank']);
  assert.deepEqual(loaded.state.history, ['curious']);
  assert.deepEqual(loaded.state.legacyCounters, { reviewCount: 98, streak: 3, lastStudyDate: '2026-09-07' });
  assert.deepEqual(loaded.state.reviews, []);
  assert.equal('isPremium' in loaded.state, false);
  assert.equal(getStudyStats(loaded.state, at(2026, 9, 7)).streak, 0);
  assert.equal(getStudyStats(loaded.state, at(2026, 9, 7)).reviewCount, 0);
  assert.ok(loaded.issues.includes('savedWords'));
});

test('invalid JSON, unsupported versions, and malformed root fields are rejected', () => {
  assert.equal(parseStoredState(null).status, 'empty');
  for (const raw of ['', '{bad json', 'null', '[]', 'true', '{}', '{"savedWords":"apple","history":[]}']) {
    assert.equal(parseStoredState(raw).status, 'invalid', raw);
  }
  assert.equal(normalizeStoredState({ version: 3, savedWords: [], history: [] }).status, 'invalid');
  assert.equal(normalizeStoredState({ version: 2, savedWords: [], history: [], reviews: {} }).status, 'invalid');
});

test('bad legacy counters and impossible dates are dropped, not coerced', () => {
  const loaded = normalizeStoredState({ savedWords: [], history: [], reviewCount: '100', streak: -1, lastStudyDate: '2026-02-30' });
  assert.equal(loaded.status, 'migrated');
  assert.equal(loaded.state.legacyCounters, undefined);
  assert.equal(loaded.issues.length, 3);
});

test('v2 validation removes malformed/duplicate/early reviews and ignores unknown properties', () => {
  const now = at(2026, 9, 7);
  const record = recordReview(createInitialStudyState(), 'apple', 'again', now).reviews[0]!;
  const later = { ...record, reviewedAt: now + 60_000, dueAt: now + 120_000 };
  const loaded = normalizeStoredState({
    version: 2, savedWords: ['apple'], history: [], isPremium: true,
    reviews: [later, record, record, { ...record, reviewedAt: now + 1, dueAt: now + 60_001 },
      { ...record, rating: 'excellent' }, { ...record, reviewedAt: String(now) },
      { ...record, dueAt: -1 }, { ...record, studyDate: '2026-02-30' }, null],
  });
  assert.equal(loaded.status, 'loaded');
  assert.deepEqual(loaded.state.reviews, [record, later]);
  assert.equal('isPremium' in loaded.state, false);
  assert.ok(loaded.issues.includes('reviews'));
});

test('future reviews do not inflate statistics after clock rollback', () => {
  const now = at(2026, 9, 7);
  const state = recordReview(createInitialStudyState(), 'apple', 'easy', now + 60_000);
  assert.deepEqual(getStudyStats(state, now), { reviewCount: 0, todayReviewCount: 0, streak: 0, knownWords: [] });
  assert.throws(() => getDueWords(state, ['apple'], NaN), RangeError);
});
