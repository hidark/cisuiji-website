import { KeyboardHandler, KeyboardShortcuts, DEFAULT_SHORTCUTS } from './KeyboardHandler.js';

let keyboardHandlerInstance: KeyboardHandler | null = null;

export interface UseKeyboardShortcutsOptions {
  shortcuts?: Partial<KeyboardShortcuts>;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { shortcuts = {}, enabled = true } = options;

  // Initialize singleton keyboard handler
  if (!keyboardHandlerInstance) {
    const mergedShortcuts = { ...DEFAULT_SHORTCUTS, ...shortcuts };
    keyboardHandlerInstance = new KeyboardHandler(mergedShortcuts);
  }

  // Enable/disable based on options
  if (enabled && keyboardHandlerInstance) {
    keyboardHandlerInstance.enable();
  } else if (!enabled && keyboardHandlerInstance) {
    keyboardHandlerInstance.disable();
  }

  return {
    enable: () => keyboardHandlerInstance?.enable(),
    disable: () => keyboardHandlerInstance?.disable(),
    updateShortcuts: (newShortcuts: Partial<KeyboardShortcuts>) =>
      keyboardHandlerInstance?.updateShortcuts(newShortcuts),
    getShortcuts: () => keyboardHandlerInstance?.getShortcuts() || DEFAULT_SHORTCUTS,
    getHelpText: () => keyboardHandlerInstance?.getHelpText() || {},
    destroy: () => {
      keyboardHandlerInstance?.destroy();
      keyboardHandlerInstance = null;
    }
  };
}

// Utility function to show keyboard shortcuts help
export function showKeyboardHelp(): void {
  if (!keyboardHandlerInstance) return;

  const helpText = keyboardHandlerInstance.getHelpText();
  const helpItems = Object.entries(helpText)
    .map(([key, description]) => `${key}: ${description}`)
    .join('\\n');

  console.log('Keyboard Shortcuts Help:\\n' + helpItems);
  
  // You could also show this in a modal or tooltip in the UI
}