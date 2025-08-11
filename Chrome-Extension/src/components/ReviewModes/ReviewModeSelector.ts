import { ReviewMode } from '../ReviewSession/types.js';
import { ReviewModeManager, ReviewModeConfig } from './ReviewModeManager.js';

export interface ReviewModeStats {
  totalWords: number;
  newWords: number;
  learningWords: number;
  learnedWords: number;
  dueWords: number;
}

export interface ModeSelectionEvent {
  mode: ReviewMode;
  wordCount: number;
  config: ReviewModeConfig;
}

export class ReviewModeSelector {
  private container: HTMLElement;
  private modeManager: ReviewModeManager;
  private onModeSelect: (event: ModeSelectionEvent) => void;
  private selectedMode: ReviewMode = 'learning';
  private modeStats: Record<ReviewMode, ReviewModeStats> = {} as any;

  constructor(
    container: HTMLElement,
    onModeSelect: (event: ModeSelectionEvent) => void
  ) {
    this.container = container;
    this.onModeSelect = onModeSelect;
    this.modeManager = new ReviewModeManager();
    this.loadModeStats();
    this.render();
  }

  private async loadModeStats(): Promise<void> {
    const modes: ReviewMode[] = ['learning', 'test', 'quick'];
    
    try {
      for (const mode of modes) {
        this.modeStats[mode] = await this.modeManager.getModeStats(mode);
      }
      this.render(); // Re-render with stats
    } catch (error) {
      console.error('Failed to load mode statistics:', error);
    }
  }

  private render(): void {
    const configs = this.modeManager.getAllModeConfigs();
    
    this.container.innerHTML = `
      <div class="review-mode-selector">
        <div class="mode-selector-header">
          <h3>选择复习模式</h3>
          <p>根据你的学习需求选择合适的复习模式</p>
        </div>
        
        <div class="mode-options">
          ${Object.entries(configs).map(([mode, config]) => 
            this.renderModeOption(mode as ReviewMode, config)
          ).join('')}
        </div>
        
        <div class="session-settings">
          <div class="setting-group">
            <label for="wordCount">单词数量:</label>
            <input 
              type="range" 
              id="wordCount" 
              min="5" 
              max="${configs[this.selectedMode].maxWordCount}" 
              value="${configs[this.selectedMode].defaultWordCount}"
              class="word-count-slider"
            >
            <span class="word-count-display">${configs[this.selectedMode].defaultWordCount}</span>
          </div>
          
          <button class="start-review-btn" id="startReviewBtn">
            开始复习
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private renderModeOption(mode: ReviewMode, config: ReviewModeConfig): string {
    const stats = this.modeStats[mode] || {
      totalWords: 0,
      newWords: 0,
      learningWords: 0,
      learnedWords: 0,
      dueWords: 0
    };

    const isSelected = mode === this.selectedMode;
    const isAvailable = stats.totalWords > 0;

    return `
      <div class="mode-option ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}" 
           data-mode="${mode}">
        <div class="mode-header">
          <div class="mode-icon">${config.icon}</div>
          <div class="mode-info">
            <h4 class="mode-name">${config.name}</h4>
            <p class="mode-description">${config.description}</p>
          </div>
          <div class="mode-stats">
            <span class="total-words">${stats.totalWords} 词</span>
            ${stats.dueWords > 0 ? `<span class="due-words">${stats.dueWords} 到期</span>` : ''}
          </div>
        </div>
        
        <div class="mode-details">
          <div class="mode-features">
            <div class="feature-list">
              ${config.showHints ? '<span class="feature">💡 显示提示</span>' : ''}
              ${config.showExamples ? '<span class="feature">📖 显示例句</span>' : ''}
              ${config.timeLimit ? `<span class="feature">⏱️ ${config.timeLimit}分钟限时</span>` : ''}
              ${config.autoFlipDelay ? `<span class="feature">🔄 自动翻转</span>` : ''}
            </div>
          </div>
          
          <div class="word-distribution">
            <div class="distribution-bar">
              ${this.renderDistributionBar(stats)}
            </div>
            <div class="distribution-legend">
              ${stats.newWords > 0 ? `<span class="legend-item new">新词 ${stats.newWords}</span>` : ''}
              ${stats.learningWords > 0 ? `<span class="legend-item learning">学习中 ${stats.learningWords}</span>` : ''}
              ${stats.learnedWords > 0 ? `<span class="legend-item learned">已学会 ${stats.learnedWords}</span>` : ''}
            </div>
          </div>
        </div>
        
        ${!isAvailable ? '<div class="unavailable-overlay">暂无可复习单词</div>' : ''}
      </div>
    `;
  }

  private renderDistributionBar(stats: ReviewModeStats): string {
    if (stats.totalWords === 0) return '<div class="empty-bar"></div>';

    const newPercent = (stats.newWords / stats.totalWords) * 100;
    const learningPercent = (stats.learningWords / stats.totalWords) * 100;
    const learnedPercent = (stats.learnedWords / stats.totalWords) * 100;

    return `
      <div class="bar-segment new" style="width: ${newPercent}%"></div>
      <div class="bar-segment learning" style="width: ${learningPercent}%"></div>
      <div class="bar-segment learned" style="width: ${learnedPercent}%"></div>
    `;
  }

  private setupEventListeners(): void {
    // Mode selection
    const modeOptions = this.container.querySelectorAll('.mode-option:not(.disabled)');
    modeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const mode = (option as HTMLElement).dataset.mode as ReviewMode;
        this.selectMode(mode);
      });
    });

    // Word count slider
    const wordCountSlider = this.container.querySelector('#wordCount') as HTMLInputElement;
    const wordCountDisplay = this.container.querySelector('.word-count-display');
    
    if (wordCountSlider && wordCountDisplay) {
      wordCountSlider.addEventListener('input', () => {
        wordCountDisplay.textContent = wordCountSlider.value;
      });
    }

    // Start review button
    const startBtn = this.container.querySelector('#startReviewBtn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startReview();
      });
    }
  }

  private selectMode(mode: ReviewMode): void {
    this.selectedMode = mode;
    const config = this.modeManager.getModeConfig(mode);
    
    // Update slider limits and default value
    const wordCountSlider = this.container.querySelector('#wordCount') as HTMLInputElement;
    const wordCountDisplay = this.container.querySelector('.word-count-display');
    
    if (wordCountSlider && wordCountDisplay) {
      wordCountSlider.max = config.maxWordCount.toString();
      wordCountSlider.value = config.defaultWordCount.toString();
      wordCountDisplay.textContent = config.defaultWordCount.toString();
    }

    // Update visual selection
    this.container.querySelectorAll('.mode-option').forEach(option => {
      option.classList.remove('selected');
    });
    
    const selectedOption = this.container.querySelector(`[data-mode="${mode}"]`);
    if (selectedOption) {
      selectedOption.classList.add('selected');
    }
  }

  private startReview(): void {
    const config = this.modeManager.getModeConfig(this.selectedMode);
    const wordCountSlider = this.container.querySelector('#wordCount') as HTMLInputElement;
    const wordCount = parseInt(wordCountSlider?.value || config.defaultWordCount.toString());

    const event: ModeSelectionEvent = {
      mode: this.selectedMode,
      wordCount,
      config
    };

    this.onModeSelect(event);
  }

  public updateStats(): void {
    this.loadModeStats();
  }

  public getSelectedMode(): ReviewMode {
    return this.selectedMode;
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}