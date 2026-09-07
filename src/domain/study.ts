import type { ReviewRating } from '../types';

export const REVIEW_INTERVALS_MS: Readonly<Record<ReviewRating, number>> = {
  again: 60 * 1000,
  good: 3 * 24 * 60 * 60 * 1000,
  easy: 7 * 24 * 60 * 60 * 1000,
};

export type ReviewRecord = {
  word: string;
  rating: ReviewRating;
  reviewedAt: number;
  dueAt: number;
  /** The learner's local calendar date when the review was recorded. */
  studyDate: string;
};

export type LegacyCounters = {
  reviewCount?: number;
  streak?: number;
  lastStudyDate?: string;
};

export type StudyState = {
  version: 2;
  savedWords: string[];
  history: string[];
  reviews: ReviewRecord[];
  /** Informational only: v1 did not record enough evidence to reconstruct reviews. */
  legacyCounters?: LegacyCounters;
};

export type StateLoadResult = {
  state: StudyState;
  status: 'empty' | 'loaded' | 'migrated' | 'invalid';
  issues: string[];
};

export type StudyStats = {
  reviewCount: number;
  todayReviewCount: number;
  streak: number;
  knownWords: string[];
  lastStudyDate?: string;
};

export function createInitialStudyState(): StudyState {
  return { version: 2, savedWords: [], history: [], reviews: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    && value >= 0 && value <= 8_640_000_000_000_000;
}

function requireTimestamp(now: number): void {
  if (!isTimestamp(now)) throw new RangeError('Invalid study timestamp');
}

function normalizeWord(value: unknown): string | undefined {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const word = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return word.length > 0 && word.length <= 120 ? word : undefined;
}

function normalizeWords(values: unknown[], issues?: string[], field?: string): string[] {
  const words: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const word = normalizeWord(value);
    if (!word) {
      if (issues && field && !issues.includes(field)) issues.push(field);
      continue;
    }
    if (!seen.has(word)) {
      words.push(word);
      seen.add(word);
    }
  }
  return words;
}

