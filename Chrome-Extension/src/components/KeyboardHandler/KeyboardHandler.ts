import { useReviewSession } from '../ReviewSession/store.js';

export interface KeyboardShortcuts {
  flipCard: string[];
  rate1: string[];
  rate2: string[];
  rate3: string[];
  rate4: string[];
  rate5: string[];
  nextWord: string[];
  previousWord: string[];
  pauseResume: string[];
  exitSession: string[];
  startSession: string[];
}

export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  flipCard: [' ', 'Space'],
  rate1: ['1', 'Digit1'],
  rate2: ['2', 'Digit2'],
  rate3: ['3', 'Digit3'],
  rate4: ['4', 'Digit4'],
  rate5: ['5', 'Digit5'],
  nextWord: ['ArrowRight', 'ArrowDown', 'n'],
  previousWord: ['ArrowLeft', 'ArrowUp', 'p'],
  pauseResume: ['p', 'Pause'],
  exitSession: ['Escape'],
  startSession: ['Enter', 's']
};

export class KeyboardHandler {
  private shortcuts: KeyboardShortcuts;
  private isEnabled: boolean = false;
  private boundHandler: (event: KeyboardEvent) => void;

  constructor(shortcuts: KeyboardShortcuts = DEFAULT_SHORTCUTS) {
    this.shortcuts = shortcuts;
    this.boundHandler = this.handleKeyPress.bind(this);
  }

  public enable(): void {
    if (!this.isEnabled) {
      document.addEventListener('keydown', this.boundHandler);
      this.isEnabled = true;
      console.log('Keyboard shortcuts enabled');
    }
  }

  public disable(): void {
    if (this.isEnabled) {
      document.removeEventListener('keydown', this.boundHandler);
      this.isEnabled = false;
      console.log('Keyboard shortcuts disabled');
    }
  }

  private handleKeyPress(event: KeyboardEvent): void {
    // Don't handle shortcuts if user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key;
    const code = event.code;
    const sessionStore = useReviewSession.getState();

    // Prevent default behavior for our shortcut keys
    if (this.isShortcutKey(key, code)) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Handle different shortcuts based on session state
    switch (sessionStore.status) {
      case 'idle':
        this.handleIdleShortcuts(key, code);
        break;
      case 'active':
        this.handleActiveShortcuts(key, code);
        break;
      case 'paused':
        this.handlePausedShortcuts(key, code);
        break;
      case 'completed':
        this.handleCompletedShortcuts(key, code);
        break;
    }
  }

  private handleIdleShortcuts(key: string, code: string): void {
    if (this.isShortcut('startSession', key, code)) {
      // Could trigger a session start dialog or default session
      console.log('Start session shortcut pressed - implement session start dialog');
    }
  }

  private handleActiveShortcuts(key: string, code: string): void {
    const sessionStore = useReviewSession.getState();

    if (this.isShortcut('flipCard', key, code)) {
      sessionStore.flipCard();
    } else if (this.isShortcut('rate1', key, code) && sessionStore.isCardFlipped) {
      sessionStore.rateWord(1);
    } else if (this.isShortcut('rate2', key, code) && sessionStore.isCardFlipped) {
      sessionStore.rateWord(2);
    } else if (this.isShortcut('rate3', key, code) && sessionStore.isCardFlipped) {
      sessionStore.rateWord(3);
    } else if (this.isShortcut('rate4', key, code) && sessionStore.isCardFlipped) {
      sessionStore.rateWord(4);
    } else if (this.isShortcut('rate5', key, code) && sessionStore.isCardFlipped) {
      sessionStore.rateWord(5);
    } else if (this.isShortcut('nextWord', key, code)) {
      sessionStore.nextWord();
    } else if (this.isShortcut('previousWord', key, code)) {
      sessionStore.previousWord();
    } else if (this.isShortcut('pauseResume', key, code)) {
      sessionStore.pauseSession();
    } else if (this.isShortcut('exitSession', key, code)) {
      sessionStore.endSession();
    }
  }

  private handlePausedShortcuts(key: string, code: string): void {
    const sessionStore = useReviewSession.getState();

    if (this.isShortcut('pauseResume', key, code)) {
      sessionStore.resumeSession();
    } else if (this.isShortcut('exitSession', key, code)) {
      sessionStore.endSession();
    }
  }

  private handleCompletedShortcuts(key: string, code: string): void {
    const sessionStore = useReviewSession.getState();

    if (this.isShortcut('startSession', key, code)) {
      // Start a new session with the same mode
      sessionStore.startSession(sessionStore.mode);
    } else if (this.isShortcut('exitSession', key, code)) {
      sessionStore.resetSession();
    }
  }

  private isShortcut(action: keyof KeyboardShortcuts, key: string, code: string): boolean {
    const shortcuts = this.shortcuts[action];
    return shortcuts.includes(key) || shortcuts.includes(code);
  }

  private isShortcutKey(key: string, code: string): boolean {
    const allShortcuts = Object.values(this.shortcuts).flat();
    return allShortcuts.includes(key) || allShortcuts.includes(code);
  }

  public updateShortcuts(newShortcuts: Partial<KeyboardShortcuts>): void {
    this.shortcuts = { ...this.shortcuts, ...newShortcuts };
    console.log('Keyboard shortcuts updated:', this.shortcuts);
  }

  public getShortcuts(): KeyboardShortcuts {
    return { ...this.shortcuts };
  }

  public getHelpText(): { [key: string]: string } {
    return {
      'Space': 'Flip card',
      '1-5': 'Rate word (1=Poor, 5=Perfect)',
      'Arrow Keys': 'Navigate between words',
      'P': 'Pause/Resume session',
      'Escape': 'Exit session',
      'Enter': 'Start new session',
    };
  }

  public destroy(): void {
    this.disable();
  }
}