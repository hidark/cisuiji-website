// Word data model
export interface WordEntry {
  id: string;
  text: string;
  language: string;
  definition: string;
  partOfSpeech: string[];
  source: WordSource[];
  context?: WordContext;
  addedAt: number;
  status: WordStatus;
  review: ReviewData;
}

export interface WordSource {
  title: string;
  url: string;
  addedAt: number;
}

export interface WordContext {
  sentence: string;
  paragraph?: string;
  position: [number, number];
}

export interface ReviewData {
  dueAt: number;
  intervalDays: number;
  ease: number;
  streak: number;
  lastReviewedAt: number | null;
  reviewCount: number;
}

export type WordStatus = 'learning' | 'learned' | 'deleted';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

// Settings
export interface Settings {
  dictionarySource: DictionarySource;
  dailyReviewLimit: number;
  notifyEnabled: boolean;
  notifyWindow: {
    start: string;
    end: string;
  };
  reviewStrength: ReviewStrength;
  language: LanguageCode;
  theme: 'light' | 'dark' | 'auto';
}

export type DictionarySource = 'dictionaryapi' | 'youdao' | 'localFallback';
export type ReviewStrength = 'gentle' | 'standard' | 'intense';
export type LanguageCode = 'zh-CN' | 'en-US';

// Statistics
export interface Statistics {
  totalWords: number;
  learningWords: number;
  learnedWords: number;
  todayAdded: number;
  todayReviewed: number;
  streakDays: number;
  lastActiveAt: number;
}

// API Messages
export interface AddWordMessage {
  type: 'ADD_WORD';
  data: {
    text: string;
    pageTitle: string;
    url: string;
    language?: string;
    context?: WordContext;
  };
}

export interface DictionaryResponse {
  definition: string;
  partOfSpeech: string[];
  source: 'online' | 'local';
  success: boolean;
}

// Storage keys
export const STORAGE_KEYS = {
  WORDS: 'words',
  SETTINGS: 'settings',
  STATISTICS: 'statistics',
  CACHE: 'cache'
} as const;