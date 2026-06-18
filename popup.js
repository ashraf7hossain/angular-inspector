const STORAGE_KEYS = ["projectRoot", "ide"];
const DEFAULT_IDE = "vscode";

const projectRootInput = document.getElementById("projectRoot");
const ideSelect = document.getElementById("ide");
const saveStatus = document.getElementById("saveStatus");

function showStatus(text, isError = false) {
  if (!saveStatus) return;
  saveStatus.textContent = text;
  saveStatus.className = isError ? "save-status error" : "save-status saved";
}

function loadSettings() {
  chrome.storage.sync.get({ projectRoot: "", ide: DEFAULT_IDE }, (items) => {
    if (projectRootInput) projectRootInput.value = items.projectRoot || "";
    if (ideSelect) ideSelect.value = items.ide || DEFAULT_IDE;
  });
}

function saveSettings() {
  const projectRoot = projectRootInput?.value?.trim() ?? "";
  const ide = ideSelect?.value || DEFAULT_IDE;

  chrome.storage.sync.set({ projectRoot, ide }, () => {
    if (chrome.runtime.lastError) {
      showStatus(chrome.runtime.lastError.message, true);
      return;
    }
    showStatus("Saved");
  });
}

projectRootInput?.addEventListener("change", saveSettings);
projectRootInput?.addEventListener("blur", saveSettings);
ideSelect?.addEventListener("change", saveSettings);

loadSettings();
