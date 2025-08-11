import type { DictionaryResponse } from '../../shared/types';
import { getDB } from '../storage/database';

export interface DictionaryProvider {
  name: string;
  timeout: number;
  isAvailable(): Promise<boolean>;
  getDefinition(word: string): Promise<DictionaryResponse>;
}

export class DictionaryService {
  private providers: DictionaryProvider[] = [];
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initProviders();
  }

  private initProviders(): void {
    this.providers = [
      new DictionaryAPIProvider(),
      new LocalDictionaryProvider()
    ];
  }

  /**
   * Get definition from available providers with fallback chain
   */
  async getDefinition(word: string): Promise<DictionaryResponse> {
    const normalizedWord = word.toLowerCase().trim();
    
    // Check cache first
    const cached = await this.getCachedDefinition(normalizedWord);
    if (cached) {
      return cached;
    }

    // Try providers in order
    for (const provider of this.providers) {
      try {
        if (!(await provider.isAvailable())) {
          console.log(`Provider ${provider.name} not available, skipping`);
          continue;
        }

        console.log(`Trying provider: ${provider.name}`);
        const result = await this.withTimeout(
          provider.getDefinition(normalizedWord),
          provider.timeout
        );

        if (result.success) {
          // Cache successful result
          await this.cacheDefinition(normalizedWord, result);
          console.log(`Definition found via ${provider.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }

    // All providers failed
    return {
      definition: `Definition not found for "${word}"`,
      partOfSpeech: ['unknown'],
      source: 'local',
      success: false
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
  }

  private async getCachedDefinition(word: string): Promise<DictionaryResponse | null> {
    try {
      const db = await getDB();
      const cached = await db.get('cache', word);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return {
          definition: cached.definition,
          partOfSpeech: cached.partOfSpeech,
          source: 'local',
          success: true
        };
      }
      
      // Remove expired cache
      if (cached) {
        await db.delete('cache', word);
      }
      
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  private async cacheDefinition(word: string, definition: DictionaryResponse): Promise<void> {
    try {
      const db = await getDB();
      await db.put('cache', {
        word,
        definition: definition.definition,
        partOfSpeech: definition.partOfSpeech,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

/**
 * Dictionary API provider (dictionaryapi.dev)
 */
class DictionaryAPIProvider implements DictionaryProvider {
  name = 'DictionaryAPI';
  timeout = 5000;

  async isAvailable(): Promise<boolean> {
    return navigator.onLine;
  }

  async getDefinition(word: string): Promise<DictionaryResponse> {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No definitions found');
    }

    const entry = data[0];
    const meanings = entry.meanings || [];
    
    if (meanings.length === 0) {
      throw new Error('No meanings found');
    }

    // Extract first definition
    const firstMeaning = meanings[0];
    const definition = firstMeaning.definitions?.[0]?.definition || 'No definition available';
    
    // Extract all parts of speech
    const partOfSpeech = meanings.map((m: any) => m.partOfSpeech).filter(Boolean) as string[];

    return {
      definition,
      partOfSpeech: [...new Set(partOfSpeech)],
      source: 'online',
      success: true
    };
  }
}

/**
 * Local dictionary fallback provider
 */
class LocalDictionaryProvider implements DictionaryProvider {
  name = 'LocalDictionary';
  timeout = 1000;
  private dictionary: Map<string, { definition: string; pos: string[] }> = new Map();

  constructor() {
    this.initDictionary();
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async getDefinition(word: string): Promise<DictionaryResponse> {
    const entry = this.dictionary.get(word.toLowerCase());
    
    if (entry) {
      return {
        definition: entry.definition,
        partOfSpeech: entry.pos,
        source: 'local',
        success: true
      };
    }

    // Generate a basic definition for unknown words
    return {
      definition: `"${word}" - definition not available locally`,
      partOfSpeech: ['unknown'],
      source: 'local',
      success: false
    };
  }

  private initDictionary(): void {
    // Basic dictionary with common words
    const basicWords = [
      { word: 'hello', definition: 'A greeting used to express good wishes', pos: ['interjection'] },
      { word: 'world', definition: 'The earth and all its inhabitants', pos: ['noun'] },
      { word: 'computer', definition: 'An electronic device for processing data', pos: ['noun'] },
      { word: 'programming', definition: 'The process of writing computer programs', pos: ['noun'] },
      { word: 'language', definition: 'A system of communication used by people', pos: ['noun'] },
      { word: 'learn', definition: 'To acquire knowledge or skill', pos: ['verb'] },
      { word: 'study', definition: 'To acquire knowledge on a subject', pos: ['verb'] },
      { word: 'memory', definition: 'The ability to remember information', pos: ['noun'] },
      { word: 'vocabulary', definition: 'The set of words known to a person', pos: ['noun'] },
      { word: 'extension', definition: 'A software component that adds functionality', pos: ['noun'] }
    ];

    for (const { word, definition, pos } of basicWords) {
      this.dictionary.set(word, { definition, pos });
    }

    console.log(`Local dictionary initialized with ${this.dictionary.size} words`);
  }
}

// Singleton instance
let dictionaryService: DictionaryService;

export function getDictionaryService(): DictionaryService {
  if (!dictionaryService) {
    dictionaryService = new DictionaryService();
  }
  return dictionaryService;
}