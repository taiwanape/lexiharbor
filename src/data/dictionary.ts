import { WordEntry } from '../types';

// Hand-authored demonstration content. Replace with the licensed production corpus.
export const WORDS: WordEntry[] = [
  {
    word: 'serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', partOfSpeech: 'noun', translation: '意外發現美好事物的巧合', level: 'C1',
    definitions: [
      { text: 'The pleasant discovery of something valuable by chance.', example: 'Finding this quiet bookshop was pure serendipity.' },
      { text: 'A fortunate event that happens unexpectedly.', example: 'Their meeting was a moment of serendipity.' },
    ],
    synonyms: ['chance', 'fortune', 'discovery'], tags: ['popular', 'beautiful words'],
  },
  {
    word: 'curious', phonetic: '/ˈkjʊr.i.əs/', partOfSpeech: 'adjective', translation: '好奇的；奇特的', level: 'B1',
    definitions: [
      { text: 'Interested in learning about people or things around you.', example: 'A curious learner is never bored.' },
      { text: 'Unusual and therefore worth noticing.', example: 'There was a curious mark on the old map.' },
    ],
    synonyms: ['inquisitive', 'interested', 'unusual'], tags: ['daily', 'character'],
  },
  {
    word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', partOfSpeech: 'adjective', translation: '有韌性的；能迅速恢復的', level: 'C1',
    definitions: [
      { text: 'Able to recover quickly after difficulty or change.', example: 'The team stayed resilient through a difficult season.' },
      { text: 'Able to return to shape after being bent or stretched.', example: 'The material is lightweight and resilient.' },
    ],
    synonyms: ['strong', 'adaptable', 'durable'], tags: ['work', 'mindset'],
  },
  {
    word: 'clarity', phonetic: '/ˈkler.ə.ti/', partOfSpeech: 'noun', translation: '清楚；明晰', level: 'B2',
    definitions: [{ text: 'The quality of being clear and easy to understand.', example: 'She explained the idea with remarkable clarity.' }],
    synonyms: ['clearness', 'precision', 'lucidity'], tags: ['communication'],
  },
  {
    word: 'wander', phonetic: '/ˈwɒn.dər/', partOfSpeech: 'verb', translation: '漫遊；走神', level: 'B1',
    definitions: [
      { text: 'To walk slowly without a fixed destination.', example: 'We wandered through the market after lunch.' },
      { text: 'For your attention or thoughts to move away from a subject.', example: 'My mind began to wander during the lecture.' },
    ],
    synonyms: ['roam', 'drift', 'stroll'], tags: ['travel', 'daily'],
  },
  {
    word: 'thrive', phonetic: '/θraɪv/', partOfSpeech: 'verb', translation: '茁壯成長；蓬勃發展', level: 'B2',
    definitions: [{ text: 'To grow, develop, or become successful.', example: 'Small plants thrive in the morning light.' }],
    synonyms: ['flourish', 'prosper', 'grow'], tags: ['growth', 'work'],
  },
  {
    word: 'mindful', phonetic: '/ˈmaɪnd.fəl/', partOfSpeech: 'adjective', translation: '留心的；正念的', level: 'B2',
    definitions: [{ text: 'Careful to notice the present moment or a particular fact.', example: 'Be mindful of how much time you spend online.' }],
    synonyms: ['aware', 'attentive', 'conscious'], tags: ['wellbeing'],
  },
  {
    word: 'perspective', phonetic: '/pəˈspek.tɪv/', partOfSpeech: 'noun', translation: '觀點；視角', level: 'B2',
    definitions: [{ text: 'A particular way of considering something.', example: 'Travel gave her a fresh perspective on home.' }],
    synonyms: ['viewpoint', 'outlook', 'angle'], tags: ['communication'],
  },
  {
    word: 'concise', phonetic: '/kənˈsaɪs/', partOfSpeech: 'adjective', translation: '簡明的；精煉的', level: 'C1',
    definitions: [{ text: 'Giving necessary information in few words.', example: 'Keep the product description concise.' }],
    synonyms: ['brief', 'compact', 'succinct'], tags: ['writing', 'work'],
  },
  {
    word: 'delight', phonetic: '/dɪˈlaɪt/', partOfSpeech: 'noun · verb', translation: '喜悅；使高興', level: 'B1',
    definitions: [{ text: 'Great pleasure, or something that gives great pleasure.', example: 'The small garden is a delight in spring.' }],
    synonyms: ['joy', 'pleasure', 'charm'], tags: ['emotion'],
  },
  {
    word: 'adapt', phonetic: '/əˈdæpt/', partOfSpeech: 'verb', translation: '適應；改編', level: 'B2',
    definitions: [{ text: 'To change in order to suit different conditions.', example: 'Good products adapt to people, not the reverse.' }],
    synonyms: ['adjust', 'modify', 'acclimate'], tags: ['work', 'growth'],
  },
  {
    word: 'insight', phonetic: '/ˈɪn.saɪt/', partOfSpeech: 'noun', translation: '洞察力；深刻見解', level: 'B2',
    definitions: [{ text: 'A clear and deep understanding of a situation.', example: 'User interviews gave us a valuable insight.' }],
    synonyms: ['understanding', 'perception', 'wisdom'], tags: ['work', 'thinking'],
  },
];

export function searchWords(query: string): WordEntry[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return WORDS.slice(0, 5);
  return WORDS.filter((entry) =>
    entry.word.includes(normalized) ||
    entry.translation.includes(query.trim()) ||
    entry.synonyms.some((item) => item.includes(normalized))
  );
}

export function getWord(word: string): WordEntry | undefined {
  return WORDS.find((entry) => entry.word === word);
}
