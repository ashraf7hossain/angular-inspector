function getNgContext(element) {
  if (!element) return null;

  try {
    const ctx = window.ng?.getContext?.(element);
    if (ctx) return ctx;
  } catch (_) {}

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

  let el = element;
  while (el && el !== document.documentElement) {
    try {
      const component = window.ng?.getComponent?.(el);
      if (component) return { element: el, component, type: "ivy" };
    } catch (_) {}

    if (el.__ngContext__ !== undefined) {
      return { element: el, component: el.__ngContext__, type: "ivy-context" };
    }

    el = el.parentElement;
  }
  return null;
}

function getComponentFilePath(component) {
  if (!component) return null;

  if (component.constructor?.ɵcmp?.debugInfo) {
    return component.constructor.ɵcmp.debugInfo;
  }

  return null;
}

function getComponentFilePathBySelector(selector) {
  if (!selector || !window.ng) return null;

  try {
    const el = document.querySelector(selector);
    if (!el) return null;

    return getComponentFilePath(window.ng.getComponent(el));
  } catch (_) {}

  return null;
}

function getDebugInfoFromElement(element) {
  if (!element || !window.ng) return null;

  let el = element;
  while (el && el !== document.documentElement) {
    try {
      const debugInfo = getComponentFilePath(window.ng.getComponent(el));
      if (debugInfo) return debugInfo;
    } catch (_) {}
    el = el.parentElement;
  }

  return null;
}
