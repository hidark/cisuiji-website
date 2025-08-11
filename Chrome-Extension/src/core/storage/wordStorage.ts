import { getDB } from './database';
import type { WordEntry, WordStatus, WordSource } from '../../shared/types';

export class WordStorageService {
  /**
   * Add a new word or merge with existing word
   */
  async addWord(wordData: Omit<WordEntry, 'id' | 'addedAt' | 'status' | 'review'>): Promise<WordEntry> {
    const db = await getDB();
    const id = this.generateWordId(wordData.text, wordData.language);
    
    // Check if word already exists
    const existing = await db.get('words', id);
    
    if (existing) {
      // Merge sources
      const newSources = [...existing.source, ...wordData.source];
      const uniqueSources = this.deduplicateSources(newSources);
      
      const updated: WordEntry = {
        ...existing,
        source: uniqueSources,
        definition: wordData.definition || existing.definition,
        partOfSpeech: [...new Set([...existing.partOfSpeech, ...wordData.partOfSpeech])],
        context: wordData.context || existing.context
      };
      
      await db.put('words', updated);
      return updated;
    }
    
    // Create new word
    const now = Date.now();
    const newWord: WordEntry = {
      ...wordData,
      id,
      addedAt: now,
      status: 'learning',
      review: {
        dueAt: now, // Due for review immediately
        intervalDays: 0,
        ease: 2.5, // Starting ease factor
        streak: 0,
        lastReviewedAt: null,
        reviewCount: 0
      }
    };
    
    await db.put('words', newWord);
    return newWord;
  }

  /**
   * Get word by ID
   */
  async getWord(id: string): Promise<WordEntry | undefined> {
    const db = await getDB();
    return await db.get('words', id);
  }

  /**
   * Get all words with optional filtering
   */
  async getWords(options: {
    status?: WordStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<WordEntry[]> {
    const db = await getDB();
    
    if (options.status) {
      let results = await db.getAllFromIndex('words', 'by-status', options.status);
      
      if (options.offset) {
        results = results.slice(options.offset);
      }
      
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      
      return results;
    }
    
    let results = await db.getAll('words');
    
    if (options.offset) {
      results = results.slice(options.offset);
    }
    
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  /**
   * Get words due for review
   */
  async getWordsDue(limit?: number): Promise<WordEntry[]> {
    const db = await getDB();
    const now = Date.now();
    
    const tx = db.transaction('words', 'readonly');
    const index = tx.store.index('by-due');
    
    const results: WordEntry[] = [];
    let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
    
    while (cursor && (!limit || results.length < limit)) {
      const word = cursor.value;
      if (word.status === 'learning') {
        results.push(word);
      }
      cursor = await cursor.continue();
    }
    
    return results;
  }

  /**
   * Update word
   */
  async updateWord(word: WordEntry): Promise<void> {
    const db = await getDB();
    await db.put('words', word);
  }

  /**
   * Delete word
   */
  async deleteWord(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('words', id);
  }

  /**
   * Mark word as learned
   */
  async markAsLearned(id: string): Promise<void> {
    const word = await this.getWord(id);
    if (word) {
      word.status = 'learned';
      await this.updateWord(word);
    }
  }

  /**
   * Search words by text
   */
  async searchWords(query: string, limit = 50): Promise<WordEntry[]> {
    const db = await getDB();
    const allWords = await db.getAll('words');
    
    const lowerQuery = query.toLowerCase();
    return allWords
      .filter(word => 
        word.text.toLowerCase().includes(lowerQuery) ||
        word.definition.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * Get word count by status
   */
  async getWordCounts(): Promise<{ total: number; learning: number; learned: number }> {
    const db = await getDB();
    
    const learning = await db.countFromIndex('words', 'by-status', 'learning');
    const learned = await db.countFromIndex('words', 'by-status', 'learned');
    const total = learning + learned;
    
    return { total, learning, learned };
  }

  /**
   * Generate unique word ID
   */
  private generateWordId(text: string, language: string): string {
    return `${language}_${text.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Remove duplicate sources
   */
  private deduplicateSources(sources: WordSource[]): WordSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const key = `${source.url}_${source.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}