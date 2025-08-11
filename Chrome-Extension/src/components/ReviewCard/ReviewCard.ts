import { WordEntry } from '../../shared/types/index.js';

export interface ReviewCardProps {
  word: WordEntry;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (rating: 1 | 2 | 3 | 4 | 5) => void;
  showMeaning: boolean;
}

export class ReviewCard {
  private container: HTMLElement;
  private frontCard: HTMLElement;
  private backCard: HTMLElement;
  private props: ReviewCardProps;
  private isAnimating = false;

  constructor(container: HTMLElement, props: ReviewCardProps) {
    this.container = container;
    this.props = props;
    this.frontCard = this.createFrontCard();
    this.backCard = this.createBackCard();
    this.render();
    this.setupEventListeners();
  }

  private createFrontCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'review-card review-card-front';
    card.innerHTML = `
      <div class="card-header">
        <span class="difficulty-badge difficulty-medium">medium</span>
        <span class="word-type">${this.props.word.partOfSpeech.join(', ') || ''}</span>
      </div>
      <div class="card-content">
        <h2 class="word-text">${this.props.word.text}</h2>
        <div class="phonetic"></div>
        <div class="card-hint">点击或按空格键查看释义</div>
      </div>
      <div class="card-footer">
        <div class="progress-info">
          <span>复习次数: ${this.props.word.review.reviewCount}</span>
          <span>连胜: ${this.props.word.review.streak}</span>
        </div>
      </div>
    `;
    return card;
  }

  private createBackCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'review-card review-card-back';
    card.innerHTML = `
      <div class="card-header">
        <span class="difficulty-badge difficulty-medium">medium</span>
        <span class="word-type">${this.props.word.partOfSpeech.join(', ') || ''}</span>
      </div>
      <div class="card-content">
        <h2 class="word-text">${this.props.word.text}</h2>
        <div class="phonetic"></div>
        <div class="meanings">
          <div class="meaning-item">
            <span class="meaning-index">1.</span>
            <span class="meaning-text">${this.props.word.definition}</span>
          </div>
        </div>
        ${this.props.word.context?.sentence ? `
          <div class="examples">
            <h4>例句:</h4>
            <div class="example-item">${this.props.word.context.sentence}</div>
          </div>
        ` : ''}
      </div>
      <div class="card-footer">
        <div class="rating-buttons">
          <button class="rating-btn rating-1" data-rating="1" title="完全不认识">1<br>不认识</button>
          <button class="rating-btn rating-2" data-rating="2" title="印象模糊">2<br>模糊</button>
          <button class="rating-btn rating-3" data-rating="3" title="想起来了">3<br>记得</button>
          <button class="rating-btn rating-4" data-rating="4" title="很熟悉">4<br>熟悉</button>
          <button class="rating-btn rating-5" data-rating="5" title="完全掌握">5<br>掌握</button>
        </div>
      </div>
    `;
    return card;
  }

  private render(): void {
    this.container.innerHTML = '';
    const cardWrapper = document.createElement('div');
    cardWrapper.className = `card-wrapper ${this.props.isFlipped ? 'flipped' : ''}`;
    
    cardWrapper.appendChild(this.frontCard);
    cardWrapper.appendChild(this.backCard);
    this.container.appendChild(cardWrapper);
  }

  private setupEventListeners(): void {
    // Card flip on click
    this.frontCard.addEventListener('click', () => {
      if (!this.isAnimating) {
        this.props.onFlip();
      }
    });

    // Rating buttons
    const ratingButtons = this.backCard.querySelectorAll('.rating-btn');
    ratingButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const rating = parseInt((e.target as HTMLElement).dataset.rating!);
        this.props.onRate(rating as 1 | 2 | 3 | 4 | 5);
      });
    });
  }

  public updateProps(newProps: ReviewCardProps): void {
    this.props = newProps;
    this.frontCard = this.createFrontCard();
    this.backCard = this.createBackCard();
    this.render();
    this.setupEventListeners();
  }

  public flip(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const wrapper = this.container.querySelector('.card-wrapper') as HTMLElement;
    
    if (this.props.isFlipped) {
      wrapper.classList.remove('flipped');
    } else {
      wrapper.classList.add('flipped');
    }

    setTimeout(() => {
      this.isAnimating = false;
    }, 600); // Animation duration
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}