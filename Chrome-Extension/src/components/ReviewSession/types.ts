import { WordEntry } from '../../shared/types/index.js';

export type ReviewMode = 'learning' | 'test' | 'quick';
export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

export interface ReviewSessionState {
  // Session info
  sessionId: string | null;
  status: SessionStatus;
  mode: ReviewMode;
  startTime: number | null;
  endTime: number | null;

  // Words and progress
  wordsToReview: WordEntry[];
  currentWordIndex: number;
  currentWord: WordEntry | null;
  reviewedWords: Array<{
    word: WordEntry;
    rating: number;
    timeSpent: number;
    timestamp: number;
  }>;

  // UI state
  isCardFlipped: boolean;
  showMeaning: boolean;
  isLoading: boolean;

  // Session statistics
  totalWords: number;
  correctCount: number;
  averageRating: number;
  totalTimeSpent: number;
}

export interface ReviewSessionActions {
  // Session management
  startSession: (mode: ReviewMode, wordCount?: number) => Promise<void>;
  endSession: () => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;

  // Navigation
  nextWord: () => void;
  previousWord: () => void;
  goToWord: (index: number) => void;

  // Card interaction
  flipCard: () => void;
  rateWord: (rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;

  // Utility
  loadWordsForReview: (mode: ReviewMode, limit?: number) => Promise<WordEntry[]>;
  updateSessionStats: () => void;
}

export type ReviewSessionStore = ReviewSessionState & ReviewSessionActions;