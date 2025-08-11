import type { WordEntry, ReviewRating, ReviewStrength } from '../../shared/types';

export interface ReviewResult {
  dueAt: number;
  intervalDays: number;
  ease: number;
  streak: number;
  lastReviewedAt: number;
  reviewCount: number;
}

export class SRSCalculator {
  // Ease factor boundaries
  private static readonly MIN_EASE = 1.3;
  private static readonly MAX_EASE = 2.5;
  
  // Base intervals for different strengths
  private static readonly STRENGTH_MULTIPLIERS = {
    gentle: 0.8,
    standard: 1.0,
    intense: 1.3
  };

  /**
   * Calculate next review schedule based on rating
   */
  static calculateNextReview(
    word: WordEntry, 
    rating: ReviewRating,
    reviewStrength: ReviewStrength = 'standard'
  ): ReviewResult {
    const now = Date.now();
    const review = word.review;
    const strengthMultiplier = this.STRENGTH_MULTIPLIERS[reviewStrength];
    
    let newInterval: number;
    let newEase = review.ease;
    let newStreak = review.streak;
    
    switch (rating) {
      case 'again': // Complete failure
        newStreak = 0;
        newInterval = 0; // Review immediately
        newEase = Math.max(this.MIN_EASE, newEase - 0.2);
        break;
        
      case 'hard': // Partial success but difficult
        newStreak = Math.max(0, review.streak - 1);
        newInterval = this.calculateInterval(review.intervalDays, newEase * 0.6, strengthMultiplier);
        newEase = Math.max(this.MIN_EASE, newEase - 0.15);
        break;
        
      case 'good': // Standard success
        newStreak = review.streak + 1;
        newInterval = this.calculateInterval(review.intervalDays, newEase, strengthMultiplier);
        // Slight ease adjustment based on performance
        if (newStreak > 3) {
          newEase = Math.min(this.MAX_EASE, newEase + 0.05);
        }
        break;
        
      case 'easy': // Very easy, increase interval more
        newStreak = review.streak + 1;
        newInterval = this.calculateInterval(review.intervalDays, newEase * 1.3, strengthMultiplier);
        newEase = Math.min(this.MAX_EASE, newEase + 0.15);
        break;
    }
    
    // Calculate due date
    const intervalMs = newInterval * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const dueAt = now + intervalMs;
    
    return {
      dueAt,
      intervalDays: newInterval,
      ease: newEase,
      streak: newStreak,
      lastReviewedAt: now,
      reviewCount: review.reviewCount + 1
    };
  }

  /**
   * Calculate interval based on previous interval and ease factor
   */
  private static calculateInterval(
    previousInterval: number, 
    ease: number, 
    strengthMultiplier: number
  ): number {
    if (previousInterval === 0) {
      // First review: 1 day
      return Math.max(1, Math.round(1 * strengthMultiplier));
    }
    
    if (previousInterval === 1) {
      // Second review: 6 days
      return Math.max(2, Math.round(6 * strengthMultiplier));
    }
    
    // Subsequent reviews: previous interval * ease factor
    const baseInterval = previousInterval * ease;
    const adjustedInterval = baseInterval * strengthMultiplier;
    
    // Add some randomness to avoid clustering (±10%)
    const randomFactor = 0.9 + Math.random() * 0.2;
    const finalInterval = Math.round(adjustedInterval * randomFactor);
    
    // Ensure minimum interval of 1 day and maximum of 365 days
    return Math.max(1, Math.min(365, finalInterval));
  }

  /**
   * Get words due for review
   */
  static getWordsDue(words: WordEntry[], limit?: number): WordEntry[] {
    const now = Date.now();
    
    const dueWords = words
      .filter(word => 
        word.status === 'learning' && 
        word.review.dueAt <= now
      )
      .sort((a, b) => a.review.dueAt - b.review.dueAt); // Sort by due date (oldest first)
    
    return limit ? dueWords.slice(0, limit) : dueWords;
  }

  /**
   * Calculate learning statistics
   */
  static calculateStats(words: WordEntry[]): {
    totalWords: number;
    learningWords: number;
    learnedWords: number;
    dueWords: number;
    averageEase: number;
    averageStreak: number;
  } {
    const learningWords = words.filter(w => w.status === 'learning');
    const learnedWords = words.filter(w => w.status === 'learned');
    const now = Date.now();
    const dueWords = learningWords.filter(w => w.review.dueAt <= now);
    
    const totalEase = learningWords.reduce((sum, w) => sum + w.review.ease, 0);
    const totalStreak = learningWords.reduce((sum, w) => sum + w.review.streak, 0);
    
    return {
      totalWords: words.length,
      learningWords: learningWords.length,
      learnedWords: learnedWords.length,
      dueWords: dueWords.length,
      averageEase: learningWords.length > 0 ? totalEase / learningWords.length : 0,
      averageStreak: learningWords.length > 0 ? totalStreak / learningWords.length : 0
    };
  }

  /**
   * Predict next review dates for a word
   */
  static predictReviewDates(
    word: WordEntry, 
    reviewStrength: ReviewStrength = 'standard'
  ): { rating: ReviewRating; nextReviewDate: Date; interval: number }[] {
    const predictions: { rating: ReviewRating; nextReviewDate: Date; interval: number }[] = [];
    
    const ratings: ReviewRating[] = ['again', 'hard', 'good', 'easy'];
    
    for (const rating of ratings) {
      const result = this.calculateNextReview(word, rating, reviewStrength);
      predictions.push({
        rating,
        nextReviewDate: new Date(result.dueAt),
        interval: result.intervalDays
      });
    }
    
    return predictions;
  }

  /**
   * Calculate retention rate based on review history
   */
  static calculateRetentionRate(words: WordEntry[]): number {
    const reviewedWords = words.filter(w => w.review.reviewCount > 0);
    
    if (reviewedWords.length === 0) return 0;
    
    const successfulReviews = reviewedWords.filter(w => w.review.streak > 0);
    
    return successfulReviews.length / reviewedWords.length;
  }

  /**
   * Suggest optimal daily review limit based on user performance
   */
  static suggestDailyLimit(
    currentLimit: number,
    completionRate: number,
    averageTime: number // in minutes
  ): number {
    if (completionRate > 0.9 && averageTime < 15) {
      // User is doing well, can handle more
      return Math.min(50, Math.round(currentLimit * 1.2));
    } else if (completionRate < 0.7 || averageTime > 25) {
      // User is struggling, reduce load
      return Math.max(10, Math.round(currentLimit * 0.8));
    }
    
    return currentLimit; // Keep current limit
  }
}

// Export utility functions for use in other modules
export function markWordReviewed(
  word: WordEntry, 
  rating: ReviewRating,
  reviewStrength: ReviewStrength = 'standard'
): WordEntry {
  const newReview = SRSCalculator.calculateNextReview(word, rating, reviewStrength);
  
  return {
    ...word,
    review: newReview
  };
}

export function isWordDue(word: WordEntry): boolean {
  return word.status === 'learning' && word.review.dueAt <= Date.now();
}

export function getDaysUntilDue(word: WordEntry): number {
  const now = Date.now();
  const msUntilDue = word.review.dueAt - now;
  return Math.ceil(msUntilDue / (24 * 60 * 60 * 1000));
}

export function formatInterval(days: number): string {
  if (days === 0) return 'now';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}