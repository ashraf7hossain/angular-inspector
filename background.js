// background.js

const IDE_URL_BUILDERS = {
  vscode: (filePath, line, column) =>
    `vscode://file/${filePath}:${line}:${column}`,
  vscodium: (filePath, line, column) =>
    `vscodium://file/${filePath}:${line}:${column}`,
  cursor: (filePath, line, column) =>
    `cursor://file/${filePath}:${line}:${column}`,
  webstorm: (filePath, line) =>
    `webstorm://open?file=${encodeURIComponent(filePath)}&line=${line}`,
};

function buildIdeUrl(ide, filePath, line, column) {
  const builder = IDE_URL_BUILDERS[ide] || IDE_URL_BUILDERS.vscode;
  return builder(filePath, line, column);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "OPEN_IN_IDE") return;

  const ide = message.ide || "vscode";
  const filePath = String(message.filePath || "").replace(/\\/g, "/");
  const line = message.line || 1;
  const column = message.column || 1;

  console.log("[Angular Inspector] opening in IDE:", {
    ide,
    filePath,
    line,
    column,
  });

  if (!filePath) {
    sendResponse({ ok: false, error: "No file path" });
    return;
  }

  const url = buildIdeUrl(ide, filePath, line, column);
  console.log("[Angular Inspector] IDE URL:", url);

  chrome.tabs.create({ url, active: false }, () => {
    sendResponse({
      ok: !chrome.runtime.lastError,
      error: chrome.runtime.lastError?.message,
    });
  });

  return true;
});
