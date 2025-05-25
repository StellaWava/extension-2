// popup.ts

// popup.ts

// Wait for popup DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  const messageElement = document.getElementById("message");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: { id: any; }[]) => {
    if (!tabs[0]?.id) {
      if (messageElement) messageElement.innerText = "No active tab found.";
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "getMarketplaceStatus" },
      (response: { status: string; }) => {
        if (chrome.runtime.lastError) {
          // Content script not injected
          if (messageElement) {
            messageElement.innerText = "GradMatch is not active on this page.";
          }
        } else {
          if (messageElement) {
            messageElement.innerText = response?.status || "No status available.";
          }
        }
      }
    );
  });
});
