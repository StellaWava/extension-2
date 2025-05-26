// src/popup/popup.ts
import { ProgramData } from '../types/program';

class PopupManager {
  private programs: ProgramData[] = [];
  private isPremium = false;
  private maxFreePrograms = 3;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadPrograms();
    await this.checkCurrentPage();
    this.setupEventListeners();
    this.updateUI();
  }

  private async loadPrograms(): Promise<void> {
    try {
      const response = await this.sendMessage({ action: 'getPrograms' });
      this.programs = response.programs || [];

      const limitsResponse = await this.sendMessage({ action: 'checkLimits' });
      this.isPremium = limitsResponse.isPremium || false;
      this.maxFreePrograms = limitsResponse.limit || 3;

    } catch (error) {
      console.error('Failed to load programs:', error);
    }
  }

  private async checkCurrentPage(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      if (!tab.url || !tab.title) {
        this.hideCurrentPageSection();
        return;
      }
  
      const isUniversityPage = this.isUniversityURL(tab.url);
  
      if (!isUniversityPage) {
        this.hideCurrentPageSection();
        return;
      }
  
      // Extract school name and program name from the page
      const schoolName = this.extractSchoolName(tab.url);
      const programName = this.extractProgramName(tab.title);
  
      // Show popup message
      this.showPopupMessage(schoolName, programName);
  
      // Rest of the existing code...
    } catch (error) {
      console.error('Failed to check current page:', error);
    }
  }

  private isUniversityURL(url: string): boolean {
    const patterns = [
      /\.edu\//,
      /\.ac\.uk\//,
      /\/programs?\//,
      /\/courses?\//,
      /\/degrees?\//,
      /\/admissions?\//
    ];
    return patterns.some(pattern => pattern.test(url.toLowerCase()));
  }
  private extractSchoolName(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const parts = domain.split('.');
      
      // Try to extract school name from domain
      if (parts.length > 2) {
        return parts[0].replace(/-/g, ' ').replace(/\d+/g, '');
      }
      return 'This university';
    } catch (error) {
      console.error('Failed to extract school name:', error);
      return 'This university';
    }
  }
  
  private extractProgramName(title: string): string {
    try {
      // Try to extract program name from title
      const programKeywords = ['program', 'degree', 'major', 'bachelor', 'master', 'phd'];
      const titleLower = title.toLowerCase();
      
      for (const keyword of programKeywords) {
        const index = titleLower.indexOf(keyword);
        if (index > -1) {
          const programPart = title.substring(index).split(' - ')[0];
          return programPart.replace(/\s+/g, ' ').trim();
        }
      }
      return 'this program';
    } catch (error) {
      console.error('Failed to extract program name:', error);
      return 'this program';
    }
  }
  
  private showPopupMessage(schoolName: string, programName: string): void {
    try {
      const message = `This is ${schoolName} page for ${programName}`;
      
      // Create or update the popup message element
      let popupMessage = document.getElementById('popupMessage');
      if (!popupMessage) {
        popupMessage = document.createElement('div');
        popupMessage.id = 'popupMessage';
        popupMessage.className = 'popup-message';
        document.body.appendChild(popupMessage);
      }
      
      popupMessage.textContent = message;
      popupMessage.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        popupMessage.style.display = 'none';
      }, 3000);
    } catch (error) {
      console.error('Failed to show popup message:', error);
    }
  }

  private hideCurrentPageSection(): void {
    const section = document.getElementById('currentPageSection');
    if (section) section.style.display = 'none';
  }

  private setupEventListeners(): void {
    document.getElementById('saveCurrentBtn')?.addEventListener('click', () => this.saveCurrentProgram());
    document.getElementById('compareBtn')?.addEventListener('click', () => this.showComparisonModal());
    document.getElementById('closeModal')?.addEventListener('click', () => this.hideComparisonModal());
    document.getElementById('comparisonModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideComparisonModal();
    });
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportToCSV());
    document.getElementById('upgradeBtn')?.addEventListener('click', () => this.handleUpgrade());
  }

  private async saveCurrentProgram(): Promise<void> {
    const saveBtn = document.getElementById('saveCurrentBtn') as HTMLButtonElement;
    const btnText = saveBtn.querySelector('.btn-text')!;
    const btnIcon = saveBtn.querySelector('.btn-icon')!;

    try {
      saveBtn.disabled = true;
      btnText.textContent = 'Saving...';
      btnIcon.textContent = '⏳';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractProgram' });
      if (!response?.data) throw new Error('Failed to extract program data');

      const saveResponse = await this.sendMessage({ action: 'saveProgram', data: response.data });

      if (saveResponse.success) {
        btnText.textContent = 'Saved!';
        btnIcon.textContent = '✅';
        await this.loadPrograms();
        this.updateUI();

        setTimeout(() => {
          saveBtn.disabled = true;
          btnText.textContent = 'Already Saved';
        }, 2000);
      } else {
        throw new Error(saveResponse.message || 'Failed to save');
      }

    } catch (error) {
      btnText.textContent = 'Error';
      btnIcon.textContent = '❌';
      console.error('Save error:', error);

      setTimeout(() => {
        btnText.textContent = 'Save This Program';
        btnIcon.textContent = '📌';
        saveBtn.disabled = false;
      }, 2000);
    }
  }

  private updateUI(): void {
    this.updateProgramsList();
    this.updateCountBadge();
    this.updateCompareButton();
    this.updateUpgradeSection();
  }

  private updateProgramsList(): void {
    const programsList = document.getElementById('programsList');
    const emptyState = document.getElementById('emptyState');

    if (!programsList || !emptyState) return;

    if (this.programs.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    programsList.querySelectorAll('.program-item').forEach(item => item.remove());

    this.programs.forEach(program => {
      const programElement = this.createProgramElement(program);
      programsList.appendChild(programElement);
    });
  }

  private createProgramElement(program: ProgramData): HTMLElement {
    const div = document.createElement('div');
    div.className = 'program-item';
    div.innerHTML = `
      <div class="program-header">
        <div>
          <div class="program-university">${program.university}</div>
          <div class="program-title">${program.title}</div>
        </div>
      </div>
      <div class="program-details">
        ${program.duration ? `<div class="program-detail"><span>Duration:</span><span>${program.duration}</span></div>` : ''}
        ${program.tuition ? `<div class="program-detail"><span>Tuition:</span><span>${program.tuition}</span></div>` : ''}
        ${program.deadline ? `<div class="program-detail"><span>Deadline:</span><span>${program.deadline}</span></div>` : ''}
        ${program.gre ? `<div class="program-detail"><span>GRE:</span><span>${program.gre}</span></div>` : ''}
      </div>
      <button class="remove-btn" data-id="${program.id}">×</button>
    `;

    const removeBtn = div.querySelector('.remove-btn') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => this.removeProgram(program.id));
    return div;
  }

  private async removeProgram(id: string): Promise<void> {
    try {
      await this.sendMessage({ action: 'removeProgram', id });
      await this.loadPrograms();
      this.updateUI();
    } catch (error) {
      console.error('Failed to remove program:', error);
    }
  }

  private updateCountBadge(): void {
    const countBadge = document.getElementById('countBadge');
    if (countBadge) {
      const limit = this.isPremium ? '∞' : this.maxFreePrograms.toString();
      countBadge.textContent = `${this.programs.length}/${limit}`;
    }
  }

  private updateCompareButton(): void {
    const compareBtn = document.getElementById('compareBtn') as HTMLButtonElement;
    if (compareBtn) compareBtn.disabled = this.programs.length < 2;
  }

  private updateUpgradeSection(): void {
    const upgradeSection = document.getElementById('upgradeSection');
    const premiumBadge = document.getElementById('premiumBadge');
    if (!upgradeSection || !premiumBadge) return;

    if (this.isPremium) {
      upgradeSection.style.display = 'none';
      premiumBadge.style.display = 'block';
    } else {
      upgradeSection.style.display = 'block';
      premiumBadge.style.display = 'none';
    }
  }

  private showComparisonModal(): void {
    const modal = document.getElementById('comparisonModal');
    const container = document.getElementById('comparisonContainer');
    const exportBtn = document.getElementById('exportBtn');

    if (!modal || !container || !exportBtn) return;

    container.innerHTML = this.generateComparisonTable();
    exportBtn.style.display = this.isPremium ? 'block' : 'none';
    modal.classList.add('active');
  }

  private hideComparisonModal(): void {
    const modal = document.getElementById('comparisonModal');
    if (modal) modal.classList.remove('active');
  }

  private generateComparisonTable(): string {
    if (this.programs.length === 0) return '<p>No programs to compare</p>';

    const fields = [
      { key: 'university', label: 'University' },
      { key: 'title', label: 'Program' },
      { key: 'duration', label: 'Duration' },
      { key: 'tuition', label: 'Tuition' },
      { key: 'deadline', label: 'Deadline' },
      { key: 'gre', label: 'GRE' }
    ];

    let html = '<div class="comparison-table">';
    html += '<div class="table-cell table-header"></div>';

    this.programs.forEach(p => {
      html += `<div class="table-cell table-header">${p.university}</div>`;
    });

    fields.forEach(f => {
      html += `<div class="table-cell table-row-header">${f.label}</div>`;
      this.programs.forEach(p => {
        const value = p[f.key as keyof ProgramData] || 'N/A';
        html += `<div class="table-cell">${value}</div>`;
      });
    });

    html += '</div>';
    return html;
  }

  private exportToCSV(): void {
    if (!this.isPremium) {
      alert('CSV export is a Premium feature. Upgrade to unlock!');
      return;
    }

    const headers = ['University', 'Program', 'Duration', 'Tuition', 'Deadline', 'GRE', 'URL'];
    const rows = this.programs.map(p => [
      p.university,
      p.title,
      p.duration || '',
      p.tuition || '',
      p.deadline || '',
      p.gre || '',
      p.url
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `course-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  private handleUpgrade(): void {
    alert('Upgrade feature coming soon! This would redirect to the payment page.');
  }

  private sendMessage(message: Record<string, any>): Promise<any> {
    console.log('Sending message to background:', message);
    return new Promise(resolve => {
      chrome.runtime.sendMessage(message, (response: any) => {
        console.log('Received response from background:', response);
        resolve(response || {});
      });
    });
  }
}

// Add type annotations for DOMContentLoaded event
interface Window {
  document: Document;
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
