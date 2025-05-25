// content.ts - Runs on webpages to detect and enhance graduate program information

// content.ts - Runs on webpages to detect and enhance graduate program information

declare const chrome: any;

const BACKEND_API = 'https://api.gradmatch.com/v1';

const UNIVERSITY_DOMAIN_PATTERN = /edu|ac\.uk|edu\.au/;
const PROGRAM_KEYWORDS: string[] = [
  'graduate program', 'masters program', 'phd program', 'doctoral program',
  'msc', 'ma program', 'graduate degree', 'graduate school', 'graduate studies',
  'graduate admissions', 'graduate application', 'graduate requirements', 'graduate scholarship',
  'university', 'college', 'department', 'faculty', 'school of', 'program of study',
  'degree program', 'research program', 'graduate research', 'graduate faculty' 
];

const PATTERNS = {
  gpa: /minimum gpa[:\s]*([\d\.]+)/i,
  deadlines: /application deadline[:\s]*([a-zA-Z0-9\s,]+)/i,
  funding: /funding|financial aid|assistantship|fellowship/i
};

interface ProgramData {
  url: string;
  title: string;
  headings: string[];
  bodyText: string;
  domain: string;
  programName: string;
  universityName: string;
  degreeType: string;
  department: string;
}

interface EnhancedProgramData extends ProgramData {
  admissionStats: {
    averageGpa: number;
    acceptanceRate: number;
  };
  funding: {
    available: boolean;
    details: string;
  };
  advisors: Advisor[];
  researchAreas: string[];
  likelihoodScore: number;
}

interface Advisor {
  name: string;
  research: string;
  accepting: boolean;
}

interface UserProfile {
  gpa?: number;
}

// Handle popup message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getMarketplaceStatus') {
    sendResponse({ status: 'GradMatch active on this page' });
    return true;
  }
});

function init(): void {
  console.log('[GradMatch] Content script active on', window.location.href);

  if (UNIVERSITY_DOMAIN_PATTERN.test(window.location.hostname)) {
    detectProgramPage();
  }

    if (
      window.location.hostname === 'www.google.com' &&
      window.location.pathname === '/search' &&
      isGraduateSearch()
    ) {
      enhanceSearchResults();
    }
  }
  
  /**
   * Enhances Google search results by highlighting graduate program-related results.
   */
  function enhanceSearchResults(): void {
    const results = document.querySelectorAll('div.g');
    results.forEach(result => {
      const text = result.textContent?.toLowerCase() || '';
      if (PROGRAM_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()))) {
        (result as HTMLElement).style.backgroundColor = '#e6f7ff';
        (result as HTMLElement).style.borderLeft = '4px solid #0078d4';
      }
    });
  }
}

// Returns true if the Google search query appears to be about graduate programs
function isGraduateSearch(): boolean {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q')?.toLowerCase() || '';
  return PROGRAM_KEYWORDS.some(keyword => query.includes(keyword.toLowerCase()));
}

function detectProgramPage(): void {
  const pageText = document.body.innerText.toLowerCase();
  const hasProgramKeywords = PROGRAM_KEYWORDS.some(keyword =>
    pageText.includes(keyword.toLowerCase())
  );
  if (hasProgramKeywords) {
    console.log('GradMatch: Graduate program page detected');
    extractProgramInfo();
  }
}

function extractProgramInfo(): void {
  const pageContent: ProgramData = {
    url: window.location.href,
    title: document.title,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim() || ''),
    bodyText: document.body.innerText,
    domain: window.location.hostname,
    programName: extractProgramInfo(),
    universityName: extractUniversityName(),
    degreeType: extractDegreeType(),
    department: extractDepartment()
  };

  if (pageContent.programName && pageContent.universityName) {
    processProgramInfo(pageContent);
  }
}

function processProgramInfo(programData: ProgramData): void {
  chrome.storage.local.get(['programCache'], (result: { programCache?: Record<string, EnhancedProgramData> }) => {
    const cache = result.programCache || {};
    const cacheKey = programData.url;

    if (cache[cacheKey]) {
      console.log('GradMatch: Using cached program data');
      showProgramOverlay(cache[cacheKey]);
      return;
    }

    simulateBackendProcessing(programData)
      .then((enhancedData: EnhancedProgramData) => {
        cache[cacheKey] = enhancedData;
        chrome.storage.local.set({ programCache: cache });
        showProgramOverlay(enhancedData);
      })
      .catch(error => {
        console.error('GradMatch: Error processing program data', error);
      });
  });
}

