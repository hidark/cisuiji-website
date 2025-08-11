import type { WordEntry, Statistics, ReviewRating } from '../shared/types/index.js';
import { markWordReviewed, isWordDue, getDaysUntilDue, formatInterval } from '../core/srs/index.js';
import { ReviewCard, type ReviewCardProps } from '../components/ReviewCard/index.js';
import { useReviewSession } from '../components/ReviewSession/index.js';
import { useKeyboardShortcuts } from '../components/KeyboardHandler/index.js';

class PopupApp {
  private currentTab = 'learning';
  private words: WordEntry[] = [];
  private statistics: Statistics | null = null;
  private reviewingWord: WordEntry | null = null;
  
  // Learning system components
  private learningCard: ReviewCard | null = null;
  private keyboardShortcuts = useKeyboardShortcuts({ enabled: false });
  private unsubscribeFromStore: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadData();
    this.render();
  }

  private setupEventListeners(): void {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).closest('[data-tab]')?.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
    
    // Setup review system event listeners
    this.setupReviewSystemListeners();

    // Footer buttons
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.refresh();
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') });
    });

    // Modal controls
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.closeReviewModal();
    });

    // Review buttons
    document.querySelectorAll('.review-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const rating = (e.target as HTMLElement).getAttribute('data-rating') as ReviewRating;
        if (rating && this.reviewingWord) {
          this.submitReview(this.reviewingWord, rating);
        }
      });
    });

    // Modal backdrop click
    document.getElementById('review-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeReviewModal();
      }
    });

    // Keyboard shortcuts for modal
    document.addEventListener('keydown', (e) => {
      if (this.reviewingWord) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.submitReview(this.reviewingWord, 'again');
            break;
          case '2':
            e.preventDefault();
            this.submitReview(this.reviewingWord, 'hard');
            break;
          case '3':
            e.preventDefault();
            this.submitReview(this.reviewingWord, 'good');
            break;
          case '4':
            e.preventDefault();
            this.submitReview(this.reviewingWord, 'easy');
            break;
          case 'Escape':
            this.closeReviewModal();
            break;
        }
      }
    });
  }
  
  private setupReviewSystemListeners(): void {
    // Learning start button
    const startLearningBtn = document.getElementById('start-learning-btn');
    if (startLearningBtn) {
      startLearningBtn.addEventListener('click', () => {
        this.startLearningSession();
      });
    }
    
    // Word count slider for learning
    const wordCountSlider = document.getElementById('learning-word-count') as HTMLInputElement;
    const wordCountDisplay = document.querySelector('.word-count-display');
    if (wordCountSlider && wordCountDisplay) {
      wordCountSlider.addEventListener('input', () => {
        wordCountDisplay.textContent = wordCountSlider.value;
      });
    }
    
    // Session complete handlers
    const startNewSessionBtn = document.getElementById('start-new-learning-session');
    const backToStartBtn = document.getElementById('back-to-learning-start');
    
    if (startNewSessionBtn) {
      startNewSessionBtn.addEventListener('click', () => {
        this.startNewLearningSession();
      });
    }
    
    if (backToStartBtn) {
      backToStartBtn.addEventListener('click', () => {
        this.showLearningStart();
      });
    }
    
    // Subscribe to learning session store changes
    this.unsubscribeFromStore = useReviewSession.subscribe((state) => {
      this.updateLearningUI(state);
    });
  }

  private async loadData(): Promise<void> {
    this.showLoading(true);
    
    try {
      console.log('Popup: Loading data...');
      
      // Load words
      console.log('Popup: Requesting words...');
      const wordsResponse = await chrome.runtime.sendMessage({ type: 'GET_WORDS' });
      console.log('Popup: Words response:', wordsResponse);
      
      if (wordsResponse && wordsResponse.success) {
        this.words = wordsResponse.data || [];
        console.log('Popup: Loaded', this.words.length, 'words');
      } else {
        console.warn('Popup: Failed to load words:', wordsResponse);
        this.words = [];
      }

      // Load statistics
      console.log('Popup: Requesting statistics...');
      const statsResponse = await chrome.runtime.sendMessage({ type: 'GET_STATISTICS' });
      console.log('Popup: Statistics response:', statsResponse);
      
      if (statsResponse && statsResponse.success) {
        this.statistics = statsResponse.data;
        console.log('Popup: Loaded statistics:', this.statistics);
      } else {
        console.warn('Popup: Failed to load statistics:', statsResponse);
        this.statistics = {
          totalWords: 0,
          learningWords: 0,
          learnedWords: 0,
          todayAdded: 0,
          todayReviewed: 0,
          streakDays: 0,
          lastActiveAt: Date.now()
        };
      }
    } catch (error) {
      console.error('Popup: Error loading data:', error);
      // Set default values
      this.words = [];
      this.statistics = {
        totalWords: 0,
        learningWords: 0,
        learnedWords: 0,
        todayAdded: 0,
        todayReviewed: 0,
        streakDays: 0,
        lastActiveAt: Date.now()
      };
    } finally {
      this.showLoading(false);
    }
  }

  private async refresh(): Promise<void> {
    await this.loadData();
    this.render();
  }

  private showLoading(show: boolean): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.toggle('hidden', !show);
    }
  }

  private switchTab(tab: string): void {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-tab') === tab);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `content-${tab}`);
    });
    
    this.renderCurrentTab();
  }

  private render(): void {
    this.renderHeader();
    this.renderTabBadges();
    this.renderCurrentTab();
  }

  private renderHeader(): void {
    if (!this.statistics) return;

    const todayStats = document.getElementById('today-stats');
    const streakStats = document.getElementById('streak-stats');

    if (todayStats) {
      todayStats.textContent = `今日 ${this.statistics.todayReviewed}/${this.getDueWordsCount()}`;
    }

    if (streakStats) {
      streakStats.textContent = `连胜 ${this.statistics.streakDays}`;
    }
  }

  private renderTabBadges(): void {
    const dueCount = document.getElementById('due-count');
    const allCount = document.getElementById('all-count');
    const learnedCount = document.getElementById('learned-count');

    if (dueCount) {
      dueCount.textContent = this.getDueWordsCount().toString();
    }

    if (allCount) {
      allCount.textContent = this.words.filter(w => w.status === 'learning').length.toString();
    }

    if (learnedCount) {
      learnedCount.textContent = this.words.filter(w => w.status === 'learned').length.toString();
    }
  }

  private renderCurrentTab(): void {
    switch (this.currentTab) {
      case 'learning':
        this.renderLearningTab();
        break;
      case 'due':
        this.renderDueWords();
        break;
      case 'all':
        this.renderAllWords();
        break;
      case 'learned':
        this.renderLearnedWords();
        break;
    }
  }
  
  private renderLearningTab(): void {
    // Show learning start by default
    this.showLearningStart();
  }
  
  private showLearningStart(): void {
    const startContainer = document.getElementById('learning-start-container');
    const sessionContainer = document.getElementById('learning-session-container');
    const completeContainer = document.getElementById('learning-session-complete');
    
    if (startContainer) startContainer.classList.remove('hidden');
    if (sessionContainer) sessionContainer.classList.add('hidden');
    if (completeContainer) completeContainer.classList.add('hidden');
    
    // Disable keyboard shortcuts
    this.keyboardShortcuts.disable();
    
    // Reset session state
    useReviewSession.getState().resetSession();
  }
  
  private async startLearningSession(): Promise<void> {
    const wordCountSlider = document.getElementById('learning-word-count') as HTMLInputElement;
    const wordCount = parseInt(wordCountSlider?.value || '20');
    
    // Check if there are any learning words first
    const learningWords = this.words.filter(w => w.status === 'learning');
    if (learningWords.length === 0) {
      alert('没有可学习的单词！请先在网页上添加一些单词到你的单词本。');
      return;
    }
    
    // Hide start container, show session container
    const startContainer = document.getElementById('learning-start-container');
    const sessionContainer = document.getElementById('learning-session-container');
    
    if (startContainer) startContainer.classList.add('hidden');
    if (sessionContainer) sessionContainer.classList.remove('hidden');
    
    // Enable keyboard shortcuts
    this.keyboardShortcuts.enable();
    
    // Start the learning session with 'learning' mode
    await useReviewSession.getState().startSession('learning', wordCount);
    
    // Setup learning card
    this.setupLearningCard();
  }
  
  private startNewLearningSession(): void {
    const sessionState = useReviewSession.getState();
    sessionState.startSession('learning');
    
    // Hide complete screen, show session
    const sessionContainer = document.getElementById('learning-session-container');
    const completeContainer = document.getElementById('learning-session-complete');
    
    if (sessionContainer) sessionContainer.classList.remove('hidden');
    if (completeContainer) completeContainer.classList.add('hidden');
    
    this.keyboardShortcuts.enable();
    this.setupLearningCard();
  }
  
  private setupLearningCard(): void {
    const cardContainer = document.getElementById('learning-card-container');
    if (!cardContainer) return;
    
    const sessionState = useReviewSession.getState();
    if (!sessionState.currentWord) return;
    
    const cardProps: ReviewCardProps = {
      word: sessionState.currentWord,
      isFlipped: sessionState.isCardFlipped,
      onFlip: () => useReviewSession.getState().flipCard(),
      onRate: (rating) => useReviewSession.getState().rateWord(rating),
      showMeaning: sessionState.showMeaning
    };
    
    if (this.learningCard) {
      this.learningCard.updateProps(cardProps);
    } else {
      this.learningCard = new ReviewCard(cardContainer, cardProps);
    }
  }
  
  
  private updateLearningUI(state: any): void {
    // Update progress bar
    const currentIndex = document.getElementById('current-word-index');
    const totalCount = document.getElementById('total-words-count');
    const progressFill = document.getElementById('progress-fill');
    
    if (currentIndex) currentIndex.textContent = (state.currentWordIndex + 1).toString();
    if (totalCount) totalCount.textContent = state.totalWords.toString();
    if (progressFill) {
      const progress = state.totalWords > 0 ? ((state.currentWordIndex + 1) / state.totalWords) * 100 : 0;
      progressFill.style.width = `${progress}%`;
    }
    
    // Update learning card if needed
    if (state.status === 'active' && state.currentWord && this.learningCard) {
      const cardProps: ReviewCardProps = {
        word: state.currentWord,
        isFlipped: state.isCardFlipped,
        onFlip: () => useReviewSession.getState().flipCard(),
        onRate: (rating) => useReviewSession.getState().rateWord(rating),
        showMeaning: state.showMeaning
      };
      this.learningCard.updateProps(cardProps);
    }
    
    // Handle session completion
    if (state.status === 'completed') {
      this.showLearningComplete(state);
    }
  }
  
  private showLearningComplete(state: any): void {
    const sessionContainer = document.getElementById('learning-session-container');
    const completeContainer = document.getElementById('learning-session-complete');
    
    if (sessionContainer) sessionContainer.classList.add('hidden');
    if (completeContainer) completeContainer.classList.remove('hidden');
    
    // Update stats
    const wordCount = document.getElementById('session-word-count');
    const avgRating = document.getElementById('session-avg-rating');
    const duration = document.getElementById('session-duration');
    
    if (wordCount) wordCount.textContent = state.reviewedWords.length.toString();
    if (avgRating) avgRating.textContent = state.averageRating.toFixed(1);
    if (duration && state.startTime && state.endTime) {
      const minutes = Math.round((state.endTime - state.startTime) / 60000);
      duration.textContent = `${minutes}分钟`;
    }
    
    // Disable keyboard shortcuts
    this.keyboardShortcuts.disable();
    
    // Clean up learning card
    if (this.learningCard) {
      this.learningCard.destroy();
      this.learningCard = null;
    }
  }

  private renderDueWords(): void {
    const container = document.getElementById('due-list');
    const empty = document.getElementById('due-empty');
    
    if (!container || !empty) return;

    const dueWords = this.words.filter(word => isWordDue(word));
    
    if (dueWords.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = dueWords.map(word => this.renderWordItem(word, true)).join('');
    this.attachWordItemListeners(container);
  }

  private renderAllWords(): void {
    const container = document.getElementById('all-list');
    const empty = document.getElementById('all-empty');
    
    if (!container || !empty) return;

    const learningWords = this.words.filter(w => w.status === 'learning');
    
    if (learningWords.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = learningWords.map(word => this.renderWordItem(word, false)).join('');
    this.attachWordItemListeners(container);
  }

  private renderLearnedWords(): void {
    const container = document.getElementById('learned-list');
    const empty = document.getElementById('learned-empty');
    
    if (!container || !empty) return;

    const learnedWords = this.words.filter(w => w.status === 'learned');
    
    if (learnedWords.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    container.innerHTML = learnedWords.map(word => this.renderWordItem(word, false)).join('');
    this.attachWordItemListeners(container);
  }

  private renderWordItem(word: WordEntry, isDueTab: boolean): string {
    const isDue = isWordDue(word);
    const daysUntilDue = getDaysUntilDue(word);
    const source = word.source[0];
    
    const dueText = isDue ? '现在' : formatInterval(Math.abs(daysUntilDue));
    const dueClass = isDue ? 'due' : '';
    const learnedClass = word.status === 'learned' ? 'learned' : '';
    
    return `
      <div class="word-item ${dueClass} ${learnedClass}" data-word-id="${word.id}">
        <div class="word-header">
          <div class="word-text">${word.text}</div>
          <div class="word-actions">
            ${word.status === 'learning' && isDue ? 
              `<button class="word-btn btn-review" data-action="review">复习</button>` : ''
            }
            ${word.status === 'learning' ? 
              `<button class="word-btn btn-learned" data-action="learned">已会</button>` : ''
            }
            <button class="word-btn btn-delete" data-action="delete">删除</button>
          </div>
        </div>
        <div class="word-definition">${word.definition || '正在获取释义...'}</div>
        <div class="word-meta">
          <span class="word-pos">${word.partOfSpeech.join(', ') || 'unknown'}</span>
          <span class="word-due">${isDueTab ? dueText : `${formatInterval(word.review.intervalDays)}`}</span>
        </div>
        <div class="word-meta">
          <span class="word-source" title="${source?.title || ''}">${source?.title || ''}</span>
          <span>${new Date(word.addedAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }

  private attachWordItemListeners(container: HTMLElement): void {
    container.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const wordItem = target.closest('.word-item') as HTMLElement;
      
      if (!wordItem) return;
      
      const wordId = wordItem.getAttribute('data-word-id');
      const action = target.getAttribute('data-action');
      
      if (!wordId) return;
      
      const word = this.words.find(w => w.id === wordId);
      if (!word) return;

      switch (action) {
        case 'review':
          this.openReviewModal(word);
          break;
        case 'learned':
          await this.markAsLearned(word);
          break;
        case 'delete':
          await this.deleteWord(word);
          break;
        default:
          // Click on word item itself - show review modal if due
          if (word.status === 'learning' && isWordDue(word)) {
            this.openReviewModal(word);
          }
      }
    });
  }

  private openReviewModal(word: WordEntry): void {
    this.reviewingWord = word;
    
    const modal = document.getElementById('review-modal');
    const wordText = document.getElementById('review-word');
    const definition = document.getElementById('review-definition');
    const pos = document.getElementById('review-pos');
    const context = document.getElementById('review-context');
    
    if (modal) modal.classList.remove('hidden');
    if (wordText) wordText.textContent = word.text;
    if (definition) definition.textContent = word.definition || '正在获取释义...';
    if (pos) pos.textContent = word.partOfSpeech.join(', ') || '';
    
    if (context) {
      if (word.context?.sentence) {
        context.textContent = `"${word.context.sentence}"`;
        context.classList.remove('hidden');
      } else {
        context.classList.add('hidden');
      }
    }
  }

  private closeReviewModal(): void {
    const modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
    this.reviewingWord = null;
  }

  private async submitReview(word: WordEntry, rating: ReviewRating): Promise<void> {
    try {
      // Calculate new review data
      const updatedWord = markWordReviewed(word, rating);
      
      // Update word in storage
      await chrome.runtime.sendMessage({
        type: 'UPDATE_WORD',
        word: updatedWord
      });
      
      // Update local data
      const index = this.words.findIndex(w => w.id === word.id);
      if (index !== -1) {
        this.words[index] = updatedWord;
      }
      
      this.closeReviewModal();
      this.render();
      
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  }

  private async markAsLearned(word: WordEntry): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'MARK_LEARNED',
        id: word.id
      });
      
      // Update local data
      const index = this.words.findIndex(w => w.id === word.id);
      if (index !== -1) {
        this.words[index].status = 'learned';
      }
      
      this.render();
      
    } catch (error) {
      console.error('Error marking as learned:', error);
    }
  }

  private async deleteWord(word: WordEntry): Promise<void> {
    if (!confirm(`确定要删除单词 "${word.text}" 吗？`)) {
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_WORD',
        id: word.id
      });
      
      // Update local data
      this.words = this.words.filter(w => w.id !== word.id);
      this.render();
      
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }

  private getDueWordsCount(): number {
    return this.words.filter(word => isWordDue(word)).length;
  }
  
  // Clean up when popup is closed
  private cleanup(): void {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
    }
    
    this.keyboardShortcuts.destroy();
    
    if (this.learningCard) {
      this.learningCard.destroy();
    }
  }
}

// Initialize the popup app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  
  // Clean up when window is closed
  window.addEventListener('beforeunload', () => {
    // @ts-ignore
    app.cleanup();
  });
});