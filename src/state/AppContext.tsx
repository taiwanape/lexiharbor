import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ReviewRating } from '../types';

type StoredState = {
  savedWords: string[];
  history: string[];
  reviewCount: number;
  knownWords: string[];
  streak: number;
  lastStudyDate?: string;
  isPremium: boolean;
};

type AppState = StoredState & {
  hydrated: boolean;
  rememberSearch: (word: string) => void;
  toggleSaved: (word: string) => void;
  reviewWord: (word: string, rating: ReviewRating) => void;
  clearHistory: () => void;
  setPremium: (value: boolean) => void;
};

const STORAGE_KEY = '@lexiharbor/state/v1';
const initialState: StoredState = {
  savedWords: ['serendipity', 'resilient'],
  history: ['clarity', 'wander', 'curious'],
  reviewCount: 0,
  knownWords: [],
  streak: 3,
  isPremium: false,
};

const AppContext = createContext<AppState | null>(null);

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StoredState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setState({ ...initialState, ...JSON.parse(raw) as StoredState });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, state]);

  const rememberSearch = useCallback((word: string) => {
    setState((current) => ({
      ...current,
      history: [word, ...current.history.filter((item) => item !== word)].slice(0, 30),
    }));
  }, []);

  const toggleSaved = useCallback((word: string) => {
    setState((current) => ({
      ...current,
      savedWords: current.savedWords.includes(word)
        ? current.savedWords.filter((item) => item !== word)
        : [word, ...current.savedWords],
    }));
  }, []);

  const reviewWord = useCallback((word: string, rating: ReviewRating) => {
    setState((current) => {
      const today = localDate();
      const isNewDay = current.lastStudyDate !== today;
      return {
        ...current,
        reviewCount: current.reviewCount + 1,
        knownWords: rating === 'easy' && !current.knownWords.includes(word)
          ? [...current.knownWords, word]
          : current.knownWords,
        streak: isNewDay ? current.streak + 1 : current.streak,
        lastStudyDate: today,
      };
    });
  }, []);

  const value = useMemo<AppState>(() => ({
    ...state,
    hydrated,
    rememberSearch,
    toggleSaved,
    reviewWord,
    clearHistory: () => setState((current) => ({ ...current, history: [] })),
    setPremium: (isPremium) => setState((current) => ({ ...current, isPremium })),
  }), [hydrated, rememberSearch, reviewWord, state, toggleSaved]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppState must be used inside AppProvider');
  return value;
}
