import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { WordStorageService } from '../../core/storage/wordStorage.js';
import { SRSCalculator } from '../../core/srs/index.js';
import { WordEntry, ReviewRating } from '../../shared/types/index.js';
import { ReviewSessionStore, ReviewMode } from './types.js';

const wordStorage = new WordStorageService();

export const useReviewSession = create<ReviewSessionStore>()(
  immer((set, get) => ({
    // Initial state
    sessionId: null,
    status: 'idle',
    mode: 'learning',
    startTime: null,
    endTime: null,

    wordsToReview: [],
    currentWordIndex: 0,
    currentWord: null,
    reviewedWords: [],

    isCardFlipped: false,
    showMeaning: false,
    isLoading: false,

    totalWords: 0,
    correctCount: 0,
    averageRating: 0,
    totalTimeSpent: 0,

    // Actions
    startSession: async (mode: ReviewMode, wordCount = 20) => {
      set(state => {
        state.isLoading = true;
      });

      try {
        const words = await get().loadWordsForReview(mode, wordCount);
        
        if (words.length === 0) {
          console.log('No words available for review');
          set(state => {
            state.isLoading = false;
          });
          return;
        }

        set(state => {
          state.sessionId = `session_${Date.now()}`;
          state.status = 'active';
          state.mode = mode;
          state.startTime = Date.now();
          state.endTime = null;

          state.wordsToReview = words;
          state.currentWordIndex = 0;
          state.currentWord = words[0];
          state.reviewedWords = [];

          state.isCardFlipped = false;
          state.showMeaning = false;
          state.isLoading = false;

          state.totalWords = words.length;
          state.correctCount = 0;
          state.averageRating = 0;
          state.totalTimeSpent = 0;
        });

        console.log(`Started ${mode} session with ${words.length} words`);
      } catch (error) {
        console.error('Failed to start review session:', error);
        set(state => {
          state.isLoading = false;
          state.status = 'idle';
        });
      }
    },

    endSession: async () => {
      const state = get();
      if (state.status === 'idle') return;

      set(draft => {
        draft.status = 'completed';
        draft.endTime = Date.now();
        draft.isLoading = true;
      });

      try {
        // Update session statistics
        get().updateSessionStats();

        // Save session data (could be extended to save to storage)
        console.log('Session completed:', {
          mode: state.mode,
          totalWords: state.totalWords,
          reviewedCount: state.reviewedWords.length,
          averageRating: state.averageRating,
          totalTime: state.totalTimeSpent
        });

        set(draft => {
          draft.isLoading = false;
        });
      } catch (error) {
        console.error('Failed to end session:', error);
        set(draft => {
          draft.isLoading = false;
        });
      }
    },

    pauseSession: () => {
      set(state => {
        if (state.status === 'active') {
          state.status = 'paused';
        }
      });
    },

    resumeSession: () => {
      set(state => {
        if (state.status === 'paused') {
          state.status = 'active';
        }
      });
    },

    resetSession: () => {
      set(state => {
        state.sessionId = null;
        state.status = 'idle';
        state.mode = 'learning';
        state.startTime = null;
        state.endTime = null;

        state.wordsToReview = [];
        state.currentWordIndex = 0;
        state.currentWord = null;
        state.reviewedWords = [];

        state.isCardFlipped = false;
        state.showMeaning = false;
        state.isLoading = false;

        state.totalWords = 0;
        state.correctCount = 0;
        state.averageRating = 0;
        state.totalTimeSpent = 0;
      });
    },

    nextWord: () => {
      const state = get();
      if (state.currentWordIndex < state.wordsToReview.length - 1) {
        set(draft => {
          draft.currentWordIndex += 1;
          draft.currentWord = state.wordsToReview[draft.currentWordIndex];
          draft.isCardFlipped = false;
          draft.showMeaning = false;
        });
      } else {
        // End of session
        get().endSession();
      }
    },

    previousWord: () => {
      const state = get();
      if (state.currentWordIndex > 0) {
        set(draft => {
          draft.currentWordIndex -= 1;
          draft.currentWord = state.wordsToReview[draft.currentWordIndex];
          draft.isCardFlipped = false;
          draft.showMeaning = false;
        });
      }
    },

    goToWord: (index: number) => {
      const state = get();
      if (index >= 0 && index < state.wordsToReview.length) {
        set(draft => {
          draft.currentWordIndex = index;
          draft.currentWord = state.wordsToReview[index];
          draft.isCardFlipped = false;
          draft.showMeaning = false;
        });
      }
    },

    flipCard: () => {
      set(state => {
        state.isCardFlipped = !state.isCardFlipped;
        if (state.isCardFlipped) {
          state.showMeaning = true;
        }
      });
    },

    rateWord: async (rating: 1 | 2 | 3 | 4 | 5) => {
      const state = get();
      if (!state.currentWord || state.status !== 'active') return;

      set(draft => {
        draft.isLoading = true;
      });

      try {
        const reviewStartTime = Date.now() - 10000; // Approximate review start time
        const timeSpent = Date.now() - reviewStartTime;

        // Convert numeric rating to ReviewRating
        let reviewRating: ReviewRating;
        switch (rating) {
          case 1: reviewRating = 'again'; break;
          case 2: reviewRating = 'hard'; break;
          case 3: reviewRating = 'good'; break;
          case 4: reviewRating = 'good'; break;
          case 5: reviewRating = 'easy'; break;
          default: reviewRating = 'good'; break;
        }
        
        // Update word using SRS algorithm
        const reviewResult = SRSCalculator.calculateNextReview(
          state.currentWord,
          reviewRating,
          'standard'
        );

        const updatedWord: WordEntry = {
          ...state.currentWord,
          review: reviewResult
        };

        // Save updated word
        await wordStorage.updateWord(updatedWord);

        // Update session state
        set(draft => {
          draft.reviewedWords.push({
            word: state.currentWord!,
            rating,
            timeSpent,
            timestamp: Date.now()
          });

          if (rating >= 3) {
            draft.correctCount += 1;
          }

          draft.isLoading = false;
        });

        // Move to next word after a short delay
        setTimeout(() => {
          get().nextWord();
        }, 800);

      } catch (error) {
        console.error('Failed to rate word:', error);
        set(draft => {
          draft.isLoading = false;
        });
      }
    },

    loadWordsForReview: async (mode: ReviewMode, limit = 20): Promise<WordEntry[]> => {
      try {
        let words: WordEntry[] = [];

        switch (mode) {
          case 'learning':
            // For learning mode, get all learning words, not just due ones
            const learningWords = await wordStorage.getWords({ status: 'learning', limit });
            console.log(`Found ${learningWords.length} learning words`);
            words = learningWords;
            break;

          case 'test':
            // Only learned words for testing
            const learnedWords = await wordStorage.getWords({ status: 'learned', limit });
            words = learnedWords;
            break;

          case 'quick':
            // Mix of all types, prioritizing due words
            words = await wordStorage.getWordsDue(limit);
            break;
        }

        console.log(`Loading ${words.length} words for ${mode} mode`);
        // Shuffle words for better learning experience
        return words.sort(() => Math.random() - 0.5);
      } catch (error) {
        console.error('Failed to load words for review:', error);
        return [];
      }
    },

    updateSessionStats: () => {
      const state = get();
      if (state.reviewedWords.length === 0) return;

      const totalRating = state.reviewedWords.reduce((sum, review) => sum + review.rating, 0);
      const totalTime = state.reviewedWords.reduce((sum, review) => sum + review.timeSpent, 0);

      set(draft => {
        draft.averageRating = totalRating / state.reviewedWords.length;
        draft.totalTimeSpent = totalTime;
      });
    }
  }))
);

export default useReviewSession;