export function localDateKey(now: number = Date.now()): string {
  requireTimestamp(now);
  const date = new Date(now);
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/** UTC is used only for comparing calendar labels, never for deciding today's date. */
function dateOrdinal(value: unknown, allowUnpadded = false): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = (allowUnpadded ? /^(\d{4})-(\d{1,2})-(\d{1,2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/).exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return Math.floor(date.getTime() / 86_400_000);
}

function normalizeLegacyCounters(value: unknown, issues: string[]): LegacyCounters | undefined {
  if (!isObject(value)) return undefined;
  const legacy: LegacyCounters = {};
  for (const field of ['reviewCount', 'streak'] as const) {
    const counter = value[field];
    if (counter === undefined) continue;
    if (typeof counter === 'number' && Number.isSafeInteger(counter) && counter >= 0) {
      legacy[field] = counter;
    } else {
      issues.push(`legacyCounters.${field}`);
    }
  }
  if (value.lastStudyDate !== undefined) {
    const ordinal = dateOrdinal(value.lastStudyDate, true);
    if (ordinal !== undefined) legacy.lastStudyDate = new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
    else issues.push('legacyCounters.lastStudyDate');
  }
  return Object.keys(legacy).length > 0 ? legacy : undefined;
}

function invalidState(issue: string): StateLoadResult {
  return { state: createInitialStudyState(), status: 'invalid', issues: [issue] };
}

/** Validate persisted or imported JSON; never spread unknown fields into app state. */
export function normalizeStoredState(value: unknown): StateLoadResult {
  if (!isObject(value)) return invalidState('state');
  const version = value.version;
  if (version !== undefined && version !== 1 && version !== 2) return invalidState('version');
  if (!Array.isArray(value.savedWords) || !Array.isArray(value.history)) return invalidState('wordLists');
  if (version === 2 && !Array.isArray(value.reviews)) return invalidState('reviews');

  const issues: string[] = [];
  const state: StudyState = {
    version: 2,
    savedWords: normalizeWords(value.savedWords, issues, 'savedWords'),
    history: normalizeWords(value.history, issues, 'history').slice(0, 30),
    reviews: [],
  };

  if (version !== 2) {
    const legacyCounters = normalizeLegacyCounters(value, issues);
    if (legacyCounters) state.legacyCounters = legacyCounters;
    return { state, status: 'migrated', issues };
  }

  const seen = new Set<string>();
  for (const item of value.reviews as unknown[]) {
    if (!isObject(item)) {
      if (!issues.includes('reviews')) issues.push('reviews');
      continue;
    }
    const word = normalizeWord(item.word);
    const rating = item.rating;
    if (!word || (rating !== 'again' && rating !== 'good' && rating !== 'easy')
      || !isTimestamp(item.reviewedAt) || !isTimestamp(item.dueAt)
      || item.dueAt !== item.reviewedAt + REVIEW_INTERVALS_MS[rating]
      || dateOrdinal(item.studyDate) === undefined) {
      if (!issues.includes('reviews')) issues.push('reviews');
      continue;
    }
    const key = `${word}\u0000${item.reviewedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    state.reviews.push({ word, rating, reviewedAt: item.reviewedAt, dueAt: item.dueAt, studyDate: item.studyDate as string });
  }
  state.reviews.sort((a, b) => a.reviewedAt - b.reviewedAt);
  const latestDue = new Map<string, number>();
  state.reviews = state.reviews.filter((record) => {
    const previousDue = latestDue.get(record.word);
    if (previousDue !== undefined && record.reviewedAt < previousDue) {
      if (!issues.includes('reviews')) issues.push('reviews');
      return false;
    }
    latestDue.set(record.word, record.dueAt);
    return true;
  });
  const legacyCounters = normalizeLegacyCounters(value.legacyCounters, issues);
  if (legacyCounters) state.legacyCounters = legacyCounters;
  return { state, status: 'loaded', issues };
}

export function parseStoredState(raw: string | null): StateLoadResult {
  if (raw === null) return { state: createInitialStudyState(), status: 'empty', issues: [] };
  if (typeof raw !== 'string') return invalidState('json');
  try {
    return normalizeStoredState(JSON.parse(raw) as unknown);
  } catch {
    return invalidState('json');
  }
}

export function rememberSearch(state: StudyState, value: string): StudyState {
  const word = normalizeWord(value);
  if (!word) return state;
  return { ...state, history: [word, ...state.history.filter((item) => item !== word)].slice(0, 30) };
}

export function toggleSavedWord(state: StudyState, value: string): StudyState {
  const word = normalizeWord(value);
  if (!word) return state;
  return {
    ...state,
    savedWords: state.savedWords.includes(word)
      ? state.savedWords.filter((item) => item !== word)
      : [word, ...state.savedWords],
  };
}

function latestReviews(state: StudyState): Map<string, ReviewRecord> {
  const latest = new Map<string, ReviewRecord>();
  for (const record of state.reviews) {
    const previous = latest.get(record.word);
    if (!previous || previous.reviewedAt < record.reviewedAt) latest.set(record.word, record);
  }
  return latest;
}

/** Unseen cards are due immediately; callers control the deck through candidates. */
export function getDueWords(state: StudyState, candidates: readonly string[], now: number = Date.now()): string[] {
  requireTimestamp(now);
  const latest = latestReviews(state);
  return normalizeWords([...candidates]).filter((word) => {
    const review = latest.get(word);
    return !review || review.dueAt <= now;
  });
}

/** Reject an already scheduled card, including stale renders and accidental double taps. */
export function recordReview(state: StudyState, value: string, rating: ReviewRating, now: number = Date.now()): StudyState {
  requireTimestamp(now);
  const word = normalizeWord(value);
  if (!word || (rating !== 'again' && rating !== 'good' && rating !== 'easy')) return state;
  const latest = latestReviews(state).get(word);
  if (latest && latest.dueAt > now) return state;
  const dueAt = now + REVIEW_INTERVALS_MS[rating];
  requireTimestamp(dueAt);
  return {
    ...state,
    reviews: [...state.reviews, { word, rating, reviewedAt: now, dueAt, studyDate: localDateKey(now) }],
  };
}

export function getStudyStats(state: StudyState, now: number = Date.now()): StudyStats {
  const today = localDateKey(now);
  const todayOrdinal = dateOrdinal(today)!;
  // Records later than the injected clock do not count as completed learning.
  const completed = state.reviews.filter((record) => record.reviewedAt <= now);
  const days = new Set(completed.map((record) => dateOrdinal(record.studyDate)).filter((day): day is number => day !== undefined && day <= todayOrdinal));
  let cursor = days.has(todayOrdinal) ? todayOrdinal : todayOrdinal - 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  const latest = latestReviews({ ...state, reviews: completed });
  const lastRecord = completed.reduce<ReviewRecord | undefined>((last, record) => !last || record.reviewedAt > last.reviewedAt ? record : last, undefined);
  return {
    reviewCount: completed.length,
    todayReviewCount: completed.filter((record) => record.studyDate === today).length,
    streak,
    knownWords: [...latest.values()].filter((record) => record.rating === 'easy').map((record) => record.word),
    ...(lastRecord ? { lastStudyDate: lastRecord.studyDate } : {}),
  };
}
