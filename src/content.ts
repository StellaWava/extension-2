// src/content.ts

import { ProgramData, ExtractionConfig } from './types';

class ContentExtractor {
  private extractionConfig: ExtractionConfig = {
    title: [
      { selector: 'h1' },
      { selector: '[class*="program"], [class*="course"], [class*="degree"]' },
      { selector: 'title', transform: (text) => text.split('|')[0].trim() },
    ],
    university: [
      { selector: '[class*="university"], [class*="college"], [class*="school"]' },
      { selector: 'meta[property="og:site_name"]', attribute: 'content' },
      { selector: '.header [class*="logo"], .navbar [class*="brand"]' },
    ],
    duration: [
      { selector: '[class*="duration"], [class*="length"], [class*="time"]' },
      { selector: '*', transform: (text) => this.extractPattern(text, /(\d+\.?\d*)\s*(year|month|semester|term)s?/i) },
    ],
    tuition: [
      { selector: '[class*="tuition"], [class*="fee"], [class*="cost"], [class*="price"]' },
      { selector: '*', transform: (text) => this.extractPattern(text, /\$[\d,]+(\.\d{2})?/g) },
    ],
    deadline: [
      { selector: '[class*="deadline"], [class*="due"], [class*="application"]' },
      { selector: '*', transform: (text) => this.extractPattern(text, /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi) },
    ],
    gre: [
      { selector: '[class*="gre"], [class*="test"], [class*="requirement"]' },
      { selector: '*', transform: (text) => this.extractPattern(text, /(gre|gmat|test)\s*(required|optional|not required)/gi) },
    ],
    description: [
      { selector: '[class*="description"], [class*="overview"], [class*="about"]' },
      { selector: 'meta[name="description"]', attribute: 'content' },
    ],
  };

  private floatingButton?: HTMLElement;

  constructor() {
    this.init();
  }

  private init(): void {
    this.createFloatingButton();
    this.setupEventListeners();
    this.detectProgramPage();
  }

  private createFloatingButton(): void {
    this.floatingButton = document.createElement('div');
    this.floatingButton.id = 'course-compare-float-btn';
    this.floatingButton.innerHTML = `
      <div class="cc-float-btn">
        <span class="cc-btn-icon">📌</span>
        <span class="cc-btn-text">Save Program</span>
      </div>
    `;
    
    this.floatingButton.addEventListener('click', () => this.extractAndSaveProgram());
    document.body.appendChild(this.floatingButton);
  }

  private setupEventListeners(): void {
    // Listen for extraction trigger from background script
    window.addEventListener('courseCompareExtract', () => {
      this.extractAndSaveProgram();
    });

    // Show/hide floating button based on program detection
    const observer = new MutationObserver(() => {
      this.detectProgramPage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private detectProgramPage(): boolean {
    const indicators = [
      'program', 'course', 'degree', 'masters', 'bachelor', 'phd', 'doctorate',
      'tuition', 'admission', 'requirement', 'curriculum', 'university', 'college'
    ];

    const pageText = document.body.textContent?.toLowerCase() || '';
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    const isProgram = indicators.some(indicator => 
      pageText.includes(indicator) || url.includes(indicator) || title.includes(indicator)
    );

    if (this.floatingButton) {
      this.floatingButton.style.display = isProgram ? 'block' : 'none';
    }

    return isProgram;
  }

  private async extractAndSaveProgram(): Promise<void> {
    try {
      const programData = this.extractProgramData();
      
      if (!programData.title || !programData.university) {
        this.showNotification('Could not extract program information from this page', 'error');
        return;
      }

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROGRAM',
        payload: programData,
      });

      if (response.success) {
        this.showNotification(`Saved: ${programData.title}`, 'success');
        this.animateButton('success');
      } else {
        this.showNotification(response.error || 'Failed to save program', 'error');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      this.showNotification('Failed to save program', 'error');
    }
  }

  private extractProgramData(): ProgramData {
    const extracted: Partial<ProgramData> = {};

    // Extract each field using the configuration
    Object.entries(this.extractionConfig).forEach(([field, patterns]) => {
      extracted[field as keyof ProgramData] = this.extractField(patterns);
    });

    return {
      id: '', // Will be set by background script
      title: extracted.title || this.fallbackTitleExtraction(),
      university: extracted.university || this.fallbackUniversityExtraction(),
      duration: extracted.duration || '',
      tuition: extracted.tuition || '',
      deadline: extracted.deadline || '',
      gre: extracted.gre || '',
      description: extracted.description || '',
      url: window.location.href,
      extractedAt: Date.now(),
      additionalInfo: this.extractAdditionalInfo(),
    };
  }

  private extractField(patterns: Array<{ selector: string; attribute?: string; transform?: (text: string) => string }>): string {
    for (const pattern of patterns) {
      try {
        const elements = document.querySelectorAll(pattern.selector);
        
        for (const element of elements) {
          let text = pattern.attribute 
            ? element.getAttribute(pattern.attribute) || ''
            : element.textContent || '';

          text = text.trim();
          
          if (pattern.transform) {
            text = pattern.transform(text);
          }

          if (text && text.length > 0) {
            return text;
          }
        }
      } catch (error) {
        console.warn(`Pattern failed: ${pattern.selector}`, error);
      }
    }
    
    return '';
  }

  private extractPattern(text: string, pattern: RegExp): string {
    const matches = text.match(pattern);
    return matches ? matches[0] : '';
  }

  private fallbackTitleExtraction(): string {
    // Try common title patterns
    const h1 = document.querySelector('h1')?.textContent?.trim();
    if (h1) return h1;

    const title = document.title.split('|')[0].split('-')[0].trim();
    if (title) return title;

    return 'Unknown Program';
  }

  private fallbackUniversityExtraction(): string {
    // Try to extract from URL
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Look for .edu domains
    if (hostname.includes('.edu')) {
      const universityPart = parts.find(part => !['www', 'edu', 'com'].includes(part));
      if (universityPart) {
        return this.titleCase(universityPart.replace(/[-_]/g, ' '));
      }
    }

    // Try meta tags
    const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
    if (siteName) return siteName;

    return hostname;
  }

  private extractAdditionalInfo(): Record<string, string> {
    const additionalInfo: Record<string, string> = {};
    
    // Try to find other useful information
    const infoSelectors = [
      { key: 'location', selectors: ['[class*="location"]', '[class*="campus"]'] },
      { key: 'format', selectors: ['[class*="format"]', '[class*="online"]', '[class*="campus"]'] },
      { key: 'credits', selectors: ['[class*="credit"]', '[class*="unit"]'] },
    ];

    infoSelectors.forEach(({ key, selectors }) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          additionalInfo[key] = element.textContent.trim();
          break;
        }
      }
    });

    return additionalInfo;
  }

  private titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `cc-notification cc-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('cc-notification-show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('cc-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private animateButton(type: 'success' | 'error'): void {
    if (!this.floatingButton) return;
    
    const btn = this.floatingButton.querySelector('.cc-float-btn');
    if (btn) {
      btn.classList.add(`cc-btn-${type}`);
      setTimeout(() => {
        btn.classList.remove(`cc-btn-${type}`);
      }, 2000);
    }
  }
}

// Initialize content extractor
new ContentExtractor();