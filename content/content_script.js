const ROOT_CLASS = "clz-dark-mode";
const ENABLE_KEY = "clzDarkEnabled"; // boolean
const THEME_KEY = "clzTheme"; // object: { accent, bgDarkness, fontSizeScale }
const OVERRIDE_STYLE_ID = "clz-theme-overrides";

// Get root element
function rootEl() {
  return document.documentElement || document.body || document;
}
function applyClass(enabled) {
  const el = rootEl();
  if (!el) return;
  try {
    if (enabled) el.classList.add(ROOT_CLASS);
    else el.classList.remove(ROOT_CLASS);
  } catch (e) {
    console.error("clz: applyClass error", e);
  }
}

// Build CSS variable block
function buildCssVars(theme) {
  const accent = theme && theme.accent ? theme.accent : "#115a8b";
  const bgRaw = theme && typeof theme.bgDarkness === "number" ? theme.bgDarkness : 0.92;
  const scaleRaw = theme && typeof theme.fontSizeScale === "number" ? theme.fontSizeScale : 1;
  const imgBrightnessRaw = theme && typeof theme.imageDim === "number" ? theme.imageDim : 0.85;
  const imgDesatRaw =
    theme && typeof theme.desaturateImages === "number"
      ? theme.desaturateImages
      : theme && theme.desaturateImages
      ? 0.5
      : 0;
  const bg = Math.min(1, Math.max(0.3, Number(bgRaw) || 0.92));
  const scale = Math.min(1.5, Math.max(0.8, Number(scaleRaw) || 1));
  const imgBrightness = Math.min(
    1,
    Math.max(0.3, Number(imgBrightnessRaw) || 0.85)
  );
  const imgDesat = Math.min(1, Math.max(0, Number(imgDesatRaw) || 0));

  return `:root{--clz-accent:${accent};--clz-bg-opa:${bg};--clz-font-scale:${scale};--clz-img-brightness:${imgBrightness};--clz-img-desat:${imgDesat};}`;
}

function createOrUpdateOverrideStyle(theme) {
  try {
    const css = buildCssVars(theme);
    let s = document.getElementById(OVERRIDE_STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = OVERRIDE_STYLE_ID;
      s.type = "text/css";
      s.appendChild(document.createTextNode(css));
      const parent = document.head || document.documentElement;
      parent.appendChild(s);
    } else {
      if ("textContent" in s) s.textContent = css;
      else {
        while (s.firstChild) s.removeChild(s.firstChild);
        s.appendChild(document.createTextNode(css));
      }
    }
  } catch (err) {
    console.error("clz-theme: failed to inject overrides", err);
  }
}

function removeOverrideStyle() {
  try {
    const s = document.getElementById(OVERRIDE_STYLE_ID);
    if (s) s.remove();
  } catch (e) {}
}

/* Early apply to reduce white flash */
(function earlyApply() {
  applyClass(true);
})();

function readAndApplyStored() {
  try {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local
    )
      return;
    chrome.storage.local.get([ENABLE_KEY, THEME_KEY], (items) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
      if (Object.prototype.hasOwnProperty.call(items, ENABLE_KEY))
        applyClass(!!items[ENABLE_KEY]);
      const theme = items[THEME_KEY] || null;
      if (theme) createOrUpdateOverrideStyle(theme);
      else removeOverrideStyle();
    });
  } catch (err) {
    console.error("clz-theme: read error", err);
  }
}

/* Runtime message handler
   Supports:
   - { action: 'toggle-dark' }
   - { action: 'set-dark', enabled: true/false }
   - { action: 'get-dark' } => { enabled: boolean }
   - { action: 'apply-theme', theme: {...} }
   - { action: 'get-theme' } => { theme: {...} }
*/
function handleMessage(message, sender, sendResponse) {
  if (!message || !message.action) return false;
  try {
    if (message.action === "set-dark") {
      const enabled = !!message.enabled;
      applyClass(enabled);
      try {
        chrome &&
          chrome.storage &&
          chrome.storage.local &&
          chrome.storage.local.set({ [ENABLE_KEY]: enabled });
      } catch (e) {}
      sendResponse && sendResponse({ set: true, enabled });
      return true;
    }
    if (message.action === "apply-theme") {
      const theme = message.theme || null;
      if (theme) {
        createOrUpdateOverrideStyle(theme);
        try {
          chrome &&
            chrome.storage &&
            chrome.storage.local &&
            chrome.storage.local.set({ [THEME_KEY]: theme });
        } catch (e) {}
      } else {
        removeOverrideStyle();
        try {
          chrome &&
            chrome.storage &&
            chrome.storage.local &&
            chrome.storage.local.remove([THEME_KEY]);
        } catch (e) {}
      }
      sendResponse && sendResponse({ applied: true });
      return true;
    }
    if (message.action === "get-theme") {
      try {
        chrome.storage.local.get([THEME_KEY], (items) => {
          sendResponse && sendResponse({ theme: items[THEME_KEY] || null });
        });
        return true;
      } catch (e) {
        sendResponse && sendResponse({ theme: null });
        return false;
      }
    }
  } catch (err) {
    console.error("clz-theme: message handler error", err);
    sendResponse && sendResponse({ error: String(err) });
  }
  return false;
}

// Message + storage listeners
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((m, s, r) => handleMessage(m, s, r));
}
if (
  typeof chrome !== "undefined" &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes) return;
    if (changes[ENABLE_KEY]) applyClass(!!changes[ENABLE_KEY].newValue);
    if (changes[THEME_KEY]) {
      const newTheme = changes[THEME_KEY].newValue || null;
      if (newTheme) createOrUpdateOverrideStyle(newTheme);
      else removeOverrideStyle();
    }
  });
}

// Apply stored values now
readAndApplyStored();

/* Expose small debug API */
try {
  window.__clzTheme = {
    apply(t) {
      createOrUpdateOverrideStyle(t);
      try {
        chrome &&
          chrome.storage &&
          chrome.storage.local &&
          chrome.storage.local.set({ [THEME_KEY]: t });
      } catch (e) {}
    },
    remove() {
      removeOverrideStyle();
      try {
        chrome &&
          chrome.storage &&
          chrome.storage.local &&
          chrome.storage.local.remove([THEME_KEY]);
      } catch (e) {}
    },
    enable() {
      applyClass(true);
      try {
        chrome &&
          chrome.storage &&
          chrome.storage.local &&
          chrome.storage.local.set({ [ENABLE_KEY]: true });
      } catch (e) {}
    },
    disable() {
      applyClass(false);
      try {
        chrome &&
          chrome.storage &&
          chrome.storage.local &&
          chrome.storage.local.set({ [ENABLE_KEY]: false });
      } catch (e) {}
    },
    isEnabled() {
      return document.documentElement.classList.contains(ROOT_CLASS);
    },
  };
} catch (e) {}