// function simulateBackendProcessing(programData: ProgramData): Promise<EnhancedProgramData> {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       chrome.storage.sync.get(['userProfile'], (result: { userProfile?: UserProfile }) => {
//         const userProfile: UserProfile = result.userProfile || {};
//         const enhancedData: EnhancedProgramData = {
//           ...programData,
//           admissionStats: {
//             averageGpa: generateRandomGpa(),
//             acceptanceRate: generateRandomAcceptanceRate()
//           },
//           funding: {
//             available: Math.random() > 0.3,
//             details: Math.random() > 0.5
//               ? 'Teaching Assistantships and Research Assistantships available'
//               : 'Limited funding opportunities'
//           },
//           advisors: generateRandomAdvisors(),
//           researchAreas: extractResearchAreas(programData.bodyText),
//           likelihoodScore: calculateLikelihood(userProfile)
//         };
//         resolve(enhancedData);
//       });
//     }, 1000);
//   });
// }

fetch('https://api.gradmatch.com/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ programData, userProfile })
})
  .then(res => res.json())
  .then((enhancedData: EnhancedProgramData) => {
    showProgramOverlay(enhancedData);
  })
  .catch(err => {
    console.error('GradMatch AI error', err);
  });


function showProgramOverlay(programData: EnhancedProgramData): void {
  let overlay = document.getElementById('gradmatch-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gradmatch-overlay';
    overlay.className = 'gradmatch-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="gradmatch-header">
      <img src="${chrome.runtime.getURL('images/logo-small.png')}" alt="GradMatch" class="gradmatch-logo">
      <span>GradMatch</span>
      <button class="gradmatch-close-btn">×</button>
    </div>
    <div class="gradmatch-content">
      <h3>Program Match</h3>
      <div class="gradmatch-likelihood">
        <div class="gradmatch-likelihood-label">Admission Match:</div>
        <div class="gradmatch-likelihood-bar">
          <div class="gradmatch-likelihood-fill" style="width: ${programData.likelihoodScore}%"></div>
        </div>
        <div class="gradmatch-likelihood-percentage">${programData.likelihoodScore}%</div>
      </div>
      <div class="gradmatch-program-info">
        <div class="gradmatch-info-row"><span class="gradmatch-label">Program:</span><span class="gradmatch-value">${programData.programName}</span></div>
        <div class="gradmatch-info-row"><span class="gradmatch-label">University:</span><span class="gradmatch-value">${programData.universityName}</span></div>
        <div class="gradmatch-info-row"><span class="gradmatch-label">Acceptance Rate:</span><span class="gradmatch-value">${(programData.admissionStats.acceptanceRate * 100).toFixed(1)}%</span></div>
        <div class="gradmatch-info-row"><span class="gradmatch-label">Avg. GPA:</span><span class="gradmatch-value">${programData.admissionStats.averageGpa.toFixed(2)}</span></div>
        <div class="gradmatch-info-row"><span class="gradmatch-label">Funding:</span><span class="gradmatch-value">${programData.funding.available ? 'Available' : 'Limited'}</span></div>
      </div>
      ${programData.advisors.length > 0 ? `
        <div class="gradmatch-advisors">
          <h4>Potential Advisors</h4>
          <ul>
            ${programData.advisors.map(advisor => `<li>${advisor.name} - ${advisor.research}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  overlay.querySelector('.gradmatch-close-btn')?.addEventListener('click', () => {
    overlay?.classList.add('gradmatch-hidden');
  });

  saveToRecentMatches(programData);
}

/**
 * Saves the enhanced program data to the recent matches in chrome.storage.
 */
function saveToRecentMatches(programData: EnhancedProgramData): void {
  chrome.storage.local.get(['recentMatches'], (result: { recentMatches?: EnhancedProgramData[] }) => {
    let recentMatches = result.recentMatches || [];
    // Remove any existing entry for this URL
    recentMatches = recentMatches.filter(match => match.url !== programData.url);
    // Add the new match to the front
    recentMatches.unshift(programData);
    // Limit to last 10 matches
    if (recentMatches.length > 10) {
      recentMatches = recentMatches.slice(0, 10);
    }
    chrome.storage.local.set({ recentMatches });
  });
}

// --- Utility functions remain unchanged (omitted here for brevity) ---
// Make sure you keep all existing utility functions at the bottom: 
// extractProgramName(), extractUniversityName(), generateRandomGpa(), etc.

/**
 * Attempts to extract the university name from the page title or headings.
 */
function extractUniversityName(): string {
  // Try to extract from <title>
  const title = document.title;
  const match = title.match(/([A-Za-z\s]+University|[A-Za-z\s]+College|[A-Za-z\s]+Institute)/i);
  if (match) {
    return match[0].trim();
  }
  // Try to extract from headings
  const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent || '');
  for (const heading of headings) {
    const headingMatch = heading.match(/([A-Za-z\s]+University|[A-Za-z\s]+College|[A-Za-z\s]+Institute)/i);
    if (headingMatch) {
      return headingMatch[0].trim();
    }
  }
  // Fallback to domain
  return window.location.hostname;
}

document.addEventListener('DOMContentLoaded', init);