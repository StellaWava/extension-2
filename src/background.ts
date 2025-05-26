import { StorageManager } from './utils/storage';

// Log when the extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Course Compare Extension installed');

  try {
    const data = await StorageManager.getData();
    await StorageManager.saveData(data);
  } catch (err) {
    console.error('[Background] Failed to initialize storage:', err);
  }
});

// Log when service worker wakes up on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Service worker started');
});

// Listen to messages from popup or content scripts
chrome.runtime.onMessage.addListener((request: Record<string, any>, sender, sendResponse) => {
  console.log('[Background] Received message:', request);

  (async () => {
    try {
      switch (request.action) {
        case 'saveProgram': {
          const success = await StorageManager.addProgram(request.data);
          console.log('[Background] saveProgram result:', success);
          sendResponse({ success, message: success ? 'Program saved!' : 'Already saved' });
          break;
        }

        case 'getPrograms': {
          const programs = await StorageManager.getPrograms();
          console.log('[Background] Returning programs:', programs);
          sendResponse({ programs });
          break;
        }

        case 'removeProgram': {
          await StorageManager.removeProgram(request.id);
          console.log('[Background] Program removed:', request.id);
          sendResponse({ success: true });
          break;
        }

        case 'checkLimits': {
          const storageData = await StorageManager.getData();
          const canSave = storageData.isPremium || storageData.programs.length < storageData.settings.maxFreePrograms;
          console.log('[Background] checkLimits:', {
            canSave,
            count: storageData.programs.length,
            limit: storageData.settings.maxFreePrograms,
            isPremium: storageData.isPremium
          });
          sendResponse({
            canSave,
            count: storageData.programs.length,
            limit: storageData.settings.maxFreePrograms,
            isPremium: storageData.isPremium
          });
          break;
        }

        default:
          console.warn('[Background] Unknown action:', request.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Background] Error handling message:', error);
      sendResponse({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();

  return true; // Required for async sendResponse
});
