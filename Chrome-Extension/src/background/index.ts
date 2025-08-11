import { getWordStorage, getSettingsStorage, getStatisticsStorage } from '../core/storage';
import { getDictionaryService } from '../core/dictionary';
import type { AddWordMessage, WordEntry, WordSource } from '../shared/types';

class BackgroundService {
  private wordStorage = getWordStorage();
  private settingsStorage = getSettingsStorage();
  private statisticsStorage = getStatisticsStorage();
  private dictionaryService = getDictionaryService();

  constructor() {
    // 同步设置事件监听器 - 这是关键！
    this.setupEventListeners();
    
    // 异步初始化其他组件
    this.initializeAsync();
  }

  // 同步设置关键事件监听器
  private setupEventListeners(): void {
    console.log('Setting up event listeners synchronously...');
    
    // 消息监听器必须同步设置
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background: Received message:', message.type);
      this.handleMessage(message, sender, sendResponse);
      return true; // 异步处理标识
    });
    
    // 右键菜单点击监听器
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      console.log('Context menu clicked:', info.menuItemId);
      this.handleContextMenuClick(info, tab);
    });
    
    // 闹钟监听器
    chrome.alarms.onAlarm.addListener((alarm) => {
      console.log('Alarm triggered:', alarm.name);
      this.handleAlarm(alarm);
    });
    
    // 通知点击监听器
    chrome.notifications.onClicked.addListener((_notificationId) => {
      chrome.action.openPopup();
    });
    
    console.log('Event listeners setup completed');
  }

  // 异步初始化其他组件
  private async initializeAsync(): Promise<void> {
    try {
      console.log('Starting async initialization...');
      
      // 等待一点时间确保Service Worker完全启动
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 设置右键菜单
      await this.setupContextMenus();
      
      // 设置闹钟
      await this.setupAlarms();
      
      console.log('词随记 Background Service fully initialized');
    } catch (error) {
      console.error('Error during async initialization:', error);
    }
  }

  private async setupContextMenus(): Promise<void> {
    try {
      console.log('Setting up context menus...');
      
      // 清除现有菜单
      await chrome.contextMenus.removeAll();
      
      // 创建菜单项
      chrome.contextMenus.create({
        id: 'add-word',
        title: '加入单词本 (Alt+S)',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
      
      console.log('Context menus created successfully');
    } catch (error) {
      console.error('Error setting up context menus:', error);
    }
  }

  private async setupAlarms(): Promise<void> {
    try {
      console.log('Setting up alarms...');
      
      // 清除现有闹钟
      await chrome.alarms.clearAll();
      
      // 创建定期检查闹钟
      chrome.alarms.create('daily-review-check', {
        delayInMinutes: 1,
        periodInMinutes: 60
      });
      
      console.log('Alarms setup completed');
    } catch (error) {
      console.error('Error setting up alarms:', error);
    }
  }

  private async handleMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'ADD_WORD':
          console.log('Background: Handling ADD_WORD');
          const result = await this.handleAddWord(message as AddWordMessage);
          console.log('Background: ADD_WORD result:', result);
          sendResponse(result);
          break;
          
        case 'GET_WORDS':
          console.log('Background: Handling GET_WORDS');
          const words = await this.wordStorage.getWords(message.options || {});
          sendResponse({ success: true, data: words });
          break;
          
        case 'GET_WORDS_DUE':
          console.log('Background: Handling GET_WORDS_DUE');
          const dueWords = await this.wordStorage.getWordsDue(message.limit);
          sendResponse({ success: true, data: dueWords });
          break;
          
        case 'UPDATE_WORD':
          console.log('Background: Handling UPDATE_WORD');
          await this.wordStorage.updateWord(message.word);
          sendResponse({ success: true });
          break;
          
        case 'DELETE_WORD':
          console.log('Background: Handling DELETE_WORD');
          await this.wordStorage.deleteWord(message.id);
          sendResponse({ success: true });
          break;
          
        case 'MARK_LEARNED':
          console.log('Background: Handling MARK_LEARNED');
          await this.wordStorage.markAsLearned(message.id);
          sendResponse({ success: true });
          break;
          
        case 'GET_STATISTICS':
          console.log('Background: Handling GET_STATISTICS');
          const wordCounts = await this.wordStorage.getWordCounts();
          await this.statisticsStorage.syncWordCounts(wordCounts);
          const updatedStats = await this.statisticsStorage.getStatistics();
          sendResponse({ success: true, data: updatedStats });
          break;
          
        case 'GET_SETTINGS':
          console.log('Background: Handling GET_SETTINGS');
          const settings = await this.settingsStorage.getSettings();
          sendResponse({ success: true, data: settings });
          break;
          
        case 'UPDATE_SETTINGS':
          console.log('Background: Handling UPDATE_SETTINGS');
          await this.settingsStorage.saveSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('Background: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background: Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (info.menuItemId === 'add-word' && info.selectionText && tab?.id) {
      try {
        console.log('Context menu clicked:', info.selectionText);
        
        // 直接使用tab信息，避免executeScript问题
        const pageTitle = tab.title || 'Unknown';
        const pageUrl = tab.url || 'Unknown';
        
        const message: AddWordMessage = {
          type: 'ADD_WORD',
          data: {
            text: info.selectionText.trim(),
            pageTitle: pageTitle,
            url: pageUrl,
            language: this.detectLanguage(info.selectionText)
          }
        };
        
        console.log('Adding word via context menu:', message);
        const response = await this.handleAddWord(message);
        
        // 显示通知
        if (response.success) {
          console.log('Word added successfully via context menu');
          chrome.notifications.create({
            type: 'basic',
            title: '词随记',
            message: `已添加: ${info.selectionText}`
          });
        } else {
          console.error('Failed to add word:', response.error);
          chrome.notifications.create({
            type: 'basic',
            title: '词随记',
            message: `添加失败: ${response.error}`
          });
        }
      } catch (error) {
        console.error('Error handling context menu click:', error);
        chrome.notifications.create({
          type: 'basic',
          title: '词随记',
          message: '添加单词时发生错误，请重试'
        });
      }
    }
  }

  private async handleAddWord(message: AddWordMessage): Promise<{ success: boolean; error?: string; word?: WordEntry }> {
    try {
      const { text, pageTitle, url, language = 'en', context } = message.data;
      
      // 验证输入
      if (!text || text.length < 2 || text.length > 50) {
        return { success: false, error: 'Invalid word length' };
      }
      
      // 创建来源信息
      const source: WordSource[] = [{
        title: pageTitle,
        url: url,
        addedAt: Date.now()
      }];
      
      // 添加单词到存储
      const wordEntry = await this.wordStorage.addWord({
        text: text.toLowerCase(),
        language,
        definition: '', // 将通过词典服务填充
        partOfSpeech: [],
        source,
        context
      });
      
      // 更新统计
      await this.statisticsStorage.incrementTodayAdded();
      
      // 异步获取释义
      this.fetchDefinitionAsync(wordEntry.id, text);
      
      console.log('Word added successfully:', text);
      return { success: true, word: wordEntry };
      
    } catch (error) {
      console.error('Error adding word:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async fetchDefinitionAsync(wordId: string, text: string): Promise<void> {
    try {
      console.log(`Fetching definition for: ${text} (ID: ${wordId})`);
      
      // 获取词典释义
      const definition = await this.dictionaryService.getDefinition(text);
      
      // 更新单词释义
      const word = await this.wordStorage.getWord(wordId);
      if (word) {
        word.definition = definition.definition;
        word.partOfSpeech = definition.partOfSpeech;
        await this.wordStorage.updateWord(word);
        
        console.log(`Definition updated for: ${text} from ${definition.source}`);
      }
      
    } catch (error) {
      console.error('Error fetching definition:', error);
      
      // 备选方案：更新为错误消息
      try {
        const word = await this.wordStorage.getWord(wordId);
        if (word && !word.definition) {
          word.definition = `Definition not available for "${text}"`;
          word.partOfSpeech = ['unknown'];
          await this.wordStorage.updateWord(word);
        }
      } catch (fallbackError) {
        console.error('Error in fallback definition update:', fallbackError);
      }
    }
  }

  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (alarm.name === 'daily-review-check') {
      await this.checkReviewReminder();
    }
  }

  private async checkReviewReminder(): Promise<void> {
    try {
      const settings = await this.settingsStorage.getSettings();
      
      if (!settings.notifyEnabled) return;
      
      // 检查是否在通知时间窗内
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime < settings.notifyWindow.start || currentTime > settings.notifyWindow.end) {
        return;
      }
      
      // 检查待复习单词
      const dueWords = await this.wordStorage.getWordsDue(settings.dailyReviewLimit);
      
      if (dueWords.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          title: '词随记 - 复习提醒',
          message: `有 ${dueWords.length} 个单词需要复习`,
          isClickable: true
        });
        
        console.log(`Review reminder sent for ${dueWords.length} words`);
      }
      
    } catch (error) {
      console.error('Error checking review reminder:', error);
    }
  }

  private detectLanguage(text: string): string {
    // 简单语言检测
    const hasEnglish = /[a-zA-Z]/.test(text);
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    
    if (hasEnglish && !hasChinese) return 'en';
    if (hasChinese && !hasEnglish) return 'zh';
    
    return 'en'; // 默认英语
  }
}

// 立即初始化Service Worker
console.log('Initializing Background Service...');
new BackgroundService();
console.log('Background Service initialization started');