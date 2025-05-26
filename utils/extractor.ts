// src/utils/extractor.ts
import { ProgramData } from '../types/program';

export class ProgramDataExtractor {
  private static readonly SELECTORS = {
    title: [
      'h1',
      '.program-title',
      '[class*="title"]',
      '[class*="heading"]'
    ],
    university: [
      '.university-name',
      '[class*="university"]',
      '[class*="school"]',
      'header [class*="brand"]'
    ],
    tuition: [
      '[class*="tuition"]',
      '[class*="cost"]',
      '[class*="fee"]'
    ],
    duration: [
      '[class*="duration"]',
      '[class*="length"]'
    ],
    deadline: [
      '[class*="deadline"]',
      '[class*="application"]'
    ]
  };

  static extractFromPage(): ProgramData {
    const extractedData: Record<string, string> = {};

    const title = this.findTextBySelectors(this.SELECTORS.title) ||
                  document.title.split(' | ')[0] ||
                  'Unknown Program';

    const university = this.findTextBySelectors(this.SELECTORS.university) ||
                       this.extractFromUrl() ||
                       'Unknown University';

    extractedData.tuition = this.findTextBySelectors(this.SELECTORS.tuition) || '';
    extractedData.duration = this.findTextBySelectors(this.SELECTORS.duration) || '';
    extractedData.deadline = this.findTextBySelectors(this.SELECTORS.deadline) || '';

    const pageText = document.body.innerText.toLowerCase();
    if (pageText.includes('gre required')) {
      extractedData.gre = 'Required';
    } else if (pageText.includes('gre optional') || pageText.includes('gre not required')) {
      extractedData.gre = 'Optional';
    }

    return {
      id: this.generateId(),
      title: this.cleanText(title),
      university: this.cleanText(university),
      tuition: this.cleanText(extractedData.tuition),
      duration: this.cleanText(extractedData.duration),
      deadline: this.cleanText(extractedData.deadline),
      gre: extractedData.gre,
      url: window.location.href,
      savedAt: Date.now(),
      extractedData
    };
  }

  private static findTextBySelectors(selectors: string[]): string {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  private static extractFromUrl(): string {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    for (const part of parts) {
      if (!['www', 'edu', 'ac', 'uk', 'ca', 'com'].includes(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    return '';
  }

  private static cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
