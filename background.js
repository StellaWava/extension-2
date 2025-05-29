// Background service worker for Course Compare extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Course Compare extension installed');
  
  // Initialize storage
  chrome.storage.local.get(['savedPrograms', 'isPremium', 'trialUsed'], (result) => {
    if (!result.savedPrograms) {
      chrome.storage.local.set({ savedPrograms: [] });
    }
    if (result.isPremium === undefined) {
      chrome.storage.local.set({ isPremium: false });
    }
    if (result.trialUsed === undefined) {
      chrome.storage.local.set({ trialUsed: 0 });
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveProgram') {
    handleSaveProgram(message.programData, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'getSavedPrograms') {
    chrome.storage.local.get(['savedPrograms'], (result) => {
      sendResponse({ savedPrograms: result.savedPrograms || [] });
    });
    return true;
  }
  
  if (message.action === 'removeProgram') {
    handleRemoveProgram(message.programId, sendResponse);
    return true;
  }
  
  if (message.action === 'checkPremiumStatus') {
    chrome.storage.local.get(['isPremium', 'trialUsed'], (result) => {
      sendResponse({ 
        isPremium: result.isPremium || false,
        trialUsed: result.trialUsed || 0
      });
    });
    return true;
  }

  if (message.action === 'upgradeToPremium') {
    handleUpgradeToPremium(sendResponse);
    return true;
  }
});

function handleSaveProgram(programData, sendResponse) {
  chrome.storage.local.get(['savedPrograms', 'isPremium', 'trialUsed'], (result) => {
    const savedPrograms = result.savedPrograms || [];
    const isPremium = result.isPremium || false;
    const trialUsed = result.trialUsed || 0;
    
    // Check for duplicates
    const exists = savedPrograms.some(p => 
      p.university.toLowerCase() === programData.university.toLowerCase() && 
      p.title.toLowerCase() === programData.title.toLowerCase()
    );
    
    if (exists) {
      sendResponse({ success: false, error: 'Program already saved!' });
      return;
    }
    
    // Enforce free tier limit
    if (!isPremium && savedPrograms.length >= 3) {
      sendResponse({ success: false, error: 'Free limit reached! Upgrade to Premium for unlimited saves.' });
      return;
    }
    
    // Add new program
    const newProgram = {
      id: Date.now(),
      ...programData,
      savedAt: new Date().toISOString()
    };
    
    savedPrograms.push(newProgram);
    
    const updates = { savedPrograms };
    if (!isPremium) {
      updates.trialUsed = trialUsed + 1;
    }
    
    chrome.storage.local.set(updates, () => {
      sendResponse({
        success: true,
        program: newProgram,
        savedPrograms: savedPrograms
      });
    });
  });
}


// in handleRemoveProgram, return the updated list:
function handleRemoveProgram(programId, sendResponse) {
  chrome.storage.local.get(['savedPrograms'], (result) => {
    const savedPrograms = result.savedPrograms || [];
    const updatedPrograms = savedPrograms.filter(p => p.id !== programId);
    chrome.storage.local.set({ savedPrograms: updatedPrograms }, () => {
      // include the new array
      sendResponse({ success: true, savedPrograms: updatedPrograms });
    });
  });
}


function handleUpgradeToPremium(sendResponse) {
  // In a real implementation, this would integrate with Stripe/payment processor
  // For MVP demo, we'll simulate the upgrade
  chrome.storage.local.set({ isPremium: true }, () => {
    sendResponse({ success: true });
  });
}
