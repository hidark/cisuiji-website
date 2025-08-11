import { getDB } from './database';
import type { Settings, Statistics } from '../../shared/types';

export class SettingsStorageService {
  private static readonly DEFAULT_SETTINGS: Settings = {
    dictionarySource: 'dictionaryapi',
    dailyReviewLimit: 30,
    notifyEnabled: true,
    notifyWindow: {
      start: '08:00',
      end: '22:00'
    },
    reviewStrength: 'standard',
    language: 'zh-CN',
    theme: 'auto'
  };

  private static readonly SETTINGS_KEY = 'main';

  /**
   * Get current settings, return defaults if not found
   */
  async getSettings(): Promise<Settings> {
    const db = await getDB();
    const stored = await db.get('settings', SettingsStorageService.SETTINGS_KEY);
    
    if (!stored) {
      // Initialize with defaults
      await this.saveSettings(SettingsStorageService.DEFAULT_SETTINGS);
      return SettingsStorageService.DEFAULT_SETTINGS;
    }
    
    // Merge with defaults to ensure all properties exist
    return { ...SettingsStorageService.DEFAULT_SETTINGS, ...stored.value };
  }

  /**
   * Save settings
   */
  async saveSettings(settings: Partial<Settings>): Promise<void> {
    const db = await getDB();
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    
    await db.put('settings', {
      key: SettingsStorageService.SETTINGS_KEY,
      value: updated
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    await this.saveSettings(SettingsStorageService.DEFAULT_SETTINGS);
  }
}

export class StatisticsStorageService {
  private static readonly STATISTICS_KEY = 'main';

  /**
   * Get current statistics
   */
  async getStatistics(): Promise<Statistics> {
    const db = await getDB();
    const stored = await db.get('statistics', StatisticsStorageService.STATISTICS_KEY);
    
    if (!stored) {
      const initial: Statistics = {
        totalWords: 0,
        learningWords: 0,
        learnedWords: 0,
        todayAdded: 0,
        todayReviewed: 0,
        streakDays: 0,
        lastActiveAt: Date.now()
      };
      await this.saveStatistics(initial);
      return initial;
    }
    
    return stored.value;
  }

  /**
   * Save statistics
   */
  async saveStatistics(stats: Statistics): Promise<void> {
    const db = await getDB();
    await db.put('statistics', {
      key: StatisticsStorageService.STATISTICS_KEY,
      value: stats
    });
  }

  /**
   * Update statistics with new data
   */
  async updateStatistics(updates: Partial<Statistics>): Promise<Statistics> {
    const current = await this.getStatistics();
    const updated = { ...current, ...updates };
    await this.saveStatistics(updated);
    return updated;
  }

  /**
   * Increment today's added count
   */
  async incrementTodayAdded(): Promise<void> {
    const stats = await this.getStatistics();
    const today = new Date().toDateString();
    const lastActiveDay = new Date(stats.lastActiveAt).toDateString();
    
    // Reset daily counters if it's a new day
    if (today !== lastActiveDay) {
      stats.todayAdded = 1;
      stats.todayReviewed = 0;
    } else {
      stats.todayAdded++;
    }
    
    stats.lastActiveAt = Date.now();
    await this.saveStatistics(stats);
  }

  /**
   * Increment today's reviewed count
   */
  async incrementTodayReviewed(): Promise<void> {
    const stats = await this.getStatistics();
    const today = new Date().toDateString();
    const lastActiveDay = new Date(stats.lastActiveAt).toDateString();
    
    // Reset daily counters if it's a new day
    if (today !== lastActiveDay) {
      stats.todayAdded = 0;
      stats.todayReviewed = 1;
    } else {
      stats.todayReviewed++;
    }
    
    stats.lastActiveAt = Date.now();
    await this.saveStatistics(stats);
  }

  /**
   * Update word counts from actual data
   */
  async syncWordCounts(counts: { total: number; learning: number; learned: number }): Promise<void> {
    await this.updateStatistics({
      totalWords: counts.total,
      learningWords: counts.learning,
      learnedWords: counts.learned
    });
  }

  /**
   * Calculate and update streak days
   */
  async updateStreakDays(): Promise<void> {
    const stats = await this.getStatistics();
    const today = new Date().toDateString();
    const lastActiveDay = new Date(stats.lastActiveAt).toDateString();
    
    if (today === lastActiveDay) {
      // Same day, no change needed
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastActiveDay === yesterdayStr) {
      // Continued streak
      stats.streakDays++;
    } else if (stats.todayReviewed > 0 || stats.todayAdded > 0) {
      // New streak starts
      stats.streakDays = 1;
    } else {
      // No activity, streak broken
      stats.streakDays = 0;
    }
    
    await this.saveStatistics(stats);
  }
}