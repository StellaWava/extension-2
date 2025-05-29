// Content script for Course Compare extension
// Runs on university pages to extract program data using NLP and inject save button

(function() {
  'use strict';
  
  let extractedData = null;
  let saveButton = null;
  
  // NLP patterns and dictionaries
  const NLP_PATTERNS = {
    universities: [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+University\b/g,
      /\bUniversity\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+College\b/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Institute(?:\s+of\s+Technology)?\b/g
    ],
    
    money: [
      /\$[\d,]+(?:\.\d{2})?\s*(?:per\s+)?(?:year|annually|semester|term|credit|hour)?/gi,
      /(?:tuition|fee|cost)[\s:]*\$[\d,]+(?:\.\d{2})?/gi,
      /[\d,]+\s*dollars?\s*(?:per\s+)?(?:year|annually|semester)/gi
    ],
    
    dates: [
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g
    ],
    
    durations: [
      /\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/gi,
      /\b(one|two|three|four|five|six)\s*(?:years?|yrs?)\b/gi,
      /\b(\d+)\s*(?:semesters?|terms?)\b/gi,
      /\b(\d+)\s*(?:months?|mos?)\b/gi
    ],
    
    degrees: [
      /\b(?:Master(?:'?s)?|M\.?[AS]\.?|MBA|MS|MA|MSc|MEd|MFA|MPH|MPA)\s+(?:in|of|degree)?\s*([A-Z][a-zA-Z\s&]+)/gi,
      /\b(?:Doctor(?:ate)?|Ph\.?D\.?|D\.?Sc\.?)\s+(?:in|of)?\s*([A-Z][a-zA-Z\s&]+)/gi,
      /\b([A-Z][a-zA-Z\s&]+)\s+(?:Master(?:'?s)?|M\.?[AS]\.?|PhD|Doctorate)\b/gi
    ],
    
    locations: [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Za-z\s]+)\b/g,
      /(?:located|campus|based)\s+(?:in|at)\s+([A-Z][a-zA-Z\s,]+)/gi,
      /\b([A-Z][a-z]+),\s*([A-Z][a-z]+)\s*,?\s*(?:USA|United States|US)\b/gi
    ],
    
    gre: [
      /\bGRE\s+(?:is\s+)?(?:not\s+)?(?:required|optional|recommended|waived)\b/gi,
      /\b(?:no|without)\s+GRE\s+(?:required|needed)\b/gi,
      /\bGRE\s+scores?\s+(?:are\s+)?(?:not\s+)?(?:required|optional|needed)\b/gi
    ]
  };
  
  // Semantic keywords for context analysis
  const SEMANTIC_KEYWORDS = {
    tuition: ['tuition', 'cost', 'fee', 'price', 'expensive', 'affordable', 'funding', 'scholarship'],
    deadline: ['deadline', 'apply', 'due', 'application', 'submit', 'priority', 'early', 'regular'],
    duration: ['duration', 'length', 'time', 'complete', 'finish', 'graduate', 'program length'],
    requirements: ['requirements', 'prerequisite', 'admission', 'GRE', 'GMAT', 'TOEFL', 'GPA'],
    location: ['location', 'campus', 'city', 'based', 'situated', 'address', 'where']
  };
  
  // Number word mappings
  const NUMBER_WORDS = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6'
  };
  
  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // Try to extract program data using NLP approach
    extractedData = extractProgramDataWithNLP();
    
    if (extractedData && extractedData.title && extractedData.university) {
      createSaveButton();
      addFloatingSaveButton();
    }
  }
  
  function extractProgramDataWithNLP() {
    const pageText = document.body.textContent;
    const pageHTML = document.body.innerHTML;
    
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
    
    // Extract using NLP patterns
    data.university = extractUniversityWithNLP(pageText);
    data.title = extractProgramTitleWithNLP(pageText, pageHTML);
    data.tuition = extractTuitionWithNLP(pageText);
    data.deadline = extractDeadlineWithNLP(pageText);
    data.duration = extractDurationWithNLP(pageText);
    data.location = extractLocationWithNLP(pageText);
    data.gre = extractGREWithNLP(pageText);
    
    return data;
  }
  
  function extractUniversityWithNLP(text) {
    // First try structured data
    const structuredName = extractFromStructuredData('university');
    if (structuredName) return structuredName;
    
    // Try meta tags
    const metaName = document.querySelector('meta[property="og:site_name"]');
    if (metaName) {
      let name = metaName.getAttribute('content');
      name = name.replace(/\s*-\s*.*$/, '').replace(/\s*\|\s*.*$/, '').trim();
      if (name) return name;
    }
    
    // Use NLP patterns to find university names
    for (const pattern of NLP_PATTERNS.universities) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let universityName = matches[0].trim();
        // Clean up common patterns
        universityName = universityName.replace(/\s+/g, ' ');
        if (universityName.length > 5 && universityName.length < 100) {
          return universityName;
        }
      }
    }
    
    // Fallback to domain-based extraction
    const hostname = window.location.hostname;
    return hostname.replace('www.', '').replace('.edu', '').replace('.ac.uk', '')
      .split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  function extractProgramTitleWithNLP(text, html) {
    // First try structured data
    const structuredTitle = extractFromStructuredData('title');
    if (structuredTitle) return structuredTitle;
    
    // Extract using degree patterns
    for (const pattern of NLP_PATTERNS.degrees) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let title = matches[0].trim();
        // Clean up and validate
        if (title.length > 10 && title.length < 200) {
          return title;
        }
      }
    }
    
    // Look for titles in HTML structure with semantic analysis
    const titleSelectors = ['h1', 'h2', '.program-title', '.course-title', 'title'];
    for (const selector of titleSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const title = element.textContent.trim();
        if (isValidProgramTitle(title)) {
          return title;
        }
      }
    }
    
    return '';
  }
  
  function extractTuitionWithNLP(text) {
    // Use semantic context analysis
    const sentences = text.split(/[.!?]+/);
    const tuitionSentences = sentences.filter(sentence => 
      SEMANTIC_KEYWORDS.tuition.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    );
    
    // Extract money amounts from tuition-related sentences
    for (const sentence of tuitionSentences) {
      for (const pattern of NLP_PATTERNS.money) {
        const matches = sentence.match(pattern);
        if (matches && matches.length > 0) {
          let amount = matches[0].trim();
          // Validate and clean
          if (amount.includes('$') && /\d/.test(amount)) {
            return amount;
          }
        }
      }
    }
    
    // Fallback: look for any money pattern
    for (const pattern of NLP_PATTERNS.money) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const amounts = matches.filter(match => {
          const num = parseInt(match.replace(/[^\d]/g, ''));
          return num > 1000 && num < 200000; // Reasonable tuition range
        });
        if (amounts.length > 0) {
          return amounts[0].trim();
        }
      }
    }
    
    return 'Not specified';
  }
  
  function extractDeadlineWithNLP(text) {
    // Use semantic context analysis
    const sentences = text.split(/[.!?]+/);
    const deadlineSentences = sentences.filter(sentence => 
      SEMANTIC_KEYWORDS.deadline.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    );
    
    // Extract dates from deadline-related sentences
    for (const sentence of deadlineSentences) {
      for (const pattern of NLP_PATTERNS.dates) {
        const matches = sentence.match(pattern);
        if (matches && matches.length > 0) {
          return matches[0].trim();
        }
      }
    }
    
    // Look for priority/early deadline indicators
    const priorityDeadlines = text.match(/(?:priority|early)\s+(?:deadline|application)[\s:]*([A-Za-z]+ \d{1,2}(?:, \d{4})?)/gi);
    if (priorityDeadlines && priorityDeadlines.length > 0) {
      return priorityDeadlines[0].replace(/.*?([A-Za-z]+ \d{1,2}(?:, \d{4})?).*/, '$1').trim();
    }
    
    return 'Not specified';
  }
  
  function extractDurationWithNLP(text) {
    // Use semantic context analysis
    const sentences = text.split(/[.!?]+/);
    const durationSentences = sentences.filter(sentence => 
      SEMANTIC_KEYWORDS.duration.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    );
    
    // Extract duration from relevant sentences
    for (const sentence of durationSentences) {
      for (const pattern of NLP_PATTERNS.durations) {
        const matches = sentence.match(pattern);
        if (matches && matches.length > 0) {
          let duration = matches[0].trim();
          // Convert word numbers to digits
          Object.keys(NUMBER_WORDS).forEach(word => {
            duration = duration.replace(new RegExp(word, 'gi'), NUMBER_WORDS[word]);
          });
          return duration;
        }
      }
    }
    
    // Look for common program duration patterns
    const commonDurations = text.match(/\b(?:full-time|part-time)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/gi);
    if (commonDurations && commonDurations.length > 0) {
      return commonDurations[0].trim();
    }
    
    return 'Not specified';
  }
  
  function extractLocationWithNLP(text) {
    // First try structured data
    const structuredLocation = extractFromStructuredData('location');
    if (structuredLocation) return structuredLocation;
    
    // Use semantic context analysis
    const sentences = text.split(/[.!?]+/);
    const locationSentences = sentences.filter(sentence => 
      SEMANTIC_KEYWORDS.location.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )
    );
    
    // Extract locations from relevant sentences
    for (const sentence of locationSentences) {
      for (const pattern of NLP_PATTERNS.locations) {
        const matches = sentence.match(pattern);
        if (matches && matches.length > 0) {
          let location = matches[0].trim();
          // Clean up extracted location
          location = location.replace(/^(?:located|campus|based)\s+(?:in|at)\s+/gi, '');
          if (location.length > 3 && location.length < 100) {
            return location;
          }
        }
      }
    }
    
    // Look for address-like patterns
    const addressPattern = /\b\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln),?\s*[A-Z][a-z]+,?\s*[A-Z]{2}\b/g;
    const addresses = text.match(addressPattern);
    if (addresses && addresses.length > 0) {
      return addresses[0].replace(/^\d+\s+/, '').trim(); // Remove street number
    }
    
    return 'Not specified';
  }
  
  function extractGREWithNLP(text) {
    // Use NLP patterns to find GRE requirements
    for (const pattern of NLP_PATTERNS.gre) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0].toLowerCase();
        if (match.includes('not') || match.includes('no') || match.includes('waived') || match.includes('optional')) {
          return 'Not required';
        } else if (match.includes('required') || match.includes('needed')) {
          return 'Required';
        } else if (match.includes('recommended')) {
          return 'Recommended';
        }
      }
    }
    
    // Context analysis for GRE requirements
    const sentences = text.split(/[.!?]+/);
    const greSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes('gre')
    );
    
    for (const sentence of greSentences) {
      const lower = sentence.toLowerCase();
      if (lower.includes('not required') || lower.includes('optional') || lower.includes('waived')) {
        return 'Not required';
      } else if (lower.includes('required') || lower.includes('must submit') || lower.includes('mandatory')) {
        return 'Required';
      } else if (lower.includes('recommended') || lower.includes('preferred')) {
        return 'Recommended';
      }
    }
    
    // If GRE is mentioned but no clear requirement, return check requirements
    if (text.toLowerCase().includes('gre')) {
      return 'Check requirements';
    }
    
    return 'Not specified';
  }
  
  function extractFromStructuredData(field) {
    // Check for JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'Course' || data['@type'] === 'EducationalOccupationalProgram') {
          switch (field) {
            case 'title':
              if (data.name) return data.name;
              break;
            case 'university':
              if (data.provider && data.provider.name) return data.provider.name;
              break;
            case 'location':
              if (data.location && data.location.name) return data.location.name;
              break;
          }
        }
      } catch (e) {
        // Invalid JSON-LD, continue
      }
    }
    
    // Check for microdata
    const microdataElements = document.querySelectorAll('[itemtype*="Course"], [itemtype*="Educational"]');
    for (const element of microdataElements) {
      switch (field) {
        case 'title':
          const nameEl = element.querySelector('[itemprop="name"]');
          if (nameEl) return nameEl.textContent.trim();
          break;
        case 'university':
          const providerEl = element.querySelector('[itemprop="provider"] [itemprop="name"]');
          if (providerEl) return providerEl.textContent.trim();
          break;
      }
    }
    
    return null;
  }
  
  function isValidProgramTitle(title) {
    if (!title || title.length < 10 || title.length > 200) return false;
    
    const programIndicators = [
      'master', 'phd', 'doctorate', 'graduate', 'm.s.', 'm.a.', 'mba', 
      'ms in', 'ma in', 'degree', 'program', 'major'
    ];
    
    return programIndicators.some(indicator => 
      title.toLowerCase().includes(indicator)
    );
  }

  function createSaveButton() {
    const existing = document.querySelector('.course-compare-save-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'course-compare-save-btn';
    btn.textContent = '📌 Save to Compare';
    btn.addEventListener('click', handleSaveClick);

    const targets = ['.program-actions','.apply-section','h1','.program-title','.course-title'];
    for (const sel of targets) {
      const t = document.querySelector(sel);
      if (t) {
        t.parentNode.insertBefore(btn, t.nextSibling);
        saveButton = btn;
        return;
      }
    }

    document.body.insertBefore(btn, document.body.firstChild);
    saveButton = btn;
  }

  function addFloatingSaveButton() {
    const btn = document.createElement('button');
    btn.className = 'course-compare-floating-btn';
    btn.innerText = '+ Save Program';
    btn.style.display = 'none';
    btn.addEventListener('click', handleSaveClick);
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          btn.style.display = window.scrollY > 200 ? 'block' : 'none';
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  function handleSaveClick(e) {
    e.preventDefault();
    if (!extractedData) {
      return showNotification('Could not extract program data from this page','error');
    }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';

    chrome.runtime.sendMessage({
      action: 'saveProgram',
      programData: extractedData
    }, (res) => {
      if (res.success) {
        btn.textContent = '✅ Saved!';
        showNotification('Program saved successfully!','success');
        setTimeout(() => {
          btn.textContent = '📌 Saved';
          btn.disabled = true;
        },2000);
      } else {
        btn.disabled = false;
        btn.textContent = '📌 Save to Compare';
        showNotification(res.error||'Error saving program','error');
      }
    });
  }

  function showNotification(msg, type) {
    const old = document.querySelector('.course-compare-notification');
    if (old) old.remove();
    const n = document.createElement('div');
    n.className = `course-compare-notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
  }

})();
