const ENABLE_KEY = "clzDarkEnabled";
const THEME_KEY = "clzTheme";
const MATCH_PATTERNS = [
  "*://www.clzschoolplein.nl/*",
  "*://clzschoolplein.nl/*",
];

// DOM
const stateLabel = document.getElementById("stateLabel");
const hint = document.getElementById("hint");
const switchRoot = document.getElementById("switchRoot");
const toggleInput = document.getElementById("toggleInput");

const accent = document.getElementById("accent");
const contrastBadge = document.getElementById("contrastBadge");
const darkness = document.getElementById("darkness");
const darknessVal = document.getElementById("darknessVal");
const fontsize = document.getElementById("fontsize");
const imageDim = document.getElementById("imageDim");
const imageDimVal = document.getElementById("imageDimVal");
const desaturate = document.getElementById("desaturate");

const previewBtn = document.getElementById("previewBtn");
const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const jsonArea = document.getElementById("jsonArea");

const presetDark = document.getElementById("presetDark");
const presetContrast = document.getElementById("presetContrast");
const presetWarm = document.getElementById("presetWarm");

const helpLink = document.getElementById("helpLink");
helpLink.href = "https://darealpsl.github.io/clzschoolplein-darkmode/";

/* Presets */
const PRESETS = {
  dark: {
    preset: "dark",
    accent: "#115a8b",
    bgDarkness: 0.92,
    fontSizeScale: 1,
    imageDim: 0.85,
    desaturateImages: false,
  },
  contrast: {
    preset: "contrast",
    accent: "#ffffff", // accent as white on dark background (high contrast)
    bgDarkness: 1,
    fontSizeScale: 1.05,
    imageDim: 0.9,
    desaturateImages: false,
  },
  warm: {
    preset: "warm",
    accent: "#d97706",
    bgDarkness: 0.92,
    fontSizeScale: 1,
    imageDim: 0.8,
    desaturateImages: true,
  },
};

// Color contrast helpers (shoutout to Claude.ai)
function hexToRgb(hex) {
  if (!hex) return [0, 0, 0];
  hex = hex.replace("#", "").trim();
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const L1 = luminance(r1, g1, b1);
  const L2 = luminance(r2, g2, b2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

// Simple UI helpers
function updateContrastBadge() {
  const accentColor = accent.value || "#115a8b";
  const ratio = contrastRatio(accentColor, "#ffffff");
  const badge = contrastBadge;
  if (!badge) return;
  badge.textContent = `Contrast: ${ratio}`;
  if (ratio >= 4.5) {
    badge.className = "badge ok";
    badge.title = "Good contrast vs white (WCAG AA)";
  } else {
    badge.className = "badge warn";
    badge.title = "Low contrast vs white - may be hard to read";
  }
}

function notifyTabs(message) {
  if (typeof chrome === "undefined" || !chrome.tabs) return;
  chrome.tabs.query({ url: MATCH_PATTERNS }, (tabs) => {
    if (tabs && tabs.length) {
      for (const t of tabs) {
        try {
          chrome.tabs.sendMessage(t.id, message);
        } catch (e) {}
      }
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      const t = activeTabs && activeTabs[0];
      if (!t || !t.url) return;
      if (t.url.includes("clzschoolplein.nl")) {
        try {
          chrome.tabs.sendMessage(t.id, message);
        } catch (e) {}
      }
    });
  });
}

// Build the theme object from inputs
function getThemeFromInputs() {
  return {
    preset: null,
    accent: accent.value || "#115a8b",
    bgDarkness: parseFloat(darkness.value) || 0.92,
    fontSizeScale: parseFloat(fontsize.value) || 1,
    imageDim: parseFloat(imageDim.value) || 0.85,
    desaturateImages: !!desaturate.checked,
  };
}

// Apply the values to the inputs
function applyThemeToInputs(theme) {
  if (!theme) return;
  if (theme.accent) accent.value = theme.accent;
  if (typeof theme.bgDarkness === "number") {
    darkness.value = theme.bgDarkness;
    darknessVal.textContent = Number(theme.bgDarkness).toFixed(2);
  }
  if (typeof theme.fontSizeScale === "number")
    fontsize.value = String(theme.fontSizeScale);
  if (typeof theme.imageDim === "number") {
    imageDim.value = theme.imageDim;
    imageDimVal.textContent = Number(theme.imageDim).toFixed(2);
  }
  if (typeof theme.desaturateImages === "boolean")
    desaturate.checked = !!theme.desaturateImages;
  updateContrastBadge();
}

// Persist the theme and enabled flag
function persistTheme(theme, enableDark = true) {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    // notify anyway
    notifyTabs({ action: "apply-theme", theme });
    notifyTabs({ action: "set-dark", enabled: !!enableDark });
    setUI(!!enableDark);
    return;
  }
  chrome.storage.local.set(
    { [THEME_KEY]: theme, [ENABLE_KEY]: !!enableDark },
    () => {
      notifyTabs({ action: "apply-theme", theme });
      notifyTabs({ action: "set-dark", enabled: !!enableDark });
      setUI(!!enableDark);
    }
  );
}

