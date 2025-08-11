import { WordEntry } from '../../shared/types/index.js';
import { WordStorageService } from '../../core/storage/wordStorage.js';
import { ReviewMode } from '../ReviewSession/types.js';

export interface ReviewModeConfig {
  name: string;
  description: string;
  icon: string;
  
  // Word selection criteria
  includeNewWords: boolean;
  includeLearningWords: boolean;
  includeLearnedWords: boolean;
  includeMasteredWords: boolean;
  
  // Session settings
  defaultWordCount: number;
  maxWordCount: number;
  timeLimit?: number; // in minutes
  
  // UI behavior
  showHints: boolean;
  showExamples: boolean;
  showProgress: boolean;
  autoFlipDelay?: number; // auto-flip after X seconds
  ratingTimeout?: number; // auto-advance if no rating given
  
  // Difficulty settings
  prioritizeDifficult: boolean;
  includeForgotten: boolean;
  shuffleWords: boolean;
  
  // Success criteria
  passingScore: number; // minimum average rating to consider session successful
  retryIncorrect: boolean; // retry words rated below 3
}

export const REVIEW_MODE_CONFIGS: Record<ReviewMode, ReviewModeConfig> = {
  learning: {
    name: '学习模式',
    description: '学习新单词和复习即将到期的单词，适合日常学习',
    icon: '📚',
    
    includeNewWords: true,
    includeLearningWords: true,
    includeLearnedWords: true,
    includeMasteredWords: false,
    
    defaultWordCount: 20,
    maxWordCount: 50,
    timeLimit: undefined,
    
    showHints: true,
    showExamples: true,
    showProgress: true,
    autoFlipDelay: undefined,
    ratingTimeout: undefined,
    
    prioritizeDifficult: true,
    includeForgotten: true,
    shuffleWords: true,
    
    passingScore: 3.0,
    retryIncorrect: false
  },
  
  test: {
    name: '测试模式',
    description: '测试已学单词的掌握程度，不显示提示和例句',
    icon: '🎯',
    
    includeNewWords: false,
    includeLearningWords: true,
    includeLearnedWords: true,
    includeMasteredWords: true,
    
    defaultWordCount: 30,
    maxWordCount: 100,
    timeLimit: 15,
    
    showHints: false,
    showExamples: false,
    showProgress: true,
    autoFlipDelay: undefined,
    ratingTimeout: 30, // 30 seconds to respond
    
    prioritizeDifficult: false,
    includeForgotten: true,
    shuffleWords: true,
    
    passingScore: 3.5,
    retryIncorrect: true
  },
  
  quick: {
    name: '快速模式',
    description: '快节奏复习，自动翻转卡片，适合快速刷词',
    icon: '⚡',
    
    includeNewWords: false,
    includeLearningWords: true,
    includeLearnedWords: true,
    includeMasteredWords: false,
    
    defaultWordCount: 40,
    maxWordCount: 200,
    timeLimit: 10,
    
    showHints: false,
    showExamples: false,
    showProgress: false,
    autoFlipDelay: 3, // auto-flip after 3 seconds
    ratingTimeout: 5, // 5 seconds to rate
    
    prioritizeDifficult: true,
    includeForgotten: true,
    shuffleWords: true,
    
    passingScore: 2.5,
    retryIncorrect: false
  }
};

export class ReviewModeManager {
  private wordStorage: WordStorageService;

  constructor() {
    this.wordStorage = new WordStorageService();
  }

  public getModeConfig(mode: ReviewMode): ReviewModeConfig {
    return REVIEW_MODE_CONFIGS[mode];
  }

  public getAllModeConfigs(): Record<ReviewMode, ReviewModeConfig> {
    return REVIEW_MODE_CONFIGS;
  }

