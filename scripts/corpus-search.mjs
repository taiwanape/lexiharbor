// Reference retrieval for the corpus experiment, not a sense-alignment engine.
export const INFLECTIONS = Object.freeze({
  went: 'go', gone: 'go', ran: 'run', running: 'run', ate: 'eat', eaten: 'eat',
  drank: 'drink', drunk: 'drink', bought: 'buy', sold: 'sell', read: 'read',
  wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', saw: 'see',
  seen: 'see', took: 'take', taken: 'take', gave: 'give', given: 'give',
  got: 'get', gotten: 'get', came: 'come', coming: 'come', made: 'make',
  did: 'do', done: 'do', knew: 'know', known: 'know', thought: 'think',
  children: 'child', feet: 'foot', teeth: 'tooth', mice: 'mouse', people: 'person',
  men: 'man', women: 'woman', better: 'good', best: 'good', worse: 'bad',
  apples: 'apple', books: 'book', houses: 'house', studies: 'study', studied: 'study',
  studying: 'study', played: 'play', playing: 'play', stopped: 'stop', stops: 'stop',
});

export const normalize = (value) => value.normalize('NFKC').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ');
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const gloss = (value) => normalize(value).replace(/\([^)]*\)/g, '').replace(/^(?:to|a|an) /, '').replace(/\s+/g, ' ').trim();
const prepared = new WeakMap();
function prepare(entries) {
  let rows = prepared.get(entries);
  if (!rows) {
    rows = entries.map((entry) => ({ entry, glosses: entry.definitions.map(gloss) }));
    prepared.set(entries, rows);
  }
  return rows;
}

export function searchCorpus(entries, input, { useInflections = true, limit = 50 } = {}) {
  const query = normalize(input);
  if (!query || query.length > 100) return { query, normalizedQuery: query, queryKind: 'empty', inflectionUsed: false, total: 0, results: [] };
  const isChinese = /\p{Script=Han}/u.test(query);
  const lookup = (!isChinese && useInflections && Object.hasOwn(INFLECTIONS, query)) ? INFLECTIONS[query] : query;
  const inflectionUsed = lookup !== query;
  const boundary = new RegExp(`(^|[^a-z])${escape(lookup)}(?=$|[^a-z])`, 'i');
  const results = [];
  for (const { entry, glosses } of prepare(entries)) {
    let rank = Infinity;
    let matchedDefinition = null;
    if (isChinese) {
      if (entry.traditional === query || entry.simplified === query) rank = 0;
      else if (entry.traditional.startsWith(query) || entry.simplified.startsWith(query)) rank = 4;
    } else {
      for (const [index, cleaned] of glosses.entries()) {
        const value = cleaned === lookup ? 0 : boundary.test(cleaned) ? 2 : Infinity;
        if (value < rank) { rank = value; matchedDefinition = entry.definitions[index]; }
      }
    }
    if (rank !== Infinity) results.push({ entry, rank, matchedDefinition });
  }
  results.sort((a, b) => a.rank - b.rank || a.entry.traditional.length - b.entry.traditional.length || order(a.entry.id, b.entry.id));
  return { query, normalizedQuery: lookup, queryKind: isChinese ? 'zh-headword' : 'en-definition-reverse', inflectionUsed, total: results.length, results: results.slice(0, limit) };
}
