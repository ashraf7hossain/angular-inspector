// Isolated-world bridge: MAIN-world scripts cannot use chrome.* APIs.
const OPEN_IDE_EVENT = "__ng-inspector:open-in-ide__";

window.addEventListener(OPEN_IDE_EVENT, (event) => {
  const debugInfo = event.detail?.debugInfo;
  if (!debugInfo) return;

  chrome.storage.sync.get({ projectRoot: "", ide: "vscode" }, (items) => {
    const resolved = resolveDebugInfoPath(debugInfo, items.projectRoot);
    if (!resolved) return;

    chrome.runtime.sendMessage({
      type: "OPEN_IN_IDE",
      filePath: resolved.filePath,
      line: resolved.line,
      column: resolved.column,
      ide: items.ide || "vscode",
    });
  });
});
