// Popup script for Course Compare extension

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const savedCountEl = document.getElementById('savedCount');
  const premiumStatusEl = document.getElementById('premiumStatus');
  const emptyStateEl = document.getElementById('emptyState');
  const savedProgramsEl = document.getElementById('savedPrograms');
  const actionsEl = document.getElementById('actions');
  const compareBtnEl = document.getElementById('compareBtn');
  const clearBtnEl = document.getElementById('clearBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const upgradeSectionEl = document.getElementById('upgradeSection');
  const comparisonModalEl = document.getElementById('comparisonModal');
  const closeModalEl = document.getElementById('closeModal');
  const comparisonContentEl = document.getElementById('comparisonContent');
  const exportBtnEl = document.getElementById('exportBtn');

  let savedPrograms = [];
  let isPremium = false;
  let trialUsed = 0;

  // Initialize popup
  init();

  async function init() {
    await loadData();
    updateUI();
    bindEvents();
  }

  async function loadData() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSavedPrograms' }, (response) => {
        savedPrograms = response.savedPrograms || [];
        
        chrome.runtime.sendMessage({ action: 'checkPremiumStatus' }, (statusResponse) => {
          isPremium = statusResponse.isPremium || false;
          trialUsed = statusResponse.trialUsed || 0;
          resolve();
        });
      });
    });
  }

  function updateUI() {
    updateHeader();
    updateProgramsList();
    updateActions();
    updateUpgradeSection();
  }

  function updateHeader() {
    const maxPrograms = isPremium ? '∞' : '3';
    savedCountEl.textContent = `${savedPrograms.length}/${maxPrograms}`;
    
    if (isPremium) {
      premiumStatusEl.textContent = 'Premium';
      premiumStatusEl.classList.add('premium');
    } else {
      premiumStatusEl.textContent = 'Free Plan';
      premiumStatusEl.classList.remove('premium');
    }
  }

  function updateProgramsList() {
    if (savedPrograms.length === 0) {
      emptyStateEl.style.display = 'block';
      savedProgramsEl.style.display = 'none';
    } else {
      emptyStateEl.style.display = 'none';
      savedProgramsEl.style.display = 'block';
      renderPrograms();
    }
  }

  function renderPrograms() {
    savedProgramsEl.innerHTML = '';
    
    savedPrograms.forEach(program => {
      const programEl = createProgramElement(program);
      savedProgramsEl.appendChild(programEl);
    });
  }

  function createProgramElement(program) {
    const div = document.createElement('div');
    div.className = 'program-item';
    div.innerHTML = `
      <div class="program-header">
        <div>
          <div class="program-title">${program.title}</div>
          <div class="program-university">${program.university}</div>
        </div>
        <button class="remove-btn" onclick="removeProgram(${program.id})">×</button>
      </div>
      <div class="program-details">
        <div class="detail-item">
          <div class="detail-label">Tuition</div>
          <div class="detail-value">${program.tuition}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${program.duration}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Deadline</div>
          <div class="detail-value">${program.deadline}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value">${program.location}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">GRE</div>
          <div class="detail-value">${program.gre}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Saved</div>
          <div class="detail-value">${formatDate(program.savedAt)}</div>
        </div>
      </div>
    `;
    return div;
  }

  function updateActions() {
    if (savedPrograms.length > 0) {
      actionsEl.style.display = 'flex';
      compareBtnEl.disabled = savedPrograms.length < 2;
    } else {
      actionsEl.style.display = 'none';
    }
  }

  function updateUpgradeSection() {
    if (isPremium) {
      upgradeSectionEl.style.display = 'none';
    } else {
      upgradeSectionEl.style.display = 'block';
    }
  }

  function bindEvents() {
    // Compare button
    compareBtnEl.addEventListener('click', showComparison);
    
    // Clear all button
    clearBtnEl.addEventListener('click', clearAllPrograms);
    
    // Upgrade button
    upgradeBtn.addEventListener('click', handleUpgrade);
    
    // Modal close
    closeModalEl.addEventListener('click', closeModal);
    comparisonModalEl.addEventListener('click', (e) => {
      if (e.target === comparisonModalEl) {
        closeModal();
      }
    });
    
    // Export button
    exportBtnEl.addEventListener('click', exportComparison);
  }

  function showComparison() {
    if (savedPrograms.length < 2) {
      alert('You need at least 2 programs to compare!');
      return;
    }
    
    renderComparisonTable();
    comparisonModalEl.classList.add('active');
    
    // Show export button for premium users
    if (isPremium) {
      exportBtnEl.style.display = 'inline-block';
    }
  }

  function renderComparisonTable() {
    const table = document.createElement('div');
    table.className = 'comparison-table';
    
    // Create headers
    const emptyCell = document.createElement('div');
    emptyCell.className = 'table-cell table-header';
    table.appendChild(emptyCell);
    
    savedPrograms.forEach(program => {
      const headerCell = document.createElement('div');
      headerCell.className = 'table-cell table-program-header';
      headerCell.innerHTML = `<div>${program.university}</div><div style="font-size: 10px; opacity: 0.9; margin-top: 4px;">${program.title}</div>`;
      table.appendChild(headerCell);
    });
    
    // Create rows
    const fields = [
      { key: 'tuition', label: 'Tuition' },
      { key: 'duration', label: 'Duration' },
      { key: 'deadline', label: 'Deadline' },
      { key: 'location', label: 'Location' },
      { key: 'gre', label: 'GRE Req.' }
    ];
    
    fields.forEach(field => {
      // Row header
      const rowHeader = document.createElement('div');
      rowHeader.className = 'table-cell table-header';
      rowHeader.textContent = field.label;
      table.appendChild(rowHeader);
      
      // Row data
      savedPrograms.forEach(program => {
        const dataCell = document.createElement('div');
        dataCell.className = 'table-cell';
        dataCell.textContent = program[field.key] || 'Not specified';
        table.appendChild(dataCell);
      });
    });
    
    comparisonContentEl.innerHTML = '';
    comparisonContentEl.appendChild(table);
  }

  function closeModal() {
    comparisonModalEl.classList.remove('active');
  }

  function clearAllPrograms() {
    if (confirm('Are you sure you want to remove all saved programs?')) {
      savedPrograms.forEach(program => {
        chrome.runtime.sendMessage({
          action: 'removeProgram',
          programId: program.id
        });
      });
      
      savedPrograms = [];
      updateUI();
    }
  }

  function handleUpgrade() {
    // In a real implementation, this would open Stripe checkout or similar
    if (confirm('Upgrade to Premium for $4.99/month?\n\n✓ Unlimited program saves\n✓ Export to spreadsheet\n✓ Advanced features\n\n(This is a demo - no actual payment)')) {
      chrome.runtime.sendMessage({ action: 'upgradeToPremium' }, (response) => {
        if (response.success) {
          isPremium = true;
          updateUI();
          alert('🎉 Welcome to Premium! You now have unlimited saves and export features.');
        }
      });
    }
  }

  function exportComparison() {
    if (!isPremium) {
      alert('Export feature is available for Premium users only.');
      return;
    }
    
    const csvData = generateCSV();
    downloadCSV(csvData, 'program-comparison.csv');
  }

  function generateCSV() {
    const headers = ['Field', ...savedPrograms.map(p => `${p.university} - ${p.title}`)];
    const rows = [headers.join(',')];
    
    const fields = [
      { key: 'tuition', label: 'Tuition' },
      { key: 'duration', label: 'Duration' },
      { key: 'deadline', label: 'Application Deadline' },
      { key: 'location', label: 'Location' },
      { key: 'gre', label: 'GRE Requirement' },
      { key: 'url', label: 'Program URL' }
    ];
    
    fields.forEach(field => {
      const row = [field.label, ...savedPrograms.map(p => `"${p[field.key] || 'Not specified'}"`)];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }

  function downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  }

  // Global function for remove buttons
  window.removeProgram = function(programId) {
    if (confirm('Remove this program from your comparison list?')) {
      chrome.runtime.sendMessage({
        action: 'removeProgram',
        programId: programId
      }, (response) => {
        if (response.success) {
          savedPrograms = savedPrograms.filter(p => p.id !== programId);
          updateUI();
        }
      });
    }
  };

  // Listen for storage changes (when programs are saved from content script)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.savedPrograms) {
      savedPrograms = changes.savedPrograms.newValue || [];
      updateUI();
    }
  });
});