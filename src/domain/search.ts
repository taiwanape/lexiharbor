import { learningSample, LearningEntry } from '../data/learningSample';

export function normalizeQuery(query: string): string {
  return query.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function searchLearningWords(query: string, limit = 40): LearningEntry[] {
  const q = normalizeQuery(query);
  if (!q) return learningSample.slice(0, limit);
  return learningSample.map((entry, index) => {
    const word = normalizeQuery(entry.word);
    const score = word === q ? 0 : entry.forms.includes(q) ? 1 : word.startsWith(q) ? 2
      : entry.translation.includes(q) ? 3 : word.includes(q) ? 4 : entry.synonyms.includes(q) ? 5 : -1;
    return { entry, score, index };
  }).filter((item) => item.score >= 0).sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit).map((item) => item.entry);
}

export function findLearningWord(word: string): LearningEntry | undefined {
  const q = normalizeQuery(word);
  return learningSample.find((entry) => entry.word === q || entry.id === word);
}

export function dailyWord(now = new Date()): LearningEntry | undefined {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return learningSample[((day % learningSample.length) + learningSample.length) % learningSample.length];
}

export type ChineseEntry = { id: string; traditional: string; simplified: string; pinyin: string; definitions: string[] };
export type ChineseSample = { schemaVersion: number; sourceId: string; license: string; direction: string; entries: ChineseEntry[] };

export function searchChineseEntries(entries: ChineseEntry[], query: string, limit = 40): ChineseEntry[] {
  const q = normalizeQuery(query);
  if (!q) return entries.slice(0, 20);
  const chinese = /[\u3400-\u9fff]/.test(q);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const englishMatch = new RegExp(`(?:^|[^a-z])${escaped}(?=$|[^a-z])`, 'i');
  return entries.map((entry, index) => ({ entry, index, score: chinese
    ? entry.traditional === q || entry.simplified === q ? 0 : entry.traditional.startsWith(q) || entry.simplified.startsWith(q) ? 1 : entry.traditional.includes(q) || entry.simplified.includes(q) ? 2 : -1
    : entry.definitions.some((text) => normalizeQuery(text).replace(/^to /, '') === q) ? 0 : entry.definitions.some((text) => englishMatch.test(text)) ? 1 : -1
  })).filter((item) => item.score >= 0).sort((a, b) => a.score - b.score || a.index - b.index).slice(0, limit).map((item) => item.entry);
}
