// src/popup.ts

import { ProgramData, UserSettings, Message, MessageResponse } from './types';

class PopupController {
  private savedPrograms: ProgramData[] = [];
  private settings: UserSettings = {
    isPremium: false,
    maxSavedPrograms: 3,
    autoSave: false,
    notificationsEnabled: true,
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.analyzeCurrentPage();
  }

  private async loadData(): Promise<void> {
    try {
      const programsResponse = await this.sendMessage({ type: 'GET_SAVED_PROGRAMS' });
      if (programsResponse.success) {
        this.savedPrograms = programsResponse.data || [];
      }

      const settingsData = await chrome.storage.local.get('settings');
      if (settingsData.settings) {
        this.settings = settingsData.settings;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private setupEventListeners(): void {
    // Save button
    document.getElementById('saveBtn')?.addEventListener('click', () => {
      this.saveCurrentProgram();
    });

    // Compare button
    document.getElementById('compareBtn')?.addEventListener('click', () => {
      this.showComparison();
    });

    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      if (this.settings.isPremium) {
        this.exportToSpreadsheet();
      } else {
        this.showPremiumPrompt();
      }
    });

    // Upgrade button
    document.getElementById('upgradeBtn')?.addEventListener('click', () => {
      this.handleUpgrade();
    });

    // Close modal
    document.getElementById('closeModal')?.addEventListener('click', () => {
      this.hideComparison();
    });

    // Settings, help, feedback links
    document.getElementById('settingsLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });

    document.getElementById('helpLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/your-repo/course-compare#help' });
    });

