// Toggle UI for CLZ dark mode. Persists state to chrome.storage.local and notifies
// all matching tabs on www.clzschoolplein.nl to apply/remove the class.

const STORAGE_KEY = 'clzDarkEnabled';
const MATCH_URL = '*://www.clzschoolplein.nl/*';

const stateLabel = document.getElementById('stateLabel');
const toggleBtn = document.getElementById('toggleBtn');
const openSite = document.getElementById('openSite');

openSite.href = 'https://www.clzschoolplein.nl/';

function setUI(enabled) {
  stateLabel.textContent = enabled ? 'Dark mode: ON' : 'Dark mode: OFF';
  toggleBtn.textContent = enabled ? 'Turn off' : 'Turn on';
  toggleBtn.setAttribute('aria-pressed', String(enabled));
}

// Query all CLZ tabs and send message to each to set/toggle mode
function notifyTabs(message) {
  if (!chrome || !chrome.tabs) return;
  chrome.tabs.query({ url: MATCH_URL }, (tabs) => {
    for (const t of tabs) {
      try {
        chrome.tabs.sendMessage(t.id, message, () => {
          // ignore response
        });
      } catch (e) {
        // ignore per-tab errors (tab may not have content script yet)
      }
    }
  });
}

// Toggle handler: flip stored value and notify tabs
async function toggleHandler() {
  try {
    chrome.storage.local.get([STORAGE_KEY], (items) => {
      const current = !!items[STORAGE_KEY];
      const next = !current;
      chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
        setUI(next);
        // Explicitly tell tabs to set the new state (safer than toggle message)
        notifyTabs({ action: 'set-dark', enabled: next });
      });
    });
  } catch (err) {
    console.error('popup: toggle error', err);
  }
}

// Initialize: read stored preference and update UI. If not present, assume enabled true.
function init() {
  if (!chrome || !chrome.storage) {
    setUI(false);
    return;
  }

  chrome.storage.local.get([STORAGE_KEY], (items) => {
    if (chrome.runtime.lastError) {
      setUI(false);
      return;
    }
    // If key not present, default to true (matches content script optimistic apply)
    const enabled = (STORAGE_KEY in items) ? !!items[STORAGE_KEY] : true;
    setUI(enabled);
  });
}

// Watch for storage changes to reflect changes made in other popups/tabs
if (chrome && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STORAGE_KEY]) {
      setUI(!!changes[STORAGE_KEY].newValue);
    }
  });
}

toggleBtn.addEventListener('click', toggleHandler);
init();
