/**
 * Opens component source files in the user's IDE via custom protocol URLs.
 */

const DEFAULT_IDE = "vscode";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_IN_IDE") {
    return false;
  }

  const { url } = message;
  if (!url) {
    sendResponse({ ok: false, error: "Missing IDE URL" });
    return false;
  }

  chrome.tabs.create({ url, active: true }, (tab) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse({ ok: true, tabId: tab?.id });
  });

  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_SETTINGS") {
    return false;
  }

  chrome.storage.sync.get({ projectRoot: "", ide: DEFAULT_IDE }, (items) => {
    sendResponse({
      projectRoot: items.projectRoot || "",
      ide: items.ide || DEFAULT_IDE,
    });
  });

  return true;
});