    document.getElementById('feedbackLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://forms.google.com/your-feedback-form' });
    });
  }

  private async analyzeCurrentPage(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url || !tab.id) return;

      const pageTitle = document.getElementById('pageTitle')!;
      const pageUrl = document.getElementById('pageUrl')!;
      const pageStatus = document.getElementById('pageStatus')!;
      const saveBtn = document.getElementById('saveBtn')! as HTMLButtonElement;

      pageTitle.textContent = tab.title || 'Unknown Page';
      pageUrl.textContent = new URL(tab.url).hostname;

      // Check if this looks like a program page
      const isProgramPage = await this.detectProgramPage(tab);
      
      if (isProgramPage) {
        pageStatus.textContent = 'Program detected';
        pageStatus.className = 'status status-success';
        saveBtn.disabled = false;
      } else {
        pageStatus.textContent = 'No program detected';
        pageStatus.className = 'status status-inactive';
        saveBtn.disabled = true;
      }

      // Check if already saved
      const alreadySaved = this.savedPrograms.some(p => p.url === tab.url);
      if (alreadySaved) {
        saveBtn.textContent = '✅ Already Saved';
        saveBtn.disabled = true;
      }

    } catch (error) {
      console.error('Failed to analyze current page:', error);
    }
  }

  private async detectProgramPage(tab: chrome.tabs.Tab): Promise<boolean> {
    const indicators = [
      'program', 'course', 'degree', 'masters', 'bachelor', 'phd', 'doctorate',
      'tuition', 'admission', 'university', 'college'
    ];

    const url = tab.url?.toLowerCase() || '';
    const title = tab.title?.toLowerCase() || '';

    return indicators.some(indicator => 
      url.includes(indicator) || title.includes(indicator)
    );
  }

  private async saveCurrentProgram(): Promise<void> {
    this.showLoading(true);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      // Trigger content script extraction
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.dispatchEvent(new CustomEvent('courseCompareExtract'));
        }
      });

      // Reload data after a short delay
      setTimeout(async () => {
        await this.loadData();
        this.updateUI();
        this.analyzeCurrentPage();
        this.showLoading(false);
      }, 1500);

    } catch (error) {
      console.error('Failed to save program:', error);
      this.showLoading(false);
      this.showNotification('Failed to save program', 'error');
    }
  }

  private updateUI(): void {
    this.updateProgramCount();
    this.updateProgramsList();
    this.updateCompareButton();
    this.updatePremiumSection();
  }

  private updateProgramCount(): void {
    const countElement = document.getElementById('programCount')!;
    const max = this.settings.maxSavedPrograms;
    countElement.textContent = `${this.savedPrograms.length}/${this.settings.isPremium ? '∞' : max}`;
  }

  private updateProgramsList(): void {
    const listElement = document.getElementById('programsList')!;
    const emptyState = document.getElementById('emptyState')!;

    if (this.savedPrograms.length === 0) {
      listElement.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    listElement.style.display = 'block';
    emptyState.style.display = 'none';

    listElement.innerHTML = this.savedPrograms.map(program => `
      <div class="program-item" data-id="${program.id}">
        <div class="program-header">
          <div class="program-title">${program.title}</div>
          <button class="remove-btn" onclick="popupController.removeProgram('${program.id}')">×</button>
        </div>
        <div class="program-university">${program.university}</div>
        <div class="program-details">
          ${program.duration ? `<span class="detail">${program.duration}</span>` : ''}
          ${program.tuition ? `<span class="detail">${program.tuition}</span>` : ''}
          ${program.deadline ? `<span class="detail">Due: ${program.deadline}</span>` : ''}
        </div>
        <div class="program-meta">
          <span class="program-url">${new URL(program.url).hostname}</span>
          <span class="program-date">${this.formatDate(program.extractedAt)}</span>
        </div>
      </div>
    `).join('');
  }

  private updateCompareButton(): void {
    const compareBtn = document.getElementById('compareBtn')! as HTMLButtonElement;
    compareBtn.disabled = this.savedPrograms.length < 2;
  }

  private updatePremiumSection(): void {
    const premiumSection = document.getElementById('premiumSection')!;
    const exportBtn = document.getElementById('exportBtn')! as HTMLButtonElement;
    
    if (this.settings.isPremium) {
      premiumSection.style.display = 'none';
      exportBtn.disabled = this.savedPrograms.length === 0;
    } else {
      premiumSection.style.display = 'block';
      exportBtn.disabled = true;
    }
  }

  public async removeProgram(programId: string): Promise<void> {
    try {
      const response = await this.sendMessage({
        type: 'REMOVE_PROGRAM',
        payload: { id: programId }
      });

      if (response.success) {
        await this.loadData();
        this.updateUI();
        this.analyzeCurrentPage();
      }
    } catch (error) {
      console.error('Failed to remove program:', error);
    }
  }

  private showComparison(): void {
    const modal = document.getElementById('comparisonModal')!;
    const content = document.getElementById('comparisonContent')!;
    
    content.innerHTML = this.generateComparisonTable();
    modal.style.display = 'flex';
  }

  private hideComparison(): void {
    const modal = document.getElementById('comparisonModal')!;
    modal.style.display = 'none';
  }

  private generateComparisonTable(): string {
    if (this.savedPrograms.length === 0) return '<p>No programs to compare</p>';

    const fields = ['University', 'Duration', 'Tuition', 'Deadline', 'GRE'];
    
    let html = '<div class="comparison-table">';
    
    // Header row
    html += '<div class="table-row table-header">';
    html += '<div class="table-cell">Program</div>';
    this.savedPrograms.forEach(program => {
      html += `<div class="table-cell">${program.title}</div>`;
    });
    html += '</div>';

    // Data rows
    fields.forEach(field => {
      html += '<div class="table-row">';
      html += `<div class="table-cell table-label">${field}</div>`;
      
      this.savedPrograms.forEach(program => {
        let value = '';
        switch (field) {
          case 'University': value = program.university; break;
          case 'Duration': value = program.duration || 'N/A'; break;
          case 'Tuition': value = program.tuition || 'N/A'; break;
          case 'Deadline': value = program.deadline || 'N/A'; break;
          case 'GRE': value = program.gre || 'N/A'; break;
        }
        html += `<div class="table-cell">${value}</div>`;
      });
      
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  private exportToSpreadsheet(): void {
    if (!this.settings.isPremium) {
      this.showPremiumPrompt();
      return;
    }

    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['Program', 'University', 'Duration', 'Tuition', 'Deadline', 'GRE', 'URL'];
    const rows = this.savedPrograms.map(program => [
      program.title,
      program.university,
      program.duration || '',
      program.tuition || '',
      program.deadline || '',
      program.gre || '',
      program.url
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private showPremiumPrompt(): void {
    this.showNotification('Upgrade to Premium for unlimited features!', 'info');
  }

  private handleUpgrade(): void {
    // In a real app, this would open a payment flow
    if (confirm('This would open the upgrade flow. For demo purposes, would you like to enable Premium mode?')) {
      this.settings.isPremium = true;
      this.settings.maxSavedPrograms = 999;
      
      chrome.storage.local.set({ settings: this.settings });
      this.updateUI();
      this.showNotification('Premium activated! (Demo mode)', 'success');
    }
  }

  private openSettings(): void {
    // In a real extension, this might open an options page
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  private showLoading(show: boolean): void {
    const overlay = document.getElementById('loadingOverlay')!;
    overlay.style.display = show ? 'flex' : 'none';
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private async sendMessage(message: Message): Promise<MessageResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
}

// Global instance for HTML onclick handlers
declare global {
  interface Window {
    popupController: PopupController;
  }
}

const popupController = new PopupController();
window.popupController = popupController;