/**
 * Intercepts clicks on Angular/Vite/Webpack dev error overlays and opens
 * file paths in the configured IDE via the extension bridge.
 */
(function () {
  "use strict";

  const OPEN_IDE_EVENT = "__ng-inspector:open-in-ide__";

  function dispatchOpenInIde(debugInfo) {
    if (!debugInfo) return;
    console.log("[Angular Inspector] opening from error overlay:", debugInfo);
    window.dispatchEvent(
      new CustomEvent(OPEN_IDE_EVENT, {
        detail: { debugInfo },
      }),
    );
  }

  function isWebpackOverlayFrame() {
    return (
      window.name === "webpack-dev-server-client-overlay" ||
      window.frameElement?.id === "webpack-dev-server-client-overlay"
    );
  }

  function isErrorOverlayElement(node) {
    if (!(node instanceof Element)) return false;

    if (node.localName === "vite-error-overlay") return true;
    if (node.id === "webpack-dev-server-client-overlay") return true;
    if (node.closest?.("vite-error-overlay")) return true;

    return false;
  }

  function isInsideErrorOverlay(event) {
    if (isWebpackOverlayFrame()) return true;

    return event.composedPath().some((node) => isErrorOverlayElement(node));
  }

  function findFileLocationFromClick(event) {
    const path = event.composedPath();

    for (const node of path) {
      if (!(node instanceof Element)) continue;

      if (node.classList?.contains("file-link")) {
        const parsed = parseFileLocation(node.textContent);
        if (parsed) return parsed;
      }

      if (node.dataset?.canOpen === "true") {
        const parsed =
          parseFileLocation(node.textContent) ||
          parseFileLocation(node.parentElement?.textContent || "");
        if (parsed) return parsed;
      }
    }

    return findFileLocationAtPoint(event.clientX, event.clientY);
  }

  function handleErrorOverlayClick(event) {
    if (!isInsideErrorOverlay(event)) return;

    const fileLocation = findFileLocationFromClick(event);
    if (!fileLocation) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    dispatchOpenInIde(fileLocation);
  }

  document.addEventListener("click", handleErrorOverlayClick, true);

  console.log(
    "%c🅰️ Angular Inspector: error overlay file links enabled.",
    "color:#dd0031;font-weight:bold;font-size:12px;",
  );
})();
