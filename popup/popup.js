const STORAGE_KEY = 'clzDarkEnabled';
const MATCH_URL = '*://www.clzschoolplein.nl/*';

const stateLabel = document.getElementById('stateLabel');
const hint = document.getElementById('hint');
const toggleRoot = document.getElementById('switchRoot');
const toggleInput = document.getElementById('toggleInput');
const openSite = document.getElementById('openSite');
const resetBtn = document.getElementById('resetBtn');
const helpLink = document.getElementById('helpLink');

openSite.addEventListener('click', () => {
  // open site in new tab
  try {
    chrome.tabs.create({ url: 'https://www.clzschoolplein.nl/' });
  } catch (e) {
    window.open('https://www.clzschoolplein.nl/', '_blank', 'noreferrer');
  }
});

helpLink.href = 'https://darealpsl.github.io/clzschoolplein-darkmode/';

function setUI(enabled) {
  stateLabel.textContent = enabled ? 'Dark mode is ON' : 'Dark mode is OFF';
  toggleRoot.classList.toggle('on', !!enabled);
  toggleRoot.setAttribute('aria-checked', !!enabled);
  toggleInput.checked = !!enabled;
  hint.textContent = enabled
    ? 'Dark styling is active on all clzschoolplein.nl pages.'
    : 'Dark styling is disabled. Click to enable.';
}

// send message to all matching tabs to set the mode
function notifyTabs(message) {
  if (!chrome || !chrome.tabs) return;
  chrome.tabs.query({ url: MATCH_URL }, (tabs) => {
    for (const t of tabs) {
      try {
        chrome.tabs.sendMessage(t.id, message, () => {});
      } catch (err) {
        // ignore
      }
    }
  });
}

function setStoredAndNotify(enabled) {
  if (!chrome || !chrome.storage) {
    // fallback: just update UI and attempt to notify
    setUI(enabled);
    notifyTabs({ action: 'set-dark', enabled });
    return;
  }

  chrome.storage.local.set({ [STORAGE_KEY]: !!enabled }, () => {
    setUI(enabled);
    notifyTabs({ action: 'set-dark', enabled });
  });
}

// Toggle handler (click or keyboard)
function toggleHandler() {
  try {
    chrome.storage.local.get([STORAGE_KEY], (items) => {
      const current = (STORAGE_KEY in items) ? !!items[STORAGE_KEY] : true;
      const next = !current;
      setStoredAndNotify(next);
    });
  } catch (err) {
    // fallback
    const next = !toggleInput.checked;
    setStoredAndNotify(next);
  }
}

// Reset preference (remove key, default goes back to optimistic enabled)
function resetPreference() {
  if (!chrome || !chrome.storage) {
    setStoredAndNotify(true);
    return;
  }
  chrome.storage.local.remove([STORAGE_KEY], () => {
    setStoredAndNotify(true);
  });
}

// Initialize UI on popup open
function init() {
  if (!chrome || !chrome.storage) {
    // If storage not available, show disabled state
    setUI(false);
    return;
  }

  chrome.storage.local.get([STORAGE_KEY], (items) => {
    if (chrome.runtime.lastError) {
      setUI(false);
      return;
    }
    const enabled = (STORAGE_KEY in items) ? !!items[STORAGE_KEY] : true;
    setUI(enabled);
  });
}

// Listen for storage changes to reflect outside changes
if (chrome && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[STORAGE_KEY]) {
      setUI(!!changes[STORAGE_KEY].newValue);
    }
  });
}

// Click + keyboard support for the label (makes the custom switch accessible)
toggleRoot.addEventListener('click', (e) => {
  e.preventDefault();
  toggleHandler();
});

toggleRoot.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleHandler();
  }
});

resetBtn.addEventListener('click', resetPreference);

init();
