import type { AddWordMessage, WordContext } from '../shared/types';

class ContentScript {
  private lastSelection: string = '';
  private selectionContext: WordContext | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Listen for context menu creation
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    console.log('词随记 Content Script loaded');
  }

  private handleSelectionChange(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.lastSelection = '';
      this.selectionContext = null;
      return;
    }

    const selectedText = selection.toString().trim();
    
    // Only process non-empty text selections
    if (selectedText && selectedText !== this.lastSelection) {
      this.lastSelection = selectedText;
      this.selectionContext = this.getSelectionContext(selection);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Alt + S shortcut to add selected word
    if (event.altKey && event.key === 's') {
      event.preventDefault();
      this.addSelectedWord();
    }
  }

  private handleContextMenu(_event: MouseEvent): void {
    // Update context for right-click if there's a selection
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      this.lastSelection = selection.toString().trim();
      this.selectionContext = this.getSelectionContext(selection);
    }
  }

  private getSelectionContext(selection: Selection): WordContext | null {
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find the containing text node or element
    let textContainer = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as Element;

    if (!textContainer) return null;

    // Get the full text of the containing element
    const fullText = textContainer.textContent || '';
    const selectedText = selection.toString();
    
    // Find the position of selected text in the full text
    const startPos = fullText.indexOf(selectedText);
    if (startPos === -1) return null;

    // Extract sentence containing the selection
    const sentence = this.extractSentence(fullText, startPos, selectedText.length);
    
    // Extract paragraph if possible
    const paragraph = this.extractParagraph(textContainer);

    return {
      sentence,
      paragraph,
      position: [startPos, startPos + selectedText.length]
    };
  }

  private extractSentence(fullText: string, startPos: number, length: number): string {
    // Find sentence boundaries (. ! ? followed by space/newline/end)
    const beforeText = fullText.substring(0, startPos);
    const afterText = fullText.substring(startPos + length);
    
    // Look for sentence start
    const sentenceStartMatch = beforeText.match(/[.!?]\s+[A-Z].*?$/);
    const sentenceStart = sentenceStartMatch 
      ? beforeText.length - sentenceStartMatch[0].length + sentenceStartMatch[0].indexOf(sentenceStartMatch[0].match(/[A-Z]/)![0])
      : Math.max(0, beforeText.lastIndexOf('\n') + 1);
    
    // Look for sentence end
    const sentenceEndMatch = afterText.match(/^.*?[.!?](?=\s+[A-Z]|\s*$|\s*\n)/);
    const sentenceEnd = sentenceEndMatch 
      ? startPos + length + sentenceEndMatch[0].length
      : Math.min(fullText.length, fullText.indexOf('\n', startPos + length));
    
    return fullText.substring(sentenceStart, sentenceEnd === -1 ? fullText.length : sentenceEnd).trim();
  }

  private extractParagraph(element: Element): string | undefined {
    // Find the containing paragraph element
    let paragraphElement = element;
    while (paragraphElement && !['P', 'DIV', 'ARTICLE', 'SECTION'].includes(paragraphElement.tagName)) {
      paragraphElement = paragraphElement.parentElement!;
    }
    
    if (!paragraphElement) return undefined;
    
    const text = paragraphElement.textContent?.trim();
    return text && text.length < 1000 ? text : undefined;
  }

  private async addSelectedWord(): Promise<void> {
    if (!this.lastSelection) {
      console.log('No text selected');
      return;
    }

    // Validate selection (should be a single word or short phrase)
    if (!this.isValidWordSelection(this.lastSelection)) {
      console.log('Invalid word selection:', this.lastSelection);
      this.showToast('请选择单个单词或短语', 'warning');
      return;
    }

    const wordData = {
      text: this.lastSelection,
      pageTitle: document.title,
      url: window.location.href,
      language: this.detectLanguage(this.lastSelection),
      context: this.selectionContext || undefined
    };

    try {
      const message: AddWordMessage = {
        type: 'ADD_WORD',
        data: wordData
      };

      // Send to background script
      const response = await chrome.runtime.sendMessage(message);
      
      if (response && response.success) {
        this.showToast('已添加到单词本 ✓', 'success');
        console.log('Word added successfully:', this.lastSelection);
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to add word:', error);
      this.showToast('添加失败，请重试', 'error');
    }
  }

  private isValidWordSelection(text: string): boolean {
    // Check if it's a reasonable word or phrase
    if (text.length > 50) return false;
    if (text.length < 2) return false;
    
    // Should contain mainly letters
    const letterRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    return letterRatio > 0.5;
  }

  private detectLanguage(text: string): string {
    // Simple language detection - can be improved
    const hasEnglish = /[a-zA-Z]/.test(text);
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    
    if (hasEnglish && !hasChinese) return 'en';
    if (hasChinese && !hasEnglish) return 'zh';
    
    // Default to English for mixed or unclear cases
    return 'en';
  }

  private showToast(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    // Remove existing toast
    const existing = document.getElementById('cisui-toast');
    if (existing) {
      existing.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'cisui-toast';
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      zIndex: '999999',
      opacity: '0',
      transform: 'translateY(-10px)',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      backgroundColor: type === 'success' ? '#10B981' : 
                      type === 'warning' ? '#F59E0B' : '#EF4444'
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// Initialize content script
new ContentScript();

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selection = window.getSelection();
    sendResponse({
      text: selection?.toString()?.trim() || '',
      url: window.location.href,
      title: document.title
    });
  }
});