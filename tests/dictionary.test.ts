import assert from 'node:assert/strict';
import test from 'node:test';
import { getWord, searchWords, WORDS } from '../src/data/dictionary';

test('searches by English prefix', () => {
  assert.deepEqual(searchWords('resi').map((item) => item.word), ['resilient']);
});

test('searches by Traditional Chinese translation', () => {
  assert.ok(searchWords('好奇').some((item) => item.word === 'curious'));
});

test('searches by synonym', () => {
  assert.ok(searchWords('succinct').some((item) => item.word === 'concise'));
});

test('every demo entry has a definition and example', () => {
  for (const entry of WORDS) {
    assert.ok(entry.definitions.length > 0, entry.word);
    assert.ok(entry.definitions.every((item) => item.text && item.example), entry.word);
    assert.equal(getWord(entry.word), entry);
  }
});
