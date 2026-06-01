/**
 * Angular Component Inspector - Content Script
 * Ctrl+Hover: highlights element with component selector label
 * Ctrl+Click: logs full component details to console
 */

 import { getComponentFilePath, getComponentFilePathBySelector } from "./ng-helper.js";

(function () {
  "use strict";

  let currentHighlighted = null;
  let overlayLabel = null;
  let isCtrlDown = false;

  // ─── Utility: find Angular component context ────────────────────────────────

  function getAngularVersion() {
    if (window.ng) {
      try {
        const el = document.querySelector("[ng-version]");
        if (el) return el.getAttribute("ng-version");
      } catch (_) {}
      return "Angular (version unknown)";
    }
    return null;
  }

  function getNgContext(element) {
    if (!element) return null;

    // Angular Ivy (v9+)
    try {
      const ctx = window.ng?.getContext?.(element);
      console.log("ctx => ", ctx);
      if (ctx) return ctx;
    } catch (_) {}

    // Angular Ivy debug element
    try {
      const debugEl = window.ng?.getComponent?.(element);
      if (debugEl) return debugEl;
    } catch (_) {}

    return null;
  }

  function getComponentFromElement(element) {
    if (
      !element ||
      element === document.body ||
      element === document.documentElement
    )
      return null;

    // Walk up the DOM to find the nearest Angular component
    let el = element;
    while (el && el !== document.documentElement) {
      // Check for Ivy component
      try {
        const component = window.ng?.getComponent?.(el);
        if (component) return { element: el, component, type: "ivy" };
      } catch (_) {}

      // Check for __ngContext__ (Ivy internal)
      if (el.__ngContext__ !== undefined) {
        return {
          element: el,
          component: el.__ngContext__,
          type: "ivy-context",
        };
      }

      // Angular ViewEngine (v2–v8) via ng-reflect or __ngContext
      if (
        el.constructor &&
        el.constructor.name &&
        el.constructor.name !== "HTMLElement" &&
        el.constructor.name !== "HTMLDivElement" &&
        !el.constructor.name.startsWith("HTML")
      ) {
        // Might be a component
      }

      el = el.parentElement;
    }
    return null;
  }

  function getComponentSelector(element) {
    if (!element) return null;

    let el = element;
    while (el && el !== document.documentElement) {
      // Strategy 1: Ivy getOwningComponent / getComponent
      try {
        const comp = window.ng?.getComponent?.(el);
        if (comp) {
          // Try to get selector from metadata
          const meta = getComponentMetadata(comp);
          if (meta?.selector)
            return {
              selector: meta.selector,
              element: el,
              component: comp,
              meta,
            };

          // Fallback: use the tag name if it looks like a component (has dash or known angular pattern)
          const tag = el.tagName.toLowerCase();
          if (tag.includes("-") || el.hasAttribute("ng-version")) {
            return { selector: tag, element: el, component: comp, meta };
          }
        }
      } catch (_) {}

      // Strategy 2: __ngContext__ with LView
      try {
        const ctx = el.__ngContext__;
        if (ctx) {
          console.log("ctx => ", ctx);
          console.log("context =>", getNgContext(el));
          // LView[8] is typically the component definition (tView.data)
          if (Array.isArray(ctx)) {
            const tView = ctx[1]; // TView
            if (tView?.data?.[8]?.selectors) {
              const selectors = tView.data[8].selectors;
              const sel = flattenSelectors(selectors);
              if (sel)
                return {
                  selector: sel,
                  element: el,
                  component: ctx,
                  meta: tView.data[8],
                };
            }
          }
          // Context object directly
          const tag = el.tagName.toLowerCase();
          if (tag.includes("-")) {
            return { selector: tag, element: el, component: ctx, meta: null };
          }
        }
      } catch (_) {}

      // Strategy 3: Use element tag name if it looks like a component selector
      const tag = el.tagName.toLowerCase();
      if (tag.includes("-")) {
        // Custom element / Angular component
        try {
          const comp = window.ng?.getComponent?.(el);
          return {
            selector: tag,
            element: el,
            component: comp || null,
            meta: null,
          };
        } catch (_) {
          return { selector: tag, element: el, component: null, meta: null };
        }
      }

      // Strategy 4: Check ng-reflect attributes (ViewEngine hint)
      const attrs = Array.from(el.attributes || []);
      const ngAttr = attrs.find(
        (a) => a.name.startsWith("_nghost") || a.name.startsWith("_ngcontent"),
      );
      if (ngAttr) {
        // This element is a component host or inside one — keep walking up for host
        if (ngAttr.name.startsWith("_nghost")) {
          return {
            selector: el.tagName.toLowerCase(),
            element: el,
            component: null,
            meta: null,
          };
        }
      }

      el = el.parentElement;
    }

    return null;
  }

  function getComponentMetadata(componentInstance) {
    if (!componentInstance) return null;
    try {
      // Ivy stores metadata on the constructor's ɵcmp property
      const cmp = componentInstance.constructor?.ɵcmp;
      if (cmp) return cmp;

      // Also try ɵfac, ɵdir
      const dir = componentInstance.constructor?.ɵdir;
      const filePath = getComponentFilePathByComponent(componentInstance);
      console.log("filePath => ", filePath);
      if (dir) return dir;
    } catch (_) {}
    return null;
  }

  function flattenSelectors(selectors) {
    if (!selectors) return null;
    try {
      if (typeof selectors === "string") return selectors;
      if (Array.isArray(selectors)) {
        const flat = selectors
          .flat(Infinity)
          .filter((s) => typeof s === "string" && s.length > 0);
        return flat[0] || null;
      }
    } catch (_) {}
    return null;
  }

  function getComponentDetails(info) {
    if (!info) return null;
    const { selector, element, component, meta } = info;

    const details = {
      selector,
      tagName: element?.tagName?.toLowerCase(),
      angularVersion: getAngularVersion(),
    };

    // Inputs / Outputs from metadata
    if (meta) {
      if (meta.inputs) details.inputs = normalizeIO(meta.inputs);
      if (meta.outputs) details.outputs = normalizeIO(meta.outputs);
      if (meta.exportAs) details.exportAs = meta.exportAs;
      if (meta.standalone !== undefined) details.standalone = meta.standalone;
      if (meta.template) details.hasTemplate = true;
      if (meta.styles?.length) details.stylesCount = meta.styles.length;
    }

    // Component instance properties (filter private/angular internals)
    if (component && typeof component === "object") {
      const instance = window.ng?.getComponent?.(element) || component;
      if (
        instance &&
        typeof instance === "object" &&
        !Array.isArray(instance)
      ) {
        const instanceKeys = Object.keys(instance).filter(
          (k) =>
            !k.startsWith("__") && !k.startsWith("ɵ") && !k.startsWith("_"),
        );
        if (instanceKeys.length > 0) {
          details.instanceProperties = {};
          instanceKeys.forEach((k) => {
            try {
              const val = instance[k];
              if (typeof val !== "function") {
                details.instanceProperties[k] = val;
              }
            } catch (_) {}
          });
        }
      }
    }

    // DOM info
    details.element = element;
    details.attributes = {};
    Array.from(element?.attributes || []).forEach((attr) => {
      details.attributes[attr.name] = attr.value;
    });
    console.log(element);

    return details;
  }

  function normalizeIO(io) {
    if (!io) return {};
    if (typeof io === "object" && !Array.isArray(io)) return io;
    return io;
  }

  // ─── Overlay ────────────────────────────────────────────────────────────────

  function createLabel() {
    if (overlayLabel) return overlayLabel;
    overlayLabel = document.createElement("div");
    overlayLabel.id = "__ng-inspector-label__";
    document.body.appendChild(overlayLabel);
    return overlayLabel;
  }

  function showHighlight(element, selectorInfo) {
    if (currentHighlighted === element) return;
    removeHighlight();

    currentHighlighted = element;
    element.classList.add("__ng-inspector-highlight__");

    const label = createLabel();
    const selector = selectorInfo?.selector || element.tagName.toLowerCase();
    label.textContent = `<${selector}>`;
    label.className = "__ng-inspector-label__";

    // Position label at top-center of element
    positionLabel(element, label);
  }

  function positionLabel(element, label) {
    // Use rAF to ensure layout is ready
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      const top = rect.top + scrollY;
      const left = rect.left + scrollX + rect.width / 2;

      label.style.top = `${top}px`;
      label.style.left = `${left}px`;
      label.style.display = "block";
    });
  }

  function removeHighlight() {
    if (currentHighlighted) {
      currentHighlighted.classList.remove("__ng-inspector-highlight__");
      currentHighlighted = null;
    }
    if (overlayLabel) {
      overlayLabel.style.display = "none";
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Control") {
        isCtrlDown = true;
        document.body.classList.add("__ng-inspector-active__");
      }
    },
    true,
  );

  document.addEventListener(
    "keyup",
    (e) => {
      if (e.key === "Control") {
        isCtrlDown = false;
        document.body.classList.remove("__ng-inspector-active__");
        removeHighlight();
      }
    },
    true,
  );

  document.addEventListener(
    "mousemove",
    (e) => {
      if (!isCtrlDown) return;

      const target = e.target;
      if (!target || target.id === "__ng-inspector-label__") return;

      // Avoid re-processing same element
      if (target === currentHighlighted) {
        if (overlayLabel) positionLabel(target, overlayLabel);
        return;
      }

      const selectorInfo = getComponentSelector(target);

      console.log("element contenxt", getNgContext(selectorInfo.element));
      console.log(
        "element component",
        getComponentFromElement(selectorInfo.element),
      );

      if (selectorInfo) {
        showHighlight(selectorInfo.element, selectorInfo);
      } else {
        // No Angular component found; highlight the hovered element with a "no component" note
        showHighlight(target, {
          selector: `${target.tagName.toLowerCase()} (no component)`,
        });
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!isCtrlDown) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target;
      if (!target || target.id === "__ng-inspector-label__") return;

      const selectorInfo = getComponentSelector(target);

      if (!selectorInfo) {
        console.group(
          "%c🔍 Angular Inspector — No Component Found",
          "color:#f59e0b;font-size:14px;font-weight:bold;",
        );
        console.log(
          "%cClicked element:",
          "color:#94a3b8;font-weight:bold;",
          target,
        );
        console.log(
          "%cAngular version:",
          "color:#94a3b8;font-weight:bold;",
          getAngularVersion() || "Not detected",
        );
        console.log(
          "%cTip:",
          "color:#94a3b8;",
          "This element does not appear to be an Angular component host.",
        );
        console.groupEnd();
        return;
      }

      const details = getComponentDetails(selectorInfo);

      console.group(
        `%c🅰️ Angular Inspector — <${details.selector}>`,
        "color:#dd0031;font-size:14px;font-weight:bold;",
      );

      console.log(
        "%c📌 Selector",
        "color:#60a5fa;font-weight:bold;font-size:12px;",
        `<${details.selector}>`,
      );
      console.log(
        "%c🔖 Tag Name",
        "color:#60a5fa;font-weight:bold;font-size:12px;",
        details.tagName,
      );

      if (details.angularVersion) {
        console.log(
          "%c🅰️ Angular Version",
          "color:#60a5fa;font-weight:bold;font-size:12px;",
          details.angularVersion,
        );
      }

      if (details.standalone !== undefined) {
        console.log(
          "%c⚡ Standalone",
          "color:#60a5fa;font-weight:bold;font-size:12px;",
          details.standalone,
        );
      }

      if (details.exportAs) {
        console.log(
          "%c📤 Export As",
          "color:#60a5fa;font-weight:bold;font-size:12px;",
          details.exportAs,
        );
      }

      if (details.inputs && Object.keys(details.inputs).length > 0) {
        console.group(
          "%c📥 Inputs",
          "color:#34d399;font-weight:bold;font-size:12px;",
        );
        console.table(details.inputs);
        console.groupEnd();
      }

      if (details.outputs && Object.keys(details.outputs).length > 0) {
        console.group(
          "%c📤 Outputs",
          "color:#f472b6;font-weight:bold;font-size:12px;",
        );
        console.table(details.outputs);
        console.groupEnd();
      }

      if (
        details.instanceProperties &&
        Object.keys(details.instanceProperties).length > 0
      ) {
        console.group(
          "%c🧩 Instance Properties",
          "color:#fbbf24;font-weight:bold;font-size:12px;",
        );
        console.log(details.instanceProperties);
        console.groupEnd();
      }

      if (details.hasTemplate) {
        console.log(
          "%c📄 Has Template",
          "color:#60a5fa;font-weight:bold;font-size:12px;",
          true,
        );
      }

      if (details.stylesCount) {
        console.log(
          "%c🎨 Styles Count",
          "color:#60a5fa;font-weight:bold;font-size:12px;",
          details.stylesCount,
        );
      }

      console.group(
        "%c🏷️ DOM Attributes",
        "color:#a78bfa;font-weight:bold;font-size:12px;",
      );
      console.log(details.attributes);
      console.groupEnd();

      console.log(
        "%c🔗 DOM Element",
        "color:#60a5fa;font-weight:bold;font-size:12px;",
        details.element,
      );

      // Expose on window for easy access
      window.$ngComponent = selectorInfo.component;
      window.$ngElement = selectorInfo.element;
      window.$ngMeta = selectorInfo.meta;
      // console.log('%c💡 Tip', 'color:#94a3b8;font-style:italic;', 'Access component via window.$ngComponent, element via window.$ngElement, metadata via window.$ngMeta');
      console.log("element => ", window.$ngComponent);
      console.log("element => ", selectorInfo);

      console.groupEnd();
    },
    true,
  );

  // ─── Scroll: reposition label ────────────────────────────────────────────────
  window.addEventListener(
    "scroll",
    () => {
      if (currentHighlighted && overlayLabel && isCtrlDown) {
        positionLabel(currentHighlighted, overlayLabel);
      }
    },
    true,
  );

  console.log(
    "%c🅰️ Angular Inspector loaded. Hold Ctrl and hover to inspect components.",
    "color:#dd0031;font-weight:bold;font-size:13px;",
  );
})();
