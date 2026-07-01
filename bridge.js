// Isolated-world bridge: MAIN-world scripts cannot use chrome.* APIs.
const OPEN_IDE_EVENT = "__ng-inspector:open-in-ide__";

window.addEventListener(OPEN_IDE_EVENT, (event) => {
  const debugInfo = event.detail?.debugInfo;
  if (!debugInfo) return;

  chrome.storage.sync.get({ projectRoot: "", ide: "vscode" }, (items) => {
    const resolved = resolveDebugInfoPath(debugInfo, items.projectRoot);

    console.log("[Angular Inspector] debugInfo path:", debugInfo);
    console.log(
      "[Angular Inspector] project root:",
      items.projectRoot || "(not set)",
    );
    if (resolved) {
      console.log(
        "[Angular Inspector] final path:",
        `${resolved.filePath}:${resolved.line}:${resolved.column}`,
      );
    } else {
      console.log("[Angular Inspector] final path: (could not resolve)");
    }

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