  public async getWordsForMode(mode: ReviewMode, wordCount?: number): Promise<WordEntry[]> {
    const config = this.getModeConfig(mode);
    const limit = wordCount || config.defaultWordCount;
    
    try {
      let words: WordEntry[] = [];
      const now = Date.now();

      // Get words based on mode criteria
      const allWords = await this.wordStorage.getWords();
      
      const filteredWords = allWords.filter(word => {
        // Filter by status - only handle 'learning' and 'learned' status
        if (word.status === 'learning' && !config.includeLearningWords) return false;
        if (word.status === 'learned' && !config.includeLearnedWords) return false;
        
        // For learning mode, prioritize due words
        if (mode === 'learning' && word.status === 'learning') {
          return word.review.dueAt <= now;
        }
        
        return true;
      });

      // Sort words based on priority
      if (config.prioritizeDifficult) {
        filteredWords.sort((a, b) => {
          // Prioritize by review performance
          const aScore = this.calculateWordPriority(a);
          const bScore = this.calculateWordPriority(b);
          return bScore - aScore; // Higher score = higher priority
        });
      }

      // Apply shuffling if needed
      if (config.shuffleWords) {
        words = this.shuffleArray([...filteredWords]);
      } else {
        words = filteredWords;
      }

      // Limit to requested count
      words = words.slice(0, Math.min(limit, config.maxWordCount));

      console.log(`Selected ${words.length} words for ${mode} mode`, {
        requested: limit,
        available: filteredWords.length,
        config: config.name
      });

      return words;
    } catch (error) {
      console.error(`Failed to get words for ${mode} mode:`, error);
      return [];
    }
  }

  private calculateWordPriority(word: WordEntry): number {
    let priority = 0;
    
    // Base priority by status (higher = more urgent)
    switch (word.status) {
      case 'learning': priority += 60; break;
      case 'learned': priority += 40; break;
    }
    
    // Add urgency based on due date
    const daysOverdue = (Date.now() - word.review.dueAt) / (1000 * 60 * 60 * 24);
    if (daysOverdue > 0) {
      priority += Math.min(daysOverdue * 10, 50); // Cap at +50
    }
    
    // Base priority without difficulty
    priority += 10;
    
    // Lower priority for words with high streak
    if (word.review.reviewCount > 0) {
      const successRate = word.review.streak / word.review.reviewCount;
      priority -= successRate * 20; // Reduce priority for well-known words
    }
    
    return priority;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public validateModeSettings(mode: ReviewMode, settings: Partial<ReviewModeConfig>): boolean {
    const config = this.getModeConfig(mode);
    
    // Validate word count
    if (settings.defaultWordCount && settings.defaultWordCount > config.maxWordCount) {
      return false;
    }
    
    // Validate time limit
    if (settings.timeLimit && settings.timeLimit < 1) {
      return false;
    }
    
    // Validate passing score
    if (settings.passingScore && (settings.passingScore < 1 || settings.passingScore > 5)) {
      return false;
    }
    
    return true;
  }

  public getModeStats(mode: ReviewMode): Promise<{
    totalWords: number;
    newWords: number;
    learningWords: number;
    learnedWords: number;
    dueWords: number;
  }> {
    return this.calculateModeStatistics(mode);
  }

  private async calculateModeStatistics(mode: ReviewMode): Promise<{
    totalWords: number;
    newWords: number;
    learningWords: number;
    learnedWords: number;
    dueWords: number;
  }> {
    try {
      const words = await this.getWordsForMode(mode, 1000); // Get up to 1000 for stats
      const now = Date.now();
      
      const stats = {
        totalWords: words.length,
        newWords: 0, // No 'new' status in actual interface
        learningWords: words.filter(w => w.status === 'learning').length,
        learnedWords: words.filter(w => w.status === 'learned').length,
        dueWords: words.filter(w => w.review.dueAt <= now).length
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to calculate mode statistics:', error);
      return {
        totalWords: 0,
        newWords: 0,
        learningWords: 0,
        learnedWords: 0,
        dueWords: 0
      };
    }
  }
}