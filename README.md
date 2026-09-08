## Angular inspector (very common and poorly chosen name by cursor and I am too lazy to remove that name from all places) is a chrome extension which opens a component on (ctrl + leftClick) in your desired IDE. Currently it supports
- VScode
- Cursor
- WebStorm.
- Will support
  - Zed (one prompt away)
  - Intellij (one prompt away)

# The Core functions of this extension.

## finding filePath.
```javascript
  function getComponentMetadata(componentInstance) {
    if (!componentInstance) return null;
    try {
      // Ivy stores metadata on the constructor's ɵcmp property
      const cmp = componentInstance.constructor?.ɵcmp;
      if (cmp) return cmp;

      // Also try ɵfac, ɵdir
      const dir = componentInstance.constructor?.ɵdir;
      const filePath = getComponentFilePath(componentInstance);
      console.log("filePath => ", filePath);
      if (dir) return dir;
    } catch (_) {}
    return null;
  }
```
## finding grandpa.
### Some components don't have filePath (like components from library), for this scenario we used grandpa searching algorithm :D (nearest ancestor that has a valid debugInfo sorta DFS.) 

```js
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
```

