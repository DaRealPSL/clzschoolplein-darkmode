/* Constants & helpers */
const ROOT_CLASS = 'clz-dark-mode';
const STORAGE_KEY = 'clzDarkEnabled';

function applyClass(enabled) {
  try {
    const el = document.documentElement || document.body || document;
    if (!el) return;
    if (enabled) {
      el.classList.add(ROOT_CLASS);
    } else {
      el.classList.remove(ROOT_CLASS);
    }
  } catch (err) {
    // Let's try to not crash the page
    console.error('clz-dark-mode: applyClass error', err);
  }
}

/* Early apply to reduce flash.
   We'll add the class immediately by default so dark styles appear during initial paint
   Later we'll read the stored preference and correct if needed
*/
(function earlyApply() {
  // Default: enable dark mode to reduce white flash
  // If the user previously set enabled=false, we'll remove it shortly after reading storage
  applyClass(true);
})();

/* Read stored preference (async). If stored value is explicitly false, disable.
   If no preference stored (undefined), we keep the optimistic enable.
*/
function readStoredPreferenceAndApply() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    // Not available or not running in extension context; keep optimistic default.
    return;
  }

  try {
    chrome.storage.local.get([STORAGE_KEY], (items) => {
      // If the key exists and is strictly false, disable. Otherwise keep enabled.
      if (chrome.runtime.lastError) {
        // Storage might not be available; leave as-is.
        return;
      }
      if (Object.prototype.hasOwnProperty.call(items, STORAGE_KEY)) {
        const enabled = !!items[STORAGE_KEY];
        applyClass(enabled);
      }
      // If preference not set, do nothing (keep optimistic enabled).
    });
  } catch (err) {
    // ignore
    console.error('clz-dark-mode: storage read error', err);
  }
}

/* Message listener: allows popup or background to toggle or set dark mode.
   Supports:
     { action: 'toggle-dark' }               -> toggles current class
     { action: 'set-dark', enabled: true }   -> explicitly set enabled/disabled
     { action: 'get-dark' }                  -> respond with { enabled: boolean }
*/
function handleRuntimeMessage(message, sender, sendResponse) {
  try {
    if (!message || !message.action) return;
    if (message.action === 'toggle-dark') {
      const isEnabled = document.documentElement.classList.contains(ROOT_CLASS);
      const newState = !isEnabled;
      applyClass(newState);
      // Persist new state
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY]: newState }, () => {
            // ignore errors
            if (chrome.runtime.lastError) {
              // no-op
            }
          });
        }
      } catch (err) {
        // ignore
      }
      sendResponse && sendResponse({ toggled: true, enabled: newState });
    } else if (message.action === 'set-dark') {
      const enabled = !!message.enabled;
      applyClass(enabled);
      try {
        chrome && chrome.storage && chrome.storage.local && chrome.storage.local.set({ [STORAGE_KEY]: enabled });
      } catch (err) { /* ignore */ }
      sendResponse && sendResponse({ set: true, enabled });
    } else if (message.action === 'get-dark') {
      const enabled = document.documentElement.classList.contains(ROOT_CLASS);
      sendResponse && sendResponse({ enabled });
    }
  } catch (err) {
    console.error('clz-dark-mode: message handler error', err);
  }
  // Indicate we will send a response asynchronously if needed.
  return true;
}

/* Storage change listener: respond to changes made in other tabs/popups */
function handleStorageChange(changes, areaName) {
  if (areaName !== 'local' || !changes || !changes[STORAGE_KEY]) return;
  const newVal = changes[STORAGE_KEY].newValue;
  applyClass(!!newVal);
}

/* Attach listeners (if chrome.* is available) */
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const maybeAsync = handleRuntimeMessage(msg, sender, sendResponse);
    return maybeAsync;
  });
}

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(handleStorageChange);
}

/* Finally, read stored preference and apply */
readStoredPreferenceAndApply();

/* Expose a small global for debugging */
try {
  window.__clzDarkMode = {
    enable() { applyClass(true); try { chrome && chrome.storage && chrome.storage.local && chrome.storage.local.set({ [STORAGE_KEY]: true }); } catch (e) {} },
    disable() { applyClass(false); try { chrome && chrome.storage && chrome.storage.local && chrome.storage.local.set({ [STORAGE_KEY]: false }); } catch (e) {} },
    toggle() { const cur = document.documentElement.classList.contains(ROOT_CLASS); this[ cur ? 'disable' : 'enable' ](); },
    isEnabled() { return document.documentElement.classList.contains(ROOT_CLASS); }
  };
} catch (err) {
  // ignore
}
