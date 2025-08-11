import { WordStorageService } from './wordStorage';
import { SettingsStorageService, StatisticsStorageService } from './settingsStorage';

// Singleton instances
let wordStorage: WordStorageService;
let settingsStorage: SettingsStorageService;
let statisticsStorage: StatisticsStorageService;

export function getWordStorage(): WordStorageService {
  if (!wordStorage) {
    wordStorage = new WordStorageService();
  }
  return wordStorage;
}

export function getSettingsStorage(): SettingsStorageService {
  if (!settingsStorage) {
    settingsStorage = new SettingsStorageService();
  }
  return settingsStorage;
}

export function getStatisticsStorage(): StatisticsStorageService {
  if (!statisticsStorage) {
    statisticsStorage = new StatisticsStorageService();
  }
  return statisticsStorage;
}

// Re-export services and types
export { WordStorageService } from './wordStorage';
export { SettingsStorageService, StatisticsStorageService } from './settingsStorage';
export { getDB, clearDatabase } from './database';
export type { CiSuiJiDB } from './database';