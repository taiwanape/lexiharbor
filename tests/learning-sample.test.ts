import assert from 'node:assert/strict';
import test from 'node:test';
import { learningSample, learningSampleMetadata } from '../src/data/learningSample';

test('sample has stable unique identities and reports its actual limited scope', () => {
  assert.equal(learningSample.length, 60);
  assert.equal(learningSampleMetadata.entryCount, learningSample.length);
  assert.equal(new Set(learningSample.map(({ id }) => id)).size, learningSample.length);
  assert.equal(new Set(learningSample.map(({ word }) => word)).size, learningSample.length);
  assert.equal(learningSampleMetadata.status, 'editorial-sample');
  assert.equal(learningSampleMetadata.authorship, 'ai-drafted-original');
  assert.equal(learningSampleMetadata.humanEditorialReview, 'pending');
  for (const entry of learningSample) {
    assert.ok(entry.id.trim(), entry.word);
    assert.equal(entry.sourceId, learningSampleMetadata.sourceId);
    assert.equal(entry.phonetic, '', `Unverified phonetic label for ${entry.word}`);
    assert.equal(entry.level, '', `Unverified CEFR label for ${entry.word}`);
    assert.ok(entry.translation.trim(), entry.word);
    assert.ok(entry.definitions.length > 0, entry.word);
    for (const definition of entry.definitions) {
      assert.ok(definition.text.trim(), entry.word);
      assert.ok(definition.example.trim(), entry.word);
      assert.match(definition.translation ?? '', /[\u3400-\u9fff]/, `Missing translated example for ${entry.word}`);
    }
  }
});

test('searchable headwords and inflections never point to two different entries', () => {
  const owners = new Map<string, string>();
  for (const entry of learningSample) {
    assert.equal(new Set(entry.forms).size, entry.forms.length, `${entry.word}: duplicate inflection`);
    assert.ok(!entry.forms.includes(entry.word), `${entry.word}: headword repeated as an inflection`);
    for (const term of [entry.word, ...entry.forms]) {
      assert.equal(term, term.trim().toLowerCase(), `Non-normalized search term: ${term}`);
      assert.ok(term.length > 0);
      assert.ok(!owners.has(term), `${term} ambiguously matches ${owners.get(term)} and ${entry.word}`);
      owners.set(term, entry.word);
    }
  }
  // Irregular forms should resolve to their lemma, not a fabricated regular spelling.
  for (const [form, expectedHeadword] of [
    ['went', 'go'], ['gone', 'go'], ['goes', 'go'], ['going', 'go'],
    ['ran', 'run'], ['running', 'run'], ['bought', 'buy'], ['paid', 'pay'],
    ['lent', 'lend'], ['chosen', 'choose'], ['written', 'write'],
    ['took off', 'take off'], ['taken off', 'take off'], ['families', 'family'],
  ] as const) {
    assert.equal(owners.get(form), expectedHeadword, form);
  }
  for (const incorrect of ['goed', 'runned', 'buyed', 'payed', 'lended', 'choosed', 'writed', 'familys']) {
    assert.ok(!owners.has(incorrect), incorrect);
  }
});

test('bank examples distinguish a financial account from the edge of a river', () => {
  const bank = learningSample.find(({ word }) => word === 'bank');
  assert.ok(bank);
  const financial = bank.definitions.find(({ text }) => /money|loan/i.test(text));
  const riverside = bank.definitions.find(({ text }) => /river/i.test(text));
  assert.ok(financial && riverside);
  assert.notEqual(financial, riverside);
  assert.match(financial.example, /account|loan|savings/i);
  assert.match(financial.translation ?? '', /銀行/);
  assert.match(financial.translation ?? '', /帳戶|存款|貸款/);
  assert.doesNotMatch(financial.translation ?? '', /河岸/);
  assert.match(riverside.example, /river|ducks/i);
  assert.match(riverside.translation ?? '', /河岸/);
  assert.doesNotMatch(riverside.translation ?? '', /銀行|貸款/);
});

test('run examples distinguish physical movement from operating a business', () => {
  const run = learningSample.find(({ word }) => word === 'run');
  assert.ok(run);
  const movement = run.definitions.find(({ text }) => /feet|walking/i.test(text));
  const business = run.definitions.find(({ text }) => /business|organization/i.test(text));
  assert.ok(movement && business);
  assert.notEqual(movement, business);
  assert.match(movement.example, /park|race|kilomet/i);
  assert.match(movement.translation ?? '', /跑/);
  assert.doesNotMatch(movement.translation ?? '', /經營/);
  assert.match(business.example, /bakery|shop|company/i);
  assert.match(business.translation ?? '', /經營|管理/);
  assert.doesNotMatch(business.translation ?? '', /跑步/);
});

test('separable phrasal verb examples cover both aircraft and clothing', () => {
  const takeOff = learningSample.find(({ word }) => word === 'take off');
  assert.ok(takeOff);
  const flight = takeOff.definitions.find(({ text }) => /aircraft/i.test(text));
  const clothing = takeOff.definitions.find(({ text }) => /wearing/i.test(text));
  assert.ok(flight && clothing);
  assert.match(flight.example, /plane|aircraft/i);
  assert.match(flight.translation ?? '', /起飛/);
  assert.match(clothing.example, /shoes|coat|jacket/i);
  assert.match(clothing.translation ?? '', /脫/);
});

test('all legacy saved headwords remain available for migration', () => {
  const headwords = new Set(learningSample.map(({ word }) => word));
  for (const word of ['serendipity', 'curious', 'resilient', 'clarity', 'wander', 'thrive', 'mindful', 'perspective', 'concise', 'delight', 'adapt', 'insight']) {
    assert.ok(headwords.has(word), `Lost legacy saved word: ${word}`);
  }
});
