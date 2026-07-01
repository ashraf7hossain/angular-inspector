function normalizePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
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
    filePath = debugInfo;
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
