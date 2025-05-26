// src/content-script.ts
import { ProgramDataExtractor } from './utils/extractor';

class ContentScript {
  private saveButton: HTMLElement | null = null;
  private isUniversityPage = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.isUniversityPage = this.detectUniversityPage();

    if (this.isUniversityPage) {
      this.createSaveButton();
      this.setupMessageListener();
    }
  }

  private detectUniversityPage(): boolean {
    const url = window.location.href.toLowerCase();
    const content = document.body.textContent?.toLowerCase() || '';

    const universityPatterns = [
      /\.edu\//,
      /\.ac\.uk\//,
      /\/programs?\//,
      /\/courses?\//,
      /\/degrees?\//,
      /\/admissions?\//
    ];
    const hasUniversityUrl = universityPatterns.some(pattern => pattern.test(url));

    const programKeywords = [
      'bachelor', 'master', 'phd', 'doctorate',
      'degree', 'program', 'major',
      'tuition', 'semester', 'credit',
      'admission', 'application'
    ];
    const keywordCount = programKeywords.filter(k => content.includes(k)).length;

    return hasUniversityUrl || keywordCount >= 3;
  }

  private createSaveButton(): void {
    this.saveButton = document.createElement('div');
    this.saveButton.id = 'course-compare-save-btn';
    this.saveButton.innerHTML = `
      <button type="button" class="cc-save-button">
        <span class="cc-icon">📌</span>
        <span class="cc-text">Save to Compare</span>
      </button>
    `;
    this.saveButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(this.saveButton);

    const button = this.saveButton.querySelector('.cc-save-button') as HTMLButtonElement;
    button?.addEventListener('click', () => this.saveProgram());
  }

  private async saveProgram(): Promise<void> {
    const button = this.saveButton?.querySelector('.cc-save-button') as HTMLButtonElement;
    const textSpan = button.querySelector('.cc-text') as HTMLSpanElement;
    const iconSpan = button.querySelector('.cc-icon') as HTMLSpanElement;

    try {
      const limitsResponse = await this.sendMessage({ action: 'checkLimits' });
      if (!limitsResponse.canSave) {
        this.showNotification('Free limit reached! Upgrade to Premium for unlimited saves.', 'warning');
        return;
      }

      const programData = ProgramDataExtractor.extractFromPage();

      button.disabled = true;
      textSpan.textContent = 'Saving...';
      iconSpan.textContent = '⏳';

      const response = await this.sendMessage({ action: 'saveProgram', data: programData });

      if (response.success) {
        textSpan.textContent = 'Saved!';
        iconSpan.textContent = '✅';
        this.showNotification('Program saved successfully!', 'success');

        setTimeout(() => {
          textSpan.textContent = 'Save to Compare';
          iconSpan.textContent = '📌';
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to save');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save program';
      this.showNotification(message, 'error');
      textSpan.textContent = 'Error';
      iconSpan.textContent = '❌';

      setTimeout(() => {
        textSpan.textContent = 'Save to Compare';
        iconSpan.textContent = '📌';
        button.disabled = false;
      }, 2000);
    }
  }

  private sendMessage(message: Record<string, any>): Promise<any> {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(message, response => {
        resolve(response || {});
      });
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    const notification = document.createElement('div');
    notification.className = `cc-notification cc-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
    `;

    const colors: Record<string, string> = {
      success: '#48bb78',
      error: '#f56565',
      warning: '#ed8936'
    };
    notification.style.backgroundColor = colors[type];

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'extractProgram') {
        const data = ProgramDataExtractor.extractFromPage();
        sendResponse({ data });
        return true; // Needed for async sendResponse
      }
    });
  }
}

// Initialize on load
new ContentScript();
