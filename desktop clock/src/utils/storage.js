const STORAGE_KEYS = {
  SETTINGS: 'clockSettings',
  REMINDERS: 'reminders',
  MEMOS: 'memos',
  WINDOW_POSITION: 'windowPosition'
};

class Storage {
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  }

  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  static getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS, {
      format24: true,
      showDate: true,
      showWeek: true,
      opacity: 0.9,
      alwaysOnTop: true,
      lockPosition: false,
      theme: 'dark',
      fontSize: 'medium',
      soundEnabled: true,
      autoStart: false,
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff'
    });
  }

  static setSettings(settings) {
    return this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  static getReminders() {
    return this.get(STORAGE_KEYS.REMINDERS, []);
  }

  static setReminders(reminders) {
    return this.set(STORAGE_KEYS.REMINDERS, reminders);
  }

  static addReminder(reminder) {
    const reminders = this.getReminders();
    reminders.push({
      ...reminder,
      id: Date.now(),
      createdAt: new Date().toISOString()
    });
    return this.setReminders(reminders);
  }

  static updateReminder(id, updates) {
    const reminders = this.getReminders();
    const index = reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      reminders[index] = { ...reminders[index], ...updates };
      return this.setReminders(reminders);
    }
    return false;
  }

  static deleteReminder(id) {
    const reminders = this.getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    return this.setReminders(filtered);
  }

  static getMemos() {
    return this.get(STORAGE_KEYS.MEMOS, []);
  }

  static setMemos(memos) {
    return this.set(STORAGE_KEYS.MEMOS, memos);
  }

  static addMemo(memo) {
    const memos = this.getMemos();
    memos.push({
      ...memo,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return this.setMemos(memos);
  }

  static updateMemo(id, updates) {
    const memos = this.getMemos();
    const index = memos.findIndex(m => m.id === id);
    if (index !== -1) {
      memos[index] = { 
        ...memos[index], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return this.setMemos(memos);
    }
    return false;
  }

  static deleteMemo(id) {
    const memos = this.getMemos();
    const filtered = memos.filter(m => m.id !== id);
    return this.setMemos(filtered);
  }

  static getWindowPosition() {
    return this.get(STORAGE_KEYS.WINDOW_POSITION, null);
  }

  static setWindowPosition(position) {
    return this.set(STORAGE_KEYS.WINDOW_POSITION, position);
  }
}

export default Storage;