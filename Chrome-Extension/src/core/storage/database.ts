import { openDB, IDBPDatabase } from 'idb';
import type { WordEntry, Settings, Statistics } from '../../shared/types';

const DB_NAME = 'CiSuiJi';
const DB_VERSION = 1;

export interface CiSuiJiDB {
  words: {
    key: string;
    value: WordEntry;
    indexes: {
      'by-status': WordEntry['status'];
      'by-due': number;
      'by-added': number;
    };
  };
  settings: {
    key: string;
    value: Settings;
  };
  statistics: {
    key: string;
    value: Statistics;
  };
  cache: {
    key: string;
    value: {
      word: string;
      definition: string;
      partOfSpeech: string[];
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CiSuiJiDB>>;

export function getDB(): Promise<IDBPDatabase<CiSuiJiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CiSuiJiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Words store
        const wordsStore = db.createObjectStore('words', {
          keyPath: 'id'
        });
        wordsStore.createIndex('by-status', 'status');
        wordsStore.createIndex('by-due', 'review.dueAt');
        wordsStore.createIndex('by-added', 'addedAt');

        // Settings store
        db.createObjectStore('settings', {
          keyPath: 'key'
        });

        // Statistics store
        db.createObjectStore('statistics', {
          keyPath: 'key'
        });

        // Cache store for dictionary results
        db.createObjectStore('cache', {
          keyPath: 'word'
        });
      }
    });
  }
  return dbPromise;
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['words', 'settings', 'statistics', 'cache'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('words').clear(),
    tx.objectStore('settings').clear(), 
    tx.objectStore('statistics').clear(),
    tx.objectStore('cache').clear()
  ]);
  
  await tx.done;
}