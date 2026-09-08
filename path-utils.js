function normalizePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

const SOURCE_FILE_EXT =
  "ts|tsx|js|jsx|mjs|cjs|html|htm|scss|sass|less|css|json|vue|md";

const FILE_LOCATION_RE = new RegExp(
  "(?:file://|webpack://\\./)?" +
    "(" +
    "(?:" +
    "[a-zA-Z]:[/\\\\]|" +
    "/" +
    ")?" +
    "(?:[.]{1,2}[/\\\\])?" +
    "(?:[\\w.-]+[/\\\\])*" +
    `[\\w.-]+\\.(?:${SOURCE_FILE_EXT})` +
    ")" +
    ":(\\d+)(?::(\\d+))?",
  "i",
);

function parseFileLocation(text) {
  if (!text || typeof text !== "string") return null;

  const match = FILE_LOCATION_RE.exec(text.trim());
  if (!match) return null;

  let filePath = match[1].replace(/\\/g, "/");
  if (filePath.startsWith("./")) {
    filePath = filePath.slice(2);
  }

  return {
    filePath,
    line: parseInt(match[2], 10) || 1,
    column: parseInt(match[3], 10) || 1,
  };
}

function findFileLocationAtPoint(x, y) {
  const range =
    document.caretRangeFromPoint?.(x, y) ||
    (() => {
      const pos = document.caretPositionFromPoint?.(x, y);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.setEnd(pos.offsetNode, pos.offset);
      return r;
    })();

  if (!range) return null;

  const container =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer;

  if (!container) return null;

  const block =
    container.closest?.("pre, code, a.file-link, [data-can-open]") || container;
  const text = block.textContent || "";
  if (!text) return null;

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    let offset = 0;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node === range.startContainer) {
        offset += range.startOffset;
        break;
      }
      offset += node.textContent.length;
    }

    const lines = text.split("\n");
    let charCount = 0;
    for (const line of lines) {
      const lineEnd = charCount + line.length;
      if (offset >= charCount && offset <= lineEnd) {
        const parsed = parseFileLocation(line);
        if (parsed) return parsed;
      }
      charCount = lineEnd + 1;
    }
  }

  return parseFileLocation(text);
}

function isAbsolutePath(path) {
  return /^[a-zA-Z]:\//.test(path) || path.startsWith("/");
}

function combineProjectPath(projectRoot, filePath) {
  const relative = normalizePath(filePath);
  if (!relative) return null;
  if (isAbsolutePath(relative)) return relative;

  const root = normalizePath(projectRoot);
  if (!root) return relative;

  const rootParts = root
    .replace(/^[a-zA-Z]:\//, "")
    .split("/")
    .filter(Boolean);
  const fileParts = relative.split("/").filter(Boolean);

  for (
    let overlap = Math.min(rootParts.length, fileParts.length);
    overlap > 0;
    overlap--
  ) {
    const rootSuffix = rootParts.slice(-overlap).join("/");
    const filePrefix = fileParts.slice(0, overlap).join("/");
    if (rootSuffix === filePrefix) {
      const rest = fileParts.slice(overlap).join("/");
      return rest ? `${root}/${rest}` : root;
    }
  }

  return `${root}/${relative}`;
}

function resolveDebugInfoPath(debugInfo, projectRoot) {
  if (!debugInfo) return null;

  let filePath = null;
  let line = 1;
  let column = 1;

  if (typeof debugInfo === "string") {
    const parsed = parseFileLocation(debugInfo);
    if (parsed) {
      filePath = parsed.filePath;
      line = parsed.line;
      column = parsed.column;
    } else {
      filePath = debugInfo;
    }
  } else if (typeof debugInfo === "object") {
    filePath =
      debugInfo.filePath ||
      debugInfo.fileName ||
      debugInfo.file ||
      debugInfo.sourceFile ||
      null;
    line = debugInfo.lineNumber ?? debugInfo.line ?? 1;
    column = debugInfo.columnNumber ?? debugInfo.column ?? 1;
  }

  if (!filePath) return null;

  const combined = combineProjectPath(projectRoot, filePath);
  if (!combined) return null;

  return { filePath: combined, line, column };
}
