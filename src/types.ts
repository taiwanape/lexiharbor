export type TabId = 'dictionary' | 'cards' | 'phrases' | 'saved' | 'profile';

export type WordEntry = {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  translation: string;
  level: string;
  definitions: { text: string; example: string }[];
  synonyms: string[];
  tags: string[];
};

export type Phrase = {
  id: string;
  category: string;
  source: string;
  target: string;
};

export type ReviewRating = 'again' | 'good' | 'easy';
