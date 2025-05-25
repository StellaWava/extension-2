// src/background.ts

import { ProgramData, StorageData, Message, MessageResponse, UserSettings } from './types';

class BackgroundService {
  private defaultSettings: UserSettings = {
    isPremium: false,
    maxSavedPrograms: 3,
    autoSave: false,
    notificationsEnabled: true,
  };

  constructor() {
    this.initializeStorage();
    this.setupMessageListeners();
    this.setupContextMenus();
  }

  private async initializeStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['savedPrograms', 'settings']);
      
      if (!result.savedPrograms) {
        await chrome.storage.local.set({ savedPrograms: [] });
      }
      
      if (!result.settings) {
        await chrome.storage.local.set({ settings: this.defaultSettings });
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        this.handleMessage(message).then(sendResponse);
        return true; // Keep the message channel open for async response
      }
    );
  }

  private setupContextMenus(): void {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'save-program',
        title: 'Save this program to compare',
        contexts: ['page', 'selection'],
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'save-program' && tab?.id) {
        this.triggerProgramExtraction(tab.id);
      }
    });
  }

  private async handleMessage(message: Message): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case 'SAVE_PROGRAM':
          return await this.saveProgram(message.payload);
        
        case 'GET_SAVED_PROGRAMS':
          return await this.getSavedPrograms();
        
        case 'REMOVE_PROGRAM':
          return await this.removeProgram(message.payload.id);
        
        case 'UPDATE_SETTINGS':
          return await this.updateSettings(message.payload);
        
        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async saveProgram(programData: ProgramData): Promise<MessageResponse> {
    const { savedPrograms, settings } = await chrome.storage.local.get(['savedPrograms', 'settings']);
    
    // Check if program already exists
    const existingProgram = savedPrograms.find((p: ProgramData) => 
      p.url === programData.url || 
      (p.title === programData.title && p.university === programData.university)
    );
    
    if (existingProgram) {
      return { success: false, error: 'Program already saved' };
    }

    // Check free tier limits
    if (!settings.isPremium && savedPrograms.length >= settings.maxSavedPrograms) {
      return { success: false, error: 'Free tier limit reached. Upgrade to Premium for unlimited saves.' };
    }

    // Add unique ID and timestamp
    const newProgram: ProgramData = {
      ...programData,
      id: this.generateId(),
      extractedAt: Date.now(),
    };

    const updatedPrograms = [...savedPrograms, newProgram];
    await chrome.storage.local.set({ savedPrograms: updatedPrograms });

    // Show notification
    if (settings.notificationsEnabled) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Course Compare',
        message: `Saved: ${programData.title} at ${programData.university}`,
      });
    }

    return { success: true, data: newProgram };
  }

  private async getSavedPrograms(): Promise<MessageResponse> {
    const { savedPrograms } = await chrome.storage.local.get('savedPrograms');
    return { success: true, data: savedPrograms || [] };
  }

  private async removeProgram(programId: string): Promise<MessageResponse> {
    const { savedPrograms } = await chrome.storage.local.get('savedPrograms');
    const updatedPrograms = savedPrograms.filter((p: ProgramData) => p.id !== programId);
    await chrome.storage.local.set({ savedPrograms: updatedPrograms });
    return { success: true, data: updatedPrograms };
  }

  private async updateSettings(newSettings: Partial<UserSettings>): Promise<MessageResponse> {
    const { settings } = await chrome.storage.local.get('settings');
    const updatedSettings = { ...settings, ...newSettings };
    await chrome.storage.local.set({ settings: updatedSettings });
    return { success: true, data: updatedSettings };
  }

  private async triggerProgramExtraction(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          window.dispatchEvent(new CustomEvent('courseCompareExtract'));
        },
      });
    } catch (error) {
      console.error('Failed to trigger program extraction:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the background service
new BackgroundService();