// Content script for Course Compare extension
// Runs on university pages to extract program data and inject save button

(function() {
  'use strict';
  
  let extractedData = null;
  let saveButton = null;
  
  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Try to extract program data
    extractedData = extractProgramData();
    
    if (extractedData) {
      createSaveButton();
      addFloatingSaveButton();
    }
  }
  
  function extractProgramData() {
    const data = {
      title: '',
      university: '',
      tuition: '',
      deadline: '',
      duration: '',
      location: '',
      gre: '',
      url: window.location.href
    };
    
    // Extract university name
    data.university = extractUniversity();
    
    // Extract program title
    data.title = extractProgramTitle();
    
    // Extract tuition information
    data.tuition = extractTuition();
    
    // Extract application deadline
    data.deadline = extractDeadline();
    
    // Extract program duration
    data.duration = extractDuration();
    
    // Extract location
    data.location = extractLocation();
    
    // Extract GRE requirement
    data.gre = extractGRERequirement();
    
    // Only return data if we found at least title and university
    if (data.title && data.university) {
      return data;
    }
    
    return null;
  }
  
  function extractUniversity() {
    // Try multiple methods to find university name
    const selectors = [
      'meta[property="og:site_name"]',
      '.university-name',
      '.site-title',
      'header h1',
      '.logo img',
      'title'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        let name = '';
        if (element.tagName === 'META') {
          name = element.getAttribute('content');
        } else if (element.tagName === 'IMG') {
          name = element.getAttribute('alt') || element.getAttribute('title');
        } else {
          name = element.textContent;
        }
        
        if (name) {
          // Clean up common patterns
          name = name.replace(/\s*-\s*.*$/, ''); // Remove everything after dash
          name = name.replace(/\s*\|\s*.*$/, ''); // Remove everything after pipe
          name = name.replace(/University of /i, '').replace(/ University/i, ' University');
          return name.trim();
        }
      }
    }
    
    // Fallback to domain name
    const hostname = window.location.hostname;
    return hostname.replace('www.', '').replace('.edu', '').replace('.ac.uk', '');
  }
  
  function extractProgramTitle() {
    const text = document.body.textContent.toLowerCase();
    const selectors = [
      'h1',
      '.program-title',
      '.course-title',
      '.degree-title',
      'h2',
      'title'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const title = element.textContent.trim();
        if (title && (
          title.toLowerCase().includes('master') ||
          title.toLowerCase().includes('phd') ||
          title.toLowerCase().includes('doctorate') ||
          title.toLowerCase().includes('graduate') ||
          title.toLowerCase().includes('m.s.') ||
          title.toLowerCase().includes('m.a.') ||
          title.toLowerCase().includes('mba') ||
          title.toLowerCase().includes('ms in') ||
          title.toLowerCase().includes('ma in')
        )) {
          return title;
        }
      }
    }
    
    return '';
  }
  
  function extractTuition() {
    const text = document.body.textContent;
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?\s*(?:per year|annually|\/year)/gi,
      /tuition[:\s]+\$[\d,]+/gi,
      /\$[\d,]+(?:\.\d{2})?\s*(?:tuition|fee)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].trim();
      }
    }
    
    return 'Not specified';
  }
  
  function extractDeadline() {
    const text = document.body.textContent;
    const patterns = [
      /(?:deadline|apply by|due)[:\s]+([A-Za-z]+ \d{1,2}(?:, \d{4})?)/gi,
      /([A-Za-z]+ \d{1,2}(?:, \d{4})?)[:\s]*(?:deadline|due)/gi,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/(?:deadline|apply by|due)[:\s]+/gi, '').trim();
      }
    }
    
    return 'Not specified';
  }
  
  function extractDuration() {
    const text = document.body.textContent.toLowerCase();
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/gi,
      /(\d+)\s*(?:semesters?)/gi,
      /(one|two|three|four)\s*years?/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let duration = matches[0];
        // Convert word numbers to digits
        duration = duration.replace(/one/gi, '1').replace(/two/gi, '2').replace(/three/gi, '3').replace(/four/gi, '4');
        return duration.trim();
      }
    }
    
    return 'Not specified';
  }
  
  function extractLocation() {
    // Try to find location in common places
    const selectors = [
      '.location',
      '.address',
      '.campus',
      '.city'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent.trim();
      }
    }
    
    // Look for city, state patterns in text
    const text = document.body.textContent;
    const locationPattern = /([A-Za-z\s]+),\s*([A-Z]{2}|[A-Za-z\s]+)/g;
    const matches = text.match(locationPattern);
    
    if (matches && matches.length > 0) {
      // Return the first reasonable looking location
      for (const match of matches) {
        if (match.length > 5 && match.length < 50) {
          return match.trim();
        }
      }
    }
    
    return 'Not specified';
  }
  
  function extractGRERequirement() {
    const text = document.body.textContent.toLowerCase();
    
    if (text.includes('gre not required') || text.includes('gre optional') || text.includes('no gre')) {
      return 'Not required';
    } else if (text.includes('gre required') || text.includes('gre score')) {
      return 'Required';
    } else if (text.includes('gre')) {
      return 'Check requirements';
    }
    
    return 'Not specified';
  }
  
  function createSaveButton() {
    // Remove existing button
    const existing = document.querySelector('.course-compare-save-btn');
    if (existing) existing.remove();
    
    const button = document.createElement('button');
    button.className = 'course-compare-save-btn';
    button.innerHTML = '📌 Save to Compare';
    button.onclick = handleSaveClick;
    
    // Try to insert in a good location
    const targetSelectors = [
      '.program-actions',
      '.apply-section',
      'h1',
      '.program-title',
      '.course-title'
    ];
    
    for (const selector of targetSelectors) {
      const target = document.querySelector(selector);
      if (target) {
        target.parentNode.insertBefore(button, target.nextSibling);
        saveButton = button;
        return;
      }
    }
    
    // Fallback: insert at top of body
    document.body.insertBefore(button, document.body.firstChild);
    saveButton = button;
  }
  
  function addFloatingSaveButton() {
    const floatingBtn = document.createElement('button');
    floatingBtn.className = 'course-compare-floating-btn';
    floatingBtn.innerHTML = '+ Save Program';
    floatingBtn.onclick = handleSaveClick;
    floatingBtn.style.display = 'none';
    
    document.body.appendChild(floatingBtn);
    
    // Show/hide on scroll
    let ticking = false;
    function updateFloatingButton() {
      const scrolled = window.scrollY > 200;
      floatingBtn.style.display = scrolled ? 'block' : 'none';
      ticking = false;
    }
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateFloatingButton);
        ticking = true;
      }
    });
  }
  
  function handleSaveClick(event) {
    event.preventDefault();
    
    if (!extractedData) {
      showNotification('Could not extract program data from this page', 'error');
      return;
    }
    
    const button = event.target;
    button.disabled = true;
    button.innerHTML = '⏳ Saving...';
    
    chrome.runtime.sendMessage({
      action: 'saveProgram',
      programData: extractedData
    }, (response) => {
      if (response.success) {
        button.innerHTML = '✅ Saved!';
        showNotification('Program saved successfully!', 'success');
        
        setTimeout(() => {
          button.innerHTML = '📌 Saved';
          button.disabled = true;
        }, 2000);
      } else {
        button.innerHTML = '📌 Save to Compare';
        button.disabled = false;
        showNotification(response.error || 'Error saving program', 'error');
      }
    });
  }
  
  function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.course-compare-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `course-compare-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
})();