// Set the UI
function setUI(enabled) {
  stateLabel.textContent = enabled ? "Dark mode is ON" : "Dark mode is OFF";
  toggleInput.checked = !!enabled;
  switchRoot.setAttribute("aria-checked", !!enabled);
  hint.textContent = enabled
    ? "Dark styling is active on the site"
    : "Dark styling is disabled. Click to enable.";
}

// Preset handlers
function activatePresetButton(presetName) {
  [presetDark, presetContrast, presetWarm].forEach((btn) =>
    btn.classList.remove("active")
  );
  if (presetName === "dark") presetDark.classList.add("active");
  if (presetName === "contrast") presetContrast.classList.add("active");
  if (presetName === "warm") presetWarm.classList.add("active");
}

presetDark.addEventListener("click", () => {
  const t = PRESETS.dark;
  applyThemeToInputs(t);
  activatePresetButton("dark");
});
presetContrast.addEventListener("click", () => {
  const t = PRESETS.contrast;
  applyThemeToInputs(t);
  activatePresetButton("contrast");
});
presetWarm.addEventListener("click", () => {
  const t = PRESETS.warm;
  applyThemeToInputs(t);
  activatePresetButton("warm");
});

// Preview/apply/import/export/reset/toggle handlers
previewBtn.addEventListener("click", () => {
  const theme = getThemeFromInputs();
  notifyTabs({ action: "apply-theme", theme });
});

applyBtn.addEventListener("click", () => {
  const theme = getThemeFromInputs();
  persistTheme(theme, true);
});

resetBtn.addEventListener("click", () => {
  // remove stored theme and reapply defaults (does keep dark enabled)
  const defaults = PRESETS.dark;
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove([THEME_KEY], () => {
      applyThemeToInputs(defaults);
      persistTheme(defaults, true);
      activatePresetButton("dark");
    });
  } else {
    applyThemeToInputs(defaults);
    notifyTabs({ action: "apply-theme", theme: defaults });
    notifyTabs({ action: "set-dark", enabled: true });
    activatePresetButton("dark");
  }
});

exportBtn.addEventListener("click", () => {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local)
    return;
  chrome.storage.local.get([THEME_KEY], (items) => {
    const data = items[THEME_KEY] || null;
    jsonArea.value = data ? JSON.stringify(data, null, 2) : "";
    try {
      navigator.clipboard.writeText(jsonArea.value);
    } catch (e) {}
  });
});

importBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonArea.value);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
    // clamp values
    parsed.bgDarkness = Math.min(
      1,
      Math.max(0.3, Number(parsed.bgDarkness) || 0.92)
    );
    parsed.fontSizeScale = Math.min(
      1.5,
      Math.max(0.8, Number(parsed.fontSizeScale) || 1)
    );
    parsed.imageDim = Math.min(
      1,
      Math.max(0.3, Number(parsed.imageDim) || 0.85)
    );
    parsed.desaturateImages = !!parsed.desaturateImages;
    applyThemeToInputs(parsed);
    persistTheme(parsed, true);
  } catch (err) {
    alert("Invalid JSON — please paste a valid theme object.");
  }
});

// Toggle dark on & off
function toggleHandler() {
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    const next = !toggleInput.checked;
    setUI(next);
    notifyTabs({ action: "set-dark", enabled: next });
    return;
  }
  chrome.storage.local.get([ENABLE_KEY], (items) => {
    const current = ENABLE_KEY in items ? !!items[ENABLE_KEY] : true;
    const next = !current;
    chrome.storage.local.set({ [ENABLE_KEY]: next }, () => {
      setUI(next);
      notifyTabs({ action: "set-dark", enabled: next });
    });
  });
}
switchRoot.addEventListener("click", (e) => {
  e.preventDefault();
  toggleHandler();
});
switchRoot.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleHandler();
  }
});

// Live UI updates
accent.addEventListener("input", updateContrastBadge);
darkness.addEventListener("input", () => {
  darknessVal.textContent = Number(darkness.value).toFixed(2);
});
imageDim.addEventListener("input", () => {
  imageDimVal.textContent = Number(imageDim.value).toFixed(2);
});

// Sync from storage changes made elsewhere
if (
  typeof chrome !== "undefined" &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[ENABLE_KEY]) setUI(!!changes[ENABLE_KEY].newValue);
    if (changes[THEME_KEY]) {
      const theme = changes[THEME_KEY].newValue || null;
      if (theme) applyThemeToInputs(theme);
    }
  });
}

// Populate the UI from storage or defaults
(function init() {
  const defaults = PRESETS.dark;
  if (
    typeof chrome === "undefined" ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    setUI(false);
    applyThemeToInputs(defaults);
    activatePresetButton("dark");
    return;
  }
  chrome.storage.local.get([ENABLE_KEY, THEME_KEY], (items) => {
    const enabled = ENABLE_KEY in items ? !!items[ENABLE_KEY] : true;
    const theme = items[THEME_KEY] || defaults;
    setUI(enabled);
    applyThemeToInputs(theme);
    activatePresetButton(theme.preset || "dark");
  });
})();
