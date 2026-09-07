import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyWord, findLearningWord, searchChineseEntries, searchLearningWords } from '../src/domain/search';
import sample from '../public/data/cedict-sample.json';

test('English and Chinese queries locate the same authored learning word', () => {
  assert.equal(searchLearningWords(' ＡＰＰＬＥ ')[0]?.word, 'apple');
  assert.equal(searchLearningWords('蘋果')[0]?.word, 'apple');
  assert.equal(searchLearningWords('好奇')[0]?.word, 'curious');
});
test('inflected and multiword queries resolve to a learning headword', () => {
  assert.equal(searchLearningWords('went')[0]?.word, 'go');
  assert.equal(searchLearningWords('running')[0]?.word, 'run');
  assert.equal(searchLearningWords(' TAKE   OFF ')[0]?.word, 'take off');
});
test('unknown queries are not filled with unrelated results', () => {
  assert.deepEqual(searchLearningWords('qzxnovocab'), []);
  assert.deepEqual(searchChineseEntries(sample.entries, 'qzxnovocab'), []);
  for (const query of ['[', '.*', '(a+)+$']) assert.doesNotThrow(() => searchChineseEntries(sample.entries, query));
});
test('reference search ranks direct Chinese headwords and avoids substring false matches', () => {
  assert.equal(searchChineseEntries(sample.entries, '銀行')[0]?.traditional, '銀行');
  const apples = searchChineseEntries(sample.entries, 'apple');
  assert.ok(apples.some((entry) => entry.traditional === '蘋果'));
  assert.ok(!apples.some((entry) => entry.traditional === '鳳梨'));
});
test('daily word stays stable within a local day and changes across midnight', () => {
  assert.equal(dailyWord(new Date(2026, 8, 7, 0))?.id, dailyWord(new Date(2026, 8, 7, 23, 59))?.id);
  assert.notEqual(dailyWord(new Date(2026, 8, 7, 23, 59))?.id, dailyWord(new Date(2026, 8, 8, 0))?.id);
});
test('saved headwords and stable source IDs both open the same detail', () => {
  const word = findLearningWord('bank');
  assert.ok(word);
  assert.equal(findLearningWord(word.id), word);
  assert.equal(findLearningWord('unknown-saved-word'), undefined);
});
