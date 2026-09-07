import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCedict } from '../scripts/corpus-build.mjs';
import { searchCorpus } from '../scripts/corpus-search.mjs';

const data = JSON.parse(readFileSync(new URL('../public/data/cedict-sample.json', import.meta.url), 'utf8'));
const source = JSON.parse(readFileSync(new URL('../public/data/cedict-source.json', import.meta.url), 'utf8'));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
type SourceRecord = { sourceLine: string; id: string; traditional: string; simplified: string; pinyin: string; definitions: string[] };

test('distributed sample, source records and full license match the pinned provenance', () => {
  for (const record of [source.sample, source.license, source.redistributableSource]) {
    assert.equal(digest(readFileSync(new URL(`../${record.path}`, import.meta.url))), record.sha256);
  }
  const original = parseCedict(readFileSync(new URL(`../${source.redistributableSource.path}`, import.meta.url), 'utf8'));
  assert.equal(original.length, data.entries.length);
  assert.deepEqual(original.map(({ sourceLine, ...entry }: SourceRecord) => entry), data.entries);
  assert.ok(data.entries.length >= 300 && data.entries.length <= 500);
  assert.equal(new Set(data.entries.map((entry: { id: string }) => entry.id)).size, data.entries.length);
  const license = readFileSync(new URL(`../${source.license.path}`, import.meta.url), 'utf8');
  assert.match(license, /Section 8 -- Interpretation\./);
  assert.ok(license.length > 20000);
});

test('parser rejects corrupt input instead of silently dropping data', () => {
  assert.throws(() => parseCedict('invalid source record'), /Unsupported CEDICT line/);
  assert.equal(parseCedict('# comment\n蘋果 苹果 [ping2 guo3] /apple/')[0]?.traditional, '蘋果');
});

test('Chinese exact lookup and English reverse lookup remain distinguishable', () => {
  const chinese = searchCorpus(data.entries, '好奇');
  assert.equal(chinese.queryKind, 'zh-headword');
  assert.equal(chinese.results[0]?.entry.traditional, '好奇');
  const english = searchCorpus(data.entries, '  APPLE  ');
  assert.equal(english.queryKind, 'en-definition-reverse');
  assert.equal(english.results[0]?.entry.traditional, '蘋果');
});

test('reference matching does not match apple inside pineapple or execute regular expressions', () => {
  const entries = [{ id: 'a', traditional: '鳳梨', simplified: '凤梨', pinyin: 'feng4 li2', definitions: ['pineapple'] }];
  assert.equal(searchCorpus(entries, 'apple').total, 0);
  assert.equal(searchCorpus(entries, '.*').total, 0);
  assert.equal(searchCorpus(entries, ' ').total, 0);
});

test('explicit irregular mapping is visible and retrieves a base-form candidate', () => {
  const result = searchCorpus(data.entries, 'went');
  assert.equal(result.normalizedQuery, 'go');
  assert.equal(result.inflectionUsed, true);
  assert.ok(result.results.some(({ entry }) => entry.traditional === '去'));
  assert.equal(searchCorpus(data.entries, 'zzqvtest0001').total, 0);
});

test('evaluation contains 300 distinct queries and does not claim semantic accuracy', () => {
  const result = JSON.parse(readFileSync(new URL('../data-evaluation/results.json', import.meta.url), 'utf8'));
  assert.equal(result.results.length, 300);
  assert.equal(new Set(result.results.map((row: { query: string }) => row.query)).size, 300);
  assert.equal(result.qualityReview.semanticAccuracy, null);
  assert.equal(result.qualityReview.fullyHumanReviewed, false);
  assert.equal(result.overview.sampleWithInflections.queryCount, 280);
  assert.equal(result.overview.sampleWithInflections.expectedEmptyCount, 20);
});
