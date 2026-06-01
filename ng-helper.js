

 export function getNgContext(element) {
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

  export function getComponentFromElement(element) {
    if (!element || element === document.body || element === document.documentElement) return null;

    // Walk up the DOM to find the nearest Angular component
    let el = element;
    while (el && el !== document.documentElement) {
      // Check for Ivy component
      try {
        const component = window.ng?.getComponent?.(el);
        if (component) return { element: el, component, type: 'ivy' };
      } catch (_) {}

      // Check for __ngContext__ (Ivy internal)
      if (el.__ngContext__ !== undefined) {
        return { element: el, component: el.__ngContext__, type: 'ivy-context' };
      }

      // Angular ViewEngine (v2–v8) via ng-reflect or __ngContext
      if (el.constructor && el.constructor.name && el.constructor.name !== 'HTMLElement'
        && el.constructor.name !== 'HTMLDivElement'
        && !el.constructor.name.startsWith('HTML')) {
        // Might be a component
      }

      el = el.parentElement;
    }
    return null;
  }

  export function getComponentFilePath(component) {
    if (!component) return null;

    // Try Angular debug info (Angular 17+)
    if (component.constructor?.ɵcmp?.debugInfo) {
      return component.constructor.ɵcmp.debugInfo;
    }

    // Try source map via fake error
    const ctor = component.constructor;
    const _orig = ctor;
    let filePath = null;

    try {
      const scriptURL = new Error().stack;
      console.log(scriptURL);
    } catch(e) {}

    return filePath;
  }

export  function getComponentFilePathBySelector(selector) {
    const el = document.querySelector(selector)
    const comp = window.ng.getComponent(el)
    const ctor = comp.constructor

    // Get source location from constructor
    const fnString = ctor.toString()

    // Try Angular debug info (Angular 17+)
    if (ctor.ɵcmp?.debugInfo) {
      return ctor.ɵcmp.debugInfo
    }

    // Try source map via fake error
    const _orig = ctor
    let filePath = null

    try {
      const scriptURL = new Error().stack
      console.log(scriptURL)
    } catch(e) {}

    return filePath
  }
