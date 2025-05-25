// background.ts

console.log('✅ GradMatch background service worker loaded');

// Optional: Initialize default user profile
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['userProfile'], (result) => {
    if (!result.userProfile) {
      chrome.storage.sync.set({
        userProfile: {
          gpa: 3.5  // default GPA, can be updated via popup
        }
      });
      console.log('GradMatch: Default user profile initialized');
    }
  });
});

// Optional: Handle messages (if needed in future)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'Background is active' });
  }

  // Example: Set GPA
  if (message.action === 'setGpa' && typeof message.gpa === 'number') {
    chrome.storage.sync.set({ userProfile: { gpa: message.gpa } });
    sendResponse({ status: 'GPA updated' });
  }

  return true;
});
