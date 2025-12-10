"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // types/targets.ts
  var VARIANT_TARGETS = [
    {
      id: "figma-cover",
      label: "Figma Community Cover",
      description: "1920 \xD7 960 hero cover",
      width: 1920,
      height: 960
    },
    {
      id: "figma-gallery",
      label: "Figma Community Gallery",
      description: "1600 \xD7 960 gallery preview",
      width: 1600,
      height: 960
    },
    {
      id: "figma-thumbnail",
      label: "Figma Community Thumbnail",
      description: "480 \xD7 320 thumbnail",
      width: 480,
      height: 320
    },
    {
      id: "web-hero",
      label: "Web Hero Banner",
      description: "1440 \xD7 600 responsive hero",
      width: 1440,
      height: 600
    },
    {
      id: "social-carousel",
      label: "Social Carousel Panel",
      description: "1080 \xD7 1080 square carousel tile",
      width: 1080,
      height: 1080
    },
    {
      id: "youtube-cover",
      label: "YouTube Cover",
      description: "2560 \xD7 1440 channel cover",
      width: 2560,
      height: 1440
    },
    {
      id: "tiktok-vertical",
      label: "TikTok Vertical Promo",
      description: "1080 \xD7 1920 vertical spotlight",
      width: 1080,
      height: 1920
    },
    {
      id: "gumroad-cover",
      label: "Gumroad Cover",
      description: "1280 \xD7 720 product cover",
      width: 1280,
      height: 720
    },
    {
      id: "gumroad-thumbnail",
      label: "Gumroad Thumbnail",
      description: "600 \xD7 600 store thumbnail",
      width: 600,
      height: 600
    }
  ];
  function getTargetById(id) {
    return VARIANT_TARGETS.find((target) => target.id === id);
  }

  // ui/template.ts
  var UI_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Product Landing</title>
  <style>
    :root {
      color-scheme: light dark;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: var(--figma-color-bg, #f7f9fc);
      color: var(--figma-color-text, #101828);
    }
    main {
      padding: 16px 16px 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    p {
      margin: 0;
    }
    .section {
      background: var(--figma-color-bg-secondary, #ffffff);
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.1));
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--figma-color-text-secondary, #475467);
    }
    .targets {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .targets select {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 6px 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
      min-height: 120px;
    }
    .targets select:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(51, 92, 255, 0.24);
      border-color: var(--figma-color-bg-brand, #335cff);
    }
    .targets-help,
    .targets-summary {
      font-size: 12px;
      margin: 0;
    }
    .targets-help {
      color: var(--figma-color-text-secondary, #475467);
    }
    .targets-summary {
      color: var(--figma-color-text, #101828);
      font-weight: 600;
    }
    .safe-area-control {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .safe-area-control input[type="range"] {
      width: 100%;
    }
    .safe-area-value {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .safe-area-presets {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .safe-area-presets-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .safe-area-preset-label {
      font-weight: 600;
      color: var(--figma-color-text, #101828);
    }
    .preset-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .preset-pill {
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      border-radius: 999px;
      background: transparent;
      color: var(--figma-color-text, #101828);
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.16s ease-in-out, color 0.16s ease-in-out, border-color 0.16s ease-in-out;
    }
    .preset-pill.active {
      background: rgba(51, 92, 255, 0.12);
      border-color: rgba(51, 92, 255, 0.32);
      color: var(--figma-color-text, #101828);
    }
    .preset-hint {
      font-size: 12px;
      margin: 0;
      color: var(--figma-color-text-secondary, #475467);
    }
    input[type="password"],
    input[type="text"] {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 8px 10px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
    }
    button {
      border: none;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      background: var(--figma-color-bg-brand, #335cff);
      color: var(--figma-color-text-onbrand, #ffffff);
      transition: background 0.16s ease-in-out;
    }
    button[disabled] {
      background: var(--figma-color-bg-disabled, #d0d5dd);
      color: var(--figma-color-text-disabled, #98a2b3);
      cursor: not-allowed;
    }
    button.secondary {
      background: transparent;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.2));
      color: var(--figma-color-text, #101828);
    }
    .button-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .status {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      min-height: 18px;
    }
    .status.error {
      color: #b42318;
    }
    ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ai-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }
    .ai-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .warning {
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(250, 176, 5, 0.12);
      color: #7a3b00;
    }
    .warning.info {
      background: rgba(16, 156, 241, 0.12);
      color: #0f3b78;
    }
    .last-run {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .result-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid rgba(16, 24, 40, 0.1);
      border-radius: 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.04));
      color: #ffffff;
    }
    .result-item strong {
      font-size: 12px;
    }
    .ai-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .ai-chip {
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(16, 24, 40, 0.06);
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    .ai-chip.info {
      background: rgba(16, 156, 241, 0.14);
      color: #0f3b78;
    }
    .ai-chip.success {
      background: rgba(34, 197, 94, 0.14);
      color: #166534;
    }
    .ai-chip.warn {
      background: rgba(250, 176, 5, 0.16);
      color: #7a3b00;
    }
    .ai-qa {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ai-qa-item {
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid rgba(16, 24, 40, 0.08);
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.04));
      color: var(--figma-color-text, #101828);
    }
    .ai-qa-item.warn {
      border-color: rgba(250, 176, 5, 0.45);
      background: rgba(250, 176, 5, 0.12);
    }
    .ai-qa-item.info {
      border-color: rgba(16, 156, 241, 0.35);
      background: rgba(16, 156, 241, 0.08);
    }
    .ai-qa-item.error {
      border-color: rgba(191, 38, 38, 0.35);
      background: rgba(191, 38, 38, 0.12);
    }
    .ai-qa-title {
      font-weight: 600;
      text-transform: capitalize;
    }
    .ai-qa-meta {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      margin-top: 4px;
    }
    .layout-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .layout-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid rgba(16, 24, 40, 0.08);
      border-radius: 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
    }
    .layout-row label {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: 12px;
      color: var(--figma-color-text, #101828);
    }
    .layout-meta {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .layout-row select {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
      padding: 6px 8px;
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
      font: inherit;
      color: inherit;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Product Landing</h1>
      <p id="selectionLabel" class="status">Select a single frame to begin.</p>
    </header>

    <section class="section" id="aiSection" hidden>
      <div class="ai-header">
        <div class="ai-title">
          <h2>AI signals</h2>
          <p id="aiStatusText" class="status">AI analysis is built into this plugin. Select a frame to analyze.</p>
        </div>
        <button id="refreshAiButton" class="secondary">Run AI analysis</button>
      </div>
      <div id="aiEmpty" class="status">No AI signals found on selection.</div>
      <div id="aiRoles" class="ai-row" role="list"></div>
      <div id="aiQa" class="ai-qa" role="list"></div>
      <p id="aiQaSummary" class="status"></p>
    </section>

    <section class="section" id="layoutSection" hidden>
      <h2>Layout patterns</h2>
      <p class="status" id="layoutStatus">AI-suggested patterns per target.</p>
      <div id="layoutContainer" class="layout-list"></div>
    </section>

    <section class="section">
      <h2 id="targetSection">Targets</h2>
      <div id="targetList" class="targets-list" role="listbox" aria-multiselectable="true" aria-labelledby="targetSection"></div>
      <p id="targetSummary" class="targets-summary" style="margin-top: 8px;"></p>
    </section>

    <section class="section">
      <h2>Safe area</h2>
      <div class="safe-area-control">
        <label for="safeAreaSlider" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Safe area inset</span>
          <span class="safe-area-value" id="safeAreaValue">8%</span>
        </label>
        <input id="safeAreaSlider" type="range" min="0" max="0.2" step="0.01" value="0.08" />
      </div>
      <div class="safe-area-presets">
        <div class="safe-area-presets-header">
          <span>Presets</span>
          <span class="safe-area-preset-label" id="safeAreaPresetLabel">Balanced (8%)</span>
        </div>
        <div class="preset-pills" id="safeAreaPresets">
          <button type="button" class="preset-pill" data-safe-area-preset="tight" data-label="Tight" data-value="0.04">
            Tight \xB7 4%
          </button>
          <button type="button" class="preset-pill active" data-safe-area-preset="balanced" data-label="Balanced" data-value="0.08">
            Balanced \xB7 8%
          </button>
          <button type="button" class="preset-pill" data-safe-area-preset="roomy" data-label="Roomy" data-value="0.12">
            Roomy \xB7 12%
          </button>
        </div>
      </div>
      <p class="preset-hint">Adjusts the inset used for QA overlays and safe-area checks. Presets snap to brand policies; use the slider for custom ratios.</p>
    </section>

    <button id="generateButton" disabled>Generate variants</button>
    <p id="statusMessage" class="status">Select a single frame to begin.</p>

    <section class="section last-run" id="lastRunSection" hidden>
      <h2>Last run</h2>
      <p id="lastRunContent"></p>
    </section>

    <section class="section" id="resultsSection" hidden>
      <h2>Results</h2>
      <div id="resultsContainer" style="display: flex; flex-direction: column; gap: 8px;"></div>
    </section>
  </main>

  <script>
    (function () {
      const selectionLabel = document.getElementById("selectionLabel");
      const targetList = document.getElementById("targetList");
      const targetSummary = document.getElementById("targetSummary");
      const safeAreaSlider = document.getElementById("safeAreaSlider");
      const safeAreaValue = document.getElementById("safeAreaValue");
      const safeAreaPresets = document.getElementById("safeAreaPresets");
      const safeAreaPresetLabel = document.getElementById("safeAreaPresetLabel");
      const generateButton = document.getElementById("generateButton");
      const statusMessage = document.getElementById("statusMessage");
      const aiStatusText = document.getElementById("aiStatusText");
      const refreshAiButton = document.getElementById("refreshAiButton");
      const lastRunSection = document.getElementById("lastRunSection");
      const lastRunContent = document.getElementById("lastRunContent");
      const resultsSection = document.getElementById("resultsSection");
      const resultsContainer = document.getElementById("resultsContainer");
      const aiSection = document.getElementById("aiSection");
      const aiEmpty = document.getElementById("aiEmpty");
      const aiRoles = document.getElementById("aiRoles");
      const aiQa = document.getElementById("aiQa");
      const aiQaSummary = document.getElementById("aiQaSummary");
      const layoutSection = document.getElementById("layoutSection");
      const layoutStatus = document.getElementById("layoutStatus");
      const layoutContainer = document.getElementById("layoutContainer");

      const LAYOUT_CONFIDENCE_THRESHOLD = 0.65;
      const QA_CONFIDENCE_THRESHOLD = 0.35;
      let availableTargets = [];
      let selectedTargetIds = new Set();
      let selectionReady = false;
      let isBusy = false;
      let layoutSelections = {};
      let aiConfigured = false;
      let aiStatusState = "missing-key";
      let aiErrorMessage = "";
      let aiUsingDefaultKey = false;

      if (!(targetList instanceof HTMLElement)) {
        throw new Error("Target list element missing.");
      }
      if (!(targetSummary instanceof HTMLElement)) {
        throw new Error("Target summary element missing.");
      }
      if (!(safeAreaSlider instanceof HTMLInputElement)) {
        throw new Error("Safe area slider missing.");
      }

      function createChip(text, tone = "") {
        const chip = document.createElement("span");
        chip.className = "ai-chip" + (tone ? " " + tone : "");
        chip.textContent = text;
        return chip;
      }

      function renderTargets(targets) {
        availableTargets = targets;
        targetList.innerHTML = "";
        
        targets.forEach((target) => {
          const item = document.createElement("div");
          item.className = "target-item";
          item.role = "option";
          item.setAttribute("aria-selected", "false");
          item.dataset.id = target.id;
          
          const preview = document.createElement("div");
          preview.className = "target-preview";
          // Calculate aspect ratio for preview
          const maxDim = 24;
          const ratio = target.width / target.height;
          let w, h;
          if (ratio > 1) {
            w = maxDim;
            h = maxDim / ratio;
          } else {
            h = maxDim;
            w = maxDim * ratio;
          }
          preview.style.width = w + "px";
          preview.style.height = h + "px";
          
          const label = document.createElement("div");
          label.className = "target-info";
          const name = document.createElement("div");
          name.className = "target-name";
          name.textContent = target.label;
          const dim = document.createElement("div");
          dim.className = "target-dim";
          dim.textContent = \`\${target.width} \xD7 \${target.height}\`;
          
          label.appendChild(name);
          label.appendChild(dim);
          
          const check = document.createElement("div");
          check.className = "target-check";
          check.innerHTML = \`<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\`;

          item.appendChild(preview);
          item.appendChild(label);
          item.appendChild(check);
          
          item.addEventListener("click", () => toggleTarget(target.id));
          
          targetList.appendChild(item);
        });
        
        // Initial auto-select all if not set? No, wait for selection update
      }
      
      function toggleTarget(id) {
        if (selectedTargetIds.has(id)) {
          selectedTargetIds.delete(id);
        } else {
          selectedTargetIds.add(id);
        }
        updateTargetVisuals();
        updateGenerateState();
      }
      
      function updateTargetVisuals() {
        const items = targetList.querySelectorAll(".target-item");
        items.forEach(item => {
          const id = item.dataset.id;
          if (selectedTargetIds.has(id)) {
            item.classList.add("selected");
            item.setAttribute("aria-selected", "true");
          } else {
            item.classList.remove("selected");
            item.setAttribute("aria-selected", "false");
          }
        });
      }

      // Add styles for new target list
      const style = document.createElement("style");
      style.textContent = \`
        .targets-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 240px;
          overflow-y: auto;
          border: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.16));
          border-radius: 8px;
          background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.02));
        }
        .target-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid var(--figma-color-border, rgba(16, 24, 40, 0.05));
        }
        .target-item:last-child {
          border-bottom: none;
        }
        .target-item:hover {
          background: rgba(16, 24, 40, 0.04);
        }
        .target-item.selected {
          background: rgba(51, 92, 255, 0.08);
        }
        .target-preview {
          background: var(--figma-color-icon-secondary, #8a93a0);
          border-radius: 2px;
        }
        .target-item.selected .target-preview {
          background: var(--figma-color-bg-brand, #335cff);
        }
        .target-info {
          flex: 1;
        }
        .target-name {
          font-weight: 500;
          font-size: 12px;
        }
        .target-dim {
          font-size: 11px;
          color: var(--figma-color-text-secondary, #475467);
        }
        .target-check {
          color: var(--figma-color-bg-brand, #335cff);
          opacity: 0;
          transition: opacity 0.1s;
        }
        .target-item.selected .target-check {
          opacity: 1;
        }
      \`;
      document.head.appendChild(style);

      const safeAreaPresetButtons =
        safeAreaPresets instanceof HTMLElement
          ? Array.from(safeAreaPresets.querySelectorAll("button[data-safe-area-preset]")).filter((button) =>
              button instanceof HTMLButtonElement
            )
          : [];

      const SAFE_AREA_PRESET_TOLERANCE = 0.0005;

      function updateSafeAreaValue() {
        const value = Number(safeAreaSlider.value);
        const percent = Math.round(value * 100);
        safeAreaValue.textContent = String(percent) + "%";
        // Persistence
        try {
          localStorage.setItem("biblioscale_safe_area", String(value));
        } catch (e) {}
      }
      
      // Load persistence
      try {
        const saved = localStorage.getItem("biblioscale_safe_area");
        if (saved) {
          const val = Number(saved);
          if (!isNaN(val)) {
            safeAreaSlider.value = String(val);
          }
        }
      } catch (e) {}

      function updateSafeAreaPresetDisplay() {
        if (!safeAreaPresetLabel || safeAreaPresetButtons.length === 0) {
          return;
        }
        const currentValue = Number(safeAreaSlider.value);
        let matchedLabel = "";
        safeAreaPresetButtons.forEach((button) => {
          const presetValue = Number(button.getAttribute("data-value") || "0");
          const isMatch = Math.abs(presetValue - currentValue) < SAFE_AREA_PRESET_TOLERANCE;
          button.classList.toggle("active", isMatch);
          if (isMatch) {
            matchedLabel = button.getAttribute("data-label") || button.textContent?.trim() || "";
          }
        });
        const percent = Math.round(currentValue * 100);
        safeAreaPresetLabel.textContent = matchedLabel ? matchedLabel + " (" + percent + "%)" : "Custom (" + percent + "%)";
      }


      function getSelectedTargetIds() {
        return Array.from(selectedTargetIds);
      }

      function updateTargetSummary(ids) {
        if (availableTargets.length === 0) {
          targetSummary.textContent = "No targets available.";
          return;
        }
        if (ids.length === 0) {
          targetSummary.textContent = "No targets selected.";
          return;
        }
        if (ids.length === availableTargets.length) {
          targetSummary.textContent = "All targets selected.";
          return;
        }
        if (ids.length <= 3) {
          const labels = availableTargets
            .filter((target) => ids.includes(target.id))
            .map((target) => target.label);
          targetSummary.textContent = labels.join(", ");
          return;
        }
        targetSummary.textContent = \`\${ids.length} targets selected.\`;
      }

      function updateGenerateState() {
        const ids = getSelectedTargetIds();
        generateButton.disabled = isBusy || !selectionReady || ids.length === 0;
        updateTargetSummary(ids);
      }
      
      function autoSelectTargets(width, height) {
        if (!width || !height) return;
        const ratio = width / height;
        const isPortrait = ratio < 0.8;
        const isLandscape = ratio > 1.2;
        const isSquare = !isPortrait && !isLandscape;
        
        const newSelection = new Set();
        availableTargets.forEach(target => {
          const tRatio = target.width / target.height;
          const tPortrait = tRatio < 0.8;
          const tLandscape = tRatio > 1.2;
          const tSquare = !tPortrait && !tLandscape;
          
          if ((isPortrait && tPortrait) || (isLandscape && tLandscape) || (isSquare && tSquare)) {
             newSelection.add(target.id);
          }
          // Always select "Popular" ones if generic? 
          // For now, simple aspect matching.
          // Fallback: if no match (e.g. extreme aspect), select all?
        });
        
        if (newSelection.size === 0) {
           availableTargets.forEach(t => newSelection.add(t.id));
        }
        
        selectedTargetIds = newSelection;
        updateTargetVisuals();
        updateGenerateState();
      }

      function updateAiStatusDisplay() {
        let text = "";
        if (aiStatusState === "fetching") {
          text = "Analyzing selection with AI\u2026";
        } else if (aiStatusState === "missing-key" || !aiConfigured) {
          text = "AI key is missing from this build. Contact an admin to enable AI analysis.";
        } else if (aiStatusState === "error") {
          text = aiErrorMessage || "AI request failed. Try again.";
        } else if (!selectionReady) {
          text = aiUsingDefaultKey
            ? "Built-in AI key ready. Select a frame to analyze."
            : "Select a frame to request AI analysis.";
        } else if (aiUsingDefaultKey) {
          text = "AI ready via built-in key. Run analysis to refresh insights.";
        } else {
          text = "AI ready. Click Run AI analysis to refresh insights.";
        }

        if (aiStatusState === "error" || aiStatusState === "missing-key") {
          aiStatusText.classList.add("error");
        } else {
          aiStatusText.classList.remove("error");
        }

        aiStatusText.textContent = text;
        refreshAiButton.disabled =
          isBusy || !selectionReady || aiStatusState === "missing-key" || aiStatusState === "fetching";
      }

      function applySelectionState(state) {
        selectionReady = state.selectionOk;
        if (selectionReady) {
          if (state.selectionName) {
            selectionLabel.textContent = "Using " + state.selectionName;
          } else {
            selectionLabel.textContent = "Ready to generate variants.";
          }
          if (!isBusy) {
            statusMessage.textContent = "Ready to generate variants.";
          }
          // Auto select targets based on new selection dimensions
          if (state.selectionWidth && state.selectionHeight) {
            autoSelectTargets(state.selectionWidth, state.selectionHeight);
          }
        } else {
          const message = state.error || "Select a single frame to begin.";
          selectionLabel.textContent = message;
          if (!isBusy) {
            statusMessage.textContent = message;
          }
        }
        aiConfigured = Boolean(state.aiConfigured);
        aiStatusState = state.aiStatus || (aiConfigured ? "idle" : "missing-key");
        aiErrorMessage = typeof state.aiError === "string" ? state.aiError : "";
        aiUsingDefaultKey = Boolean(state.aiUsingDefaultKey);
        updateAiStatusDisplay();
        renderAiSignals(state.aiSignals);
        renderLayoutAdvice(state.layoutAdvice);
        updateGenerateState();
      }

      // Removing old select event listener
      // targetSelect.addEventListener("change", ...); replaced by toggleTarget

      safeAreaSlider.addEventListener("input", () => {
        updateSafeAreaValue();
        updateSafeAreaPresetDisplay();
        if (!isBusy) {
          statusMessage.textContent = "Ready to generate variants.";
        }
      });

      if (safeAreaPresets instanceof HTMLElement) {
        safeAreaPresets.addEventListener("click", (event) => {
          const source = event.target;
          if (!(source instanceof HTMLElement)) {
            return;
          }
          const button = source.closest("button[data-safe-area-preset]");
          if (!button || !(button instanceof HTMLButtonElement)) {
            return;
          }
          const valueAttr = button.getAttribute("data-value");
          if (!valueAttr) {
            return;
          }
          const nextValue = Number(valueAttr);
          if (Number.isNaN(nextValue)) {
            return;
          }
          safeAreaSlider.value = String(nextValue);
          safeAreaSlider.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }

      updateSafeAreaValue();
      updateSafeAreaPresetDisplay();

      generateButton.addEventListener("click", () => {
        const targets = getSelectedTargetIds();
        if (targets.length === 0) {
          statusMessage.textContent = "Select at least one target size.";
          return;
        }
        setBusy(true, "Generating variants\u2026");
        parent.postMessage(
          {
            pluginMessage: {
              type: "generate-variants",
              payload: {
                targetIds: targets,
                safeAreaRatio: Number(safeAreaSlider.value),
                layoutPatterns: layoutSelections
              }
            }
          },
          "*"
        );
      });

      function setBusy(active, message) {
        isBusy = active;
        if (active) {
          generateButton.disabled = true;
          generateButton.textContent = "Generating\u2026";
        } else {
          generateButton.textContent = "Generate variants";
          updateGenerateState();
        }
        statusMessage.textContent = message;
        updateAiStatusDisplay();
      }

      function formatLastRun(lastRun) {
        const date = new Date(lastRun.timestamp);
        const formatted = date.toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "numeric"
        });
        return \`\${formatted} \u2014 \${lastRun.sourceNodeName} (\${lastRun.targetIds.length} targets)\`;
      }

      function renderLayoutAdvice(advice) {
        layoutContainer.innerHTML = "";
        if (!selectionReady) {
          layoutSection.hidden = true;
          return;
        }

        const hasAdvice = advice && Array.isArray(advice.entries) && advice.entries.length > 0;
        layoutSection.hidden = false;
        if (!aiConfigured) {
          layoutStatus.textContent = "AI layout advice unavailable in this build. Contact an admin.";
        } else if (aiStatusState === "fetching") {
          layoutStatus.textContent = "Fetching AI layout patterns\u2026";
        } else if (aiStatusState === "error") {
          layoutStatus.textContent = aiErrorMessage || "AI request failed. Using auto layout.";
        } else if (!hasAdvice) {
          layoutStatus.textContent = "Run AI analysis to populate layout patterns.";
        } else {
          layoutStatus.textContent =
            "AI-suggested patterns per target. Confident picks (\u2265" +
            Math.round(LAYOUT_CONFIDENCE_THRESHOLD * 100) +
            "%) auto-apply; others fall back.";
        }

        if (!hasAdvice) {
          layoutSelections = {};
          layoutContainer.innerHTML = "";
          return;
        }

        const layoutThresholdPercent = Math.round(LAYOUT_CONFIDENCE_THRESHOLD * 100);

        advice.entries.forEach((entry) => {
          const target = availableTargets.find((item) => item.id === entry.targetId);
          if (!target) return;
          const row = document.createElement("div");
          row.className = "layout-row";

          const label = document.createElement("label");
          label.textContent = target.label;
          row.appendChild(label);

          const select = document.createElement("select");
          entry.options.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.id;
            const scoreText = option.score !== undefined ? " - " + Math.round(option.score * 100) + "%" : "";
            opt.textContent = option.label + scoreText;
            opt.title = option.description;
            select.appendChild(opt);
          });

          const sortedOptions = [...entry.options].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const confidentOption = sortedOptions.find(
            (option) => typeof option.score === "number" && option.score >= LAYOUT_CONFIDENCE_THRESHOLD
          );
          const defaultChoice = layoutSelections[entry.targetId] || confidentOption?.id || entry.selectedId || entry.options[0]?.id;
          if (defaultChoice) {
            select.value = defaultChoice;
          }

          if (confidentOption?.id) {
            layoutSelections[entry.targetId] = confidentOption.id;
          } else {
            delete layoutSelections[entry.targetId];
          }

          select.addEventListener("change", () => {
            layoutSelections[entry.targetId] = select.value;
          });

          row.appendChild(select);

          const meta = document.createElement("div");
          meta.className = "layout-meta";
          const topScore = sortedOptions[0]?.score;
          if (confidentOption && typeof confidentOption.score === "number") {
            meta.appendChild(createChip("AI confident", "success"));
            const detail = document.createElement("span");
            detail.textContent =
              Math.round(confidentOption.score * 100) + "% \u2265 " + layoutThresholdPercent + "% threshold";
            meta.appendChild(detail);
          } else {
            meta.appendChild(createChip("Low confidence", "warn"));
            const detail = document.createElement("span");
            const readableScore = typeof topScore === "number" ? Math.round(topScore * 100) + "%" : "No score provided";
            detail.textContent =
              readableScore + " below " + layoutThresholdPercent + "% threshold; generation will fall back unless overridden.";
            meta.appendChild(detail);
          }

          row.appendChild(meta);
          layoutContainer.appendChild(row);
        });
      }

      function renderResults(results) {
        resultsContainer.innerHTML = "";
        results.forEach((result) => {
          const target = availableTargets.find((item) => item.id === result.targetId);
          const tile = document.createElement("div");
          tile.className = "result-item";
          const heading = document.createElement("strong");
          heading.textContent = target ? target.label : result.targetId;
          tile.appendChild(heading);
          if (result.layoutPatternId) {
            const patternLine = document.createElement("span");
            patternLine.style.color = "var(--figma-color-text-secondary, #475467)";
            patternLine.style.fontSize = "12px";
            const confidenceSuffix =
              typeof result.layoutPatternConfidence === "number"
                ? " (" + Math.round(result.layoutPatternConfidence * 100) + "% AI)"
                : "";
            patternLine.textContent =
              "Layout: " + (result.layoutPatternLabel || result.layoutPatternId) + confidenceSuffix;
            tile.appendChild(patternLine);
          } else if (result.layoutPatternFallback) {
            const badge = document.createElement("span");
            badge.className = "ai-chip";
            badge.style.background = "rgba(250, 176, 5, 0.18)";
            badge.style.color = "#7a3b00";
            badge.textContent = "Deterministic layout fallback";
            tile.appendChild(badge);
          }

          if (result.warnings.length === 0) {
            const success = document.createElement("span");
            success.textContent = "No QA warnings.";
            success.style.color = "var(--figma-color-text-secondary, #475467)";
            tile.appendChild(success);
          } else {
            const list = document.createElement("ul");
            result.warnings.forEach((warning) => {
              const item = document.createElement("li");
              const badge = document.createElement("div");
              badge.className = "warning " + (warning.severity === "info" ? "info" : "warn");
              badge.textContent = warning.message;
              item.appendChild(badge);
              list.appendChild(item);
            });
            tile.appendChild(list);
          }
          resultsContainer.appendChild(tile);
        });
      }

      function renderAiSignals(aiSignals) {
        if (!selectionReady) {
          aiSection.hidden = true;
          return;
        }
        aiSection.hidden = false;
        aiRoles.innerHTML = "";
        aiQa.innerHTML = "";
        aiEmpty.hidden = false;
        if (aiQaSummary instanceof HTMLElement) {
          aiQaSummary.textContent = "";
        }

        if (!aiConfigured) {
          aiEmpty.textContent = "AI analysis is unavailable in this build. Contact an admin.";
          return;
        }
        if (aiStatusState === "fetching") {
          aiEmpty.textContent = "Analyzing selection with AI\u2026";
          return;
        }
        if (aiStatusState === "error") {
          aiEmpty.textContent = aiErrorMessage || "AI request failed. Try again.";
          return;
        }

        const hasRoles = aiSignals && Array.isArray(aiSignals.roles) && aiSignals.roles.length > 0;
        const qaSignals = aiSignals && Array.isArray(aiSignals.qa) ? aiSignals.qa : [];
        const filteredQa = qaSignals.filter((qa) => {
          if (qa.confidence === undefined) {
            return true;
          }
          return qa.confidence >= QA_CONFIDENCE_THRESHOLD;
        });
        const suppressedQa = qaSignals.length - filteredQa.length;
        const hasQa = filteredQa.length > 0;

        if (!aiSignals || (!hasRoles && !hasQa)) {
          const thresholdPercent = Math.round(QA_CONFIDENCE_THRESHOLD * 100);
          aiEmpty.textContent =
            suppressedQa > 0
              ? "No QA alerts above " + thresholdPercent + "% confidence (" + suppressedQa + " filtered)."
              : "Run AI analysis to populate signals for this frame.";
          if (suppressedQa > 0 && aiQaSummary instanceof HTMLElement) {
            aiQaSummary.textContent =
              "Filtered " + suppressedQa + " low-confidence QA checks below " + thresholdPercent + "%.";
          }
          return;
        }

        aiEmpty.hidden = true;

        if (aiQaSummary instanceof HTMLElement) {
          const thresholdPercent = Math.round(QA_CONFIDENCE_THRESHOLD * 100);
          const thresholdText = hasQa
            ? "QA alerts \u2265 " + thresholdPercent + "% confidence."
            : "No QA alerts above " + thresholdPercent + "% confidence.";
          aiQaSummary.textContent =
            suppressedQa > 0
              ? thresholdText + " Filtered " + suppressedQa + " low-confidence checks."
              : thresholdText;
        }

        if (hasRoles) {
          aiSignals.roles.slice(0, 8).forEach((role) => {
            const chip = document.createElement("span");
            chip.className = "ai-chip";
            const confidence = Math.round((role.confidence ?? 0) * 100);
            chip.textContent = role.role.replace("_", " ") + " - " + confidence + "%";
            aiRoles.appendChild(chip);
          });
        }

        if (hasQa) {
          filteredQa.forEach((qa) => {
            const item = document.createElement("div");
            item.className = "ai-qa-item " + (qa.severity === "info" ? "info" : qa.severity === "error" ? "error" : "warn");
            const title = document.createElement("div");
            title.className = "ai-qa-title";
            title.textContent = qa.code.replace(/_/g, " ").toLowerCase();
            item.appendChild(title);
            const meta = document.createElement("div");
            meta.className = "ai-qa-meta";
            const confidenceText =
              qa.confidence !== undefined ? Math.round(qa.confidence * 100) + "% confidence" : "Confidence not provided";
            const severityTone = qa.severity === "info" ? "info" : "warn";
            const severityLabel = qa.severity === "error" ? "Critical" : qa.severity === "info" ? "Info" : "Warning";
            meta.appendChild(createChip(severityLabel, severityTone));
            const confidenceSpan = document.createElement("span");
            confidenceSpan.textContent = confidenceText;
            meta.appendChild(confidenceSpan);
            item.appendChild(meta);
            if (qa.message) {
              const detail = document.createElement("div");
              detail.style.color = "var(--figma-color-text-secondary, #475467)";
              detail.style.marginTop = "2px";
              detail.textContent = qa.message;
              item.appendChild(detail);
            }
            aiQa.appendChild(item);
          });
        }
      }

      function requestAiRefresh() {
        if (!selectionReady) {
          statusMessage.textContent = "Select a frame before running AI analysis.";
          return;
        }
        if (!aiConfigured || aiStatusState === "missing-key") {
          statusMessage.textContent = "AI key is not available in this build. Contact an admin.";
          return;
        }
        parent.postMessage({ pluginMessage: { type: "refresh-ai" } }, "*");
        statusMessage.textContent = "Requesting AI insights\u2026";
      }

      refreshAiButton.addEventListener("click", requestAiRefresh);

      window.onmessage = (event) => {
        const message = event.data.pluginMessage;
        if (!message) {
          return;
        }
        switch (message.type) {
          case "init": {
            renderTargets(message.payload.targets);
            applySelectionState({
              selectionOk: message.payload.selectionOk,
              selectionName: message.payload.selectionName,
              error: message.payload.error,
              aiSignals: message.payload.aiSignals,
              layoutAdvice: message.payload.layoutAdvice,
              aiConfigured: message.payload.aiConfigured,
              aiStatus: message.payload.aiStatus,
              aiError: message.payload.aiError
            });
            if (message.payload.lastRun) {
              lastRunSection.hidden = false;
              lastRunContent.textContent = formatLastRun(message.payload.lastRun);
            } else {
              lastRunSection.hidden = true;
              lastRunContent.textContent = "";
            }
            resultsSection.hidden = true;
            break;
          }
          case "status":
            if (message.payload.status === "running") {
              setBusy(true, "Generating variants\u2026");
            } else {
              setBusy(false, selectionReady ? "Ready to generate variants." : "Select a single frame to begin.");
            }
            break;
          case "generation-complete":
            setBusy(false, "Variants created.");
            resultsSection.hidden = false;
            renderResults(message.payload.results);
            break;
          case "selection-update":
            applySelectionState(message.payload);
            break;
          case "error":
            setBusy(false, message.payload.message || "Something went wrong.");
            break;
          default:
            console.warn("Unhandled UI message", message);
        }
      };

      updateSafeAreaValue();
      updateAiStatusDisplay();
      parent.postMessage({ pluginMessage: { type: "request-initial-state" } }, "*");
    })();
  <\/script>
</body>
</html>`;

  // core/layout-positions.ts
  function computeVariantLayout(sizes, options) {
    if (sizes.length === 0) {
      return {
        positions: [],
        bounds: { width: 0, height: 0 }
      };
    }
    const positions = [];
    let cursorX = options.margin;
    let cursorY = options.margin;
    let rowHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    for (const size of sizes) {
      const requiresWrap = cursorX + size.width > options.maxRowWidth && cursorX > options.margin;
      if (requiresWrap) {
        cursorX = options.margin;
        cursorY += rowHeight + options.gap;
        rowHeight = 0;
      }
      positions.push({ x: cursorX, y: cursorY });
      const rightEdge = cursorX + size.width + options.margin;
      const bottomEdge = cursorY + size.height + options.margin;
      if (rightEdge > maxWidth) {
        maxWidth = rightEdge;
      }
      if (bottomEdge > maxHeight) {
        maxHeight = bottomEdge;
      }
      cursorX += size.width + options.gap;
      if (size.height > rowHeight) {
        rowHeight = size.height;
      }
    }
    return {
      positions,
      bounds: { width: maxWidth, height: maxHeight }
    };
  }

  // core/padding-distribution.ts
  function distributePadding(options) {
    const totalExtra = Math.max(0, options.totalExtra);
    const requestedInset = Math.max(0, options.safeInset);
    if (totalExtra === 0) {
      return { start: 0, end: 0 };
    }
    const insetPerSide = Math.min(requestedInset, totalExtra / 2);
    const remaining = Math.max(totalExtra - insetPerSide * 2, 0);
    let startShare = 0.5;
    if (options.gaps && Number.isFinite(options.gaps.start) && Number.isFinite(options.gaps.end)) {
      const startGap = Math.max(0, options.gaps.start);
      const endGap = Math.max(0, options.gaps.end);
      const totalGap = startGap + endGap;
      if (totalGap > 0) {
        startShare = startGap / totalGap;
      }
    }
    if (typeof options.focus === "number" && Number.isFinite(options.focus)) {
      const clampedFocus = clampRatio(options.focus);
      const blend = 0.6;
      startShare = clampRatio(startShare * (1 - blend) + clampedFocus * blend);
    }
    return {
      start: insetPerSide + remaining * startShare,
      end: insetPerSide + remaining * (1 - startShare)
    };
  }
  function clampRatio(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    const epsilon = 0.05;
    return Math.min(Math.max(clamped, epsilon), 1 - epsilon);
  }

  // core/layout-expansion.ts
  function planAutoLayoutExpansion(context) {
    var _a;
    const totalExtra = Math.max(0, context.totalExtra);
    if (totalExtra === 0) {
      return { start: 0, end: 0, interior: 0 };
    }
    const requestedInset = Math.max(0, context.safeInset);
    const insetPerSide = Math.min(requestedInset, totalExtra / 2);
    const gaps = normaliseGaps(context.gaps);
    const flowChildCount = Math.max(0, context.flowChildCount);
    const baseItemSpacing = Math.max(0, (_a = context.baseItemSpacing) != null ? _a : 0);
    const leftover = Math.max(totalExtra - insetPerSide * 2, 0);
    const canReflow = context.allowInteriorExpansion !== false && flowChildCount >= 2 && leftover > 0;
    let baseInteriorWeight = 0;
    if (canReflow) {
      const gapCount = Math.max(flowChildCount - 1, 1);
      baseInteriorWeight = Math.min(0.58 + gapCount * 0.12, 0.82);
      if (baseItemSpacing < 16) {
        baseInteriorWeight *= 0.92;
      }
    }
    const asymmetry = gaps ? computeAsymmetry(gaps) : 0;
    const symmetryMultiplier = 1 - asymmetry * 0.6;
    const interiorWeight = clamp(baseInteriorWeight * symmetryMultiplier, 0, 0.9);
    const interiorExtra = round(leftover * interiorWeight);
    const edgeBudget = Math.max(totalExtra - interiorExtra, insetPerSide * 2);
    const distributed = distributePadding({
      totalExtra: edgeBudget,
      safeInset: insetPerSide,
      gaps: gaps != null ? gaps : null,
      focus: context.focalRatio
    });
    return {
      start: round(distributed.start),
      end: round(distributed.end),
      interior: round(interiorExtra)
    };
  }
  function normaliseGaps(gaps) {
    if (!gaps) {
      return null;
    }
    const start = Number.isFinite(gaps.start) ? Math.max(0, gaps.start) : 0;
    const end = Number.isFinite(gaps.end) ? Math.max(0, gaps.end) : 0;
    if (start === 0 && end === 0) {
      return null;
    }
    return { start, end };
  }
  function computeAsymmetry(gaps) {
    const total = gaps.start + gaps.end;
    if (total === 0) {
      return 0;
    }
    return Math.min(1, Math.abs(gaps.start - gaps.end) / total);
  }
  function round(value) {
    return Math.round(value * 100) / 100;
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // core/absolute-geometry.ts
  function scaleCenterToRange(value, from, to) {
    const boundedFrom = normaliseRange(from);
    const boundedTo = normaliseRange(to);
    if (boundedTo.size === 0) {
      return boundedTo.start;
    }
    if (boundedFrom.size === 0) {
      return boundedTo.start + boundedTo.size / 2;
    }
    const fromCenter = boundedFrom.start + boundedFrom.size / 2;
    const toCenter = boundedTo.start + boundedTo.size / 2;
    const scale = boundedTo.size / boundedFrom.size;
    return toCenter + (value - fromCenter) * scale;
  }
  function normaliseRange(range) {
    const size = Math.max(0, Number.isFinite(range.size) ? range.size : 0);
    const start = Number.isFinite(range.start) ? range.start : 0;
    return { start, size };
  }

  // core/absolute-layout.ts
  function planAbsoluteChildPositions(input) {
    if (input.children.length === 0) {
      return [];
    }
    const safeBounds = normaliseBounds(input.safeBounds);
    const contentBounds = measureBounds(input.children);
    if (input.profile === "vertical" && input.children.length >= 2) {
      const targetRatio = safeBounds.height > 0 ? safeBounds.width / safeBounds.height : 1;
      if (targetRatio < 0.57) {
        const horizontalSpan = contentBounds.width;
        const verticalSpan = contentBounds.height;
        const layoutIsPredominantlyHorizontal = horizontalSpan > verticalSpan * 1.1;
        if (layoutIsPredominantlyHorizontal) {
          return planVerticalStack(input.children, safeBounds);
        }
      }
    }
    if (boundsContain(safeBounds, contentBounds)) {
      return input.children.map((child) => ({ id: child.id, x: round2(child.x), y: round2(child.y) }));
    }
    return projectChildrenToBounds(input.children, contentBounds, safeBounds);
  }
  function planVerticalStack(children, safe) {
    const ordered = [...children].sort((a, b) => {
      if (a.x !== b.x) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    const plans = /* @__PURE__ */ new Map();
    const totalChildHeight = ordered.reduce((sum, child) => sum + child.height, 0);
    const gapCount = Math.max(ordered.length - 1, 0);
    const availableForGaps = Math.max(safe.height - totalChildHeight, 0);
    const gapSize = gapCount > 0 ? availableForGaps / gapCount : 0;
    let cursorY = safe.y;
    ordered.forEach((child, index) => {
      const targetY = clamp2(cursorY, safe.y, safe.y + safe.height - child.height);
      const targetX = clamp2(safe.x + (safe.width - child.width) / 2, safe.x, safe.x + safe.width - child.width);
      plans.set(child.id, {
        id: child.id,
        x: round2(targetX),
        y: round2(targetY)
      });
      cursorY = targetY + child.height + gapSize;
    });
    return children.map((child) => {
      var _a;
      return (_a = plans.get(child.id)) != null ? _a : { id: child.id, x: child.x, y: child.y };
    });
  }
  function projectChildrenToBounds(children, source, target) {
    const sourceRangeX = { start: source.x, size: source.width };
    const sourceRangeY = { start: source.y, size: source.height };
    const targetRangeX = { start: target.x, size: target.width };
    const targetRangeY = { start: target.y, size: target.height };
    return children.map((child) => {
      const centerX = child.x + child.width / 2;
      const centerY = child.y + child.height / 2;
      const mappedCenterX = scaleCenterToRange(centerX, sourceRangeX, targetRangeX);
      const mappedCenterY = scaleCenterToRange(centerY, sourceRangeY, targetRangeY);
      const nextX = clamp2(mappedCenterX - child.width / 2, target.x, target.x + target.width - child.width);
      const nextY = clamp2(mappedCenterY - child.height / 2, target.y, target.y + target.height - child.height);
      return {
        id: child.id,
        x: round2(nextX),
        y: round2(nextY)
      };
    });
  }
  function measureBounds(children) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const child of children) {
      minX = Math.min(minX, child.x);
      minY = Math.min(minY, child.y);
      maxX = Math.max(maxX, child.x + child.width);
      maxY = Math.max(maxY, child.y + child.height);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY)
    };
  }
  function normaliseBounds(bounds) {
    return {
      x: Number.isFinite(bounds.x) ? bounds.x : 0,
      y: Number.isFinite(bounds.y) ? bounds.y : 0,
      width: Math.max(0, Number.isFinite(bounds.width) ? bounds.width : 0),
      height: Math.max(0, Number.isFinite(bounds.height) ? bounds.height : 0)
    };
  }
  function boundsContain(outer, inner) {
    return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width + 0.01 && inner.y + inner.height <= outer.y + outer.height + 0.01;
  }
  function clamp2(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  // core/plugin-constants.ts
  var PLUGIN_NAME = "BiblioScale";
  var STAGING_PAGE_NAME = "BiblioScale Variants";
  var PLUGIN_DATA_PREFIX = "biblioscale";
  var DEBUG_KEY = `${PLUGIN_DATA_PREFIX}:debug`;
  var LAST_RUN_KEY = `${PLUGIN_DATA_PREFIX}:last-run`;
  var AI_KEY_STORAGE_KEY = `${PLUGIN_DATA_PREFIX}:openai-key`;
  var TARGET_ID_KEY = `${PLUGIN_DATA_PREFIX}:targetId`;
  var RUN_ID_KEY = `${PLUGIN_DATA_PREFIX}:runId`;
  var LAYOUT_PATTERN_KEY = `${PLUGIN_DATA_PREFIX}:layoutPattern`;
  var ROLE_KEY = `${PLUGIN_DATA_PREFIX}:role`;
  var AI_SIGNALS_KEY = `${PLUGIN_DATA_PREFIX}:ai-signals`;
  var LAYOUT_ADVICE_KEY = `${PLUGIN_DATA_PREFIX}:layout-advice`;
  var SAFE_AREA_KEY = `${PLUGIN_DATA_PREFIX}:safeArea`;
  var FOCAL_POINT_KEY = `${PLUGIN_DATA_PREFIX}:focalPoint`;
  var LEGACY_PLUGIN_DATA_PREFIX = "biblio-assets";
  var LEGACY_DEBUG_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:debug`;
  var LEGACY_LAST_RUN_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:last-run`;
  var LEGACY_AI_KEY_STORAGE_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:openai-key`;
  var LEGACY_TARGET_ID_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:targetId`;
  var LEGACY_RUN_ID_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:runId`;
  var LEGACY_LAYOUT_PATTERN_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:layoutPattern`;
  var LEGACY_ROLE_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:role`;
  var LEGACY_AI_SIGNALS_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:ai-signals`;
  var LEGACY_LAYOUT_ADVICE_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:layout-advice`;
  var LEGACY_SAFE_AREA_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:safeArea`;
  var LEGACY_FOCAL_POINT_KEY = `${LEGACY_PLUGIN_DATA_PREFIX}:focalPoint`;

  // core/qa-overlay.ts
  function configureQaOverlay(overlay, options) {
    var _a, _b;
    const hadLocked = typeof overlay.locked === "boolean";
    const wasLocked = hadLocked ? overlay.locked : void 0;
    if (wasLocked) {
      overlay.locked = false;
    }
    overlay.x = 0;
    overlay.y = 0;
    let positioningUpdated = false;
    const parentLayoutMode = options == null ? void 0 : options.parentLayoutMode;
    const parentSupportsAbsolute = typeof parentLayoutMode === "undefined" || parentLayoutMode !== "NONE";
    if (parentSupportsAbsolute && typeof overlay.layoutPositioning !== "undefined") {
      if (overlay.layoutPositioning !== "ABSOLUTE") {
        overlay.layoutPositioning = "ABSOLUTE";
        positioningUpdated = true;
      }
    }
    if (!parentSupportsAbsolute && typeof overlay.layoutPositioning !== "undefined") {
      if (overlay.layoutPositioning === "ABSOLUTE") {
        overlay.layoutPositioning = "AUTO";
        positioningUpdated = true;
      }
    }
    if (parentSupportsAbsolute && typeof overlay.constraints !== "undefined") {
      const nextConstraints = {
        horizontal: "STRETCH",
        vertical: "STRETCH"
      };
      if (((_a = overlay.constraints) == null ? void 0 : _a.horizontal) !== nextConstraints.horizontal || ((_b = overlay.constraints) == null ? void 0 : _b.vertical) !== nextConstraints.vertical) {
        overlay.constraints = nextConstraints;
        positioningUpdated = true;
      }
    }
    if (hadLocked && typeof wasLocked === "boolean") {
      overlay.locked = wasLocked;
    }
    return { positioningUpdated };
  }
  function createQaOverlay(target, safeAreaRatio) {
    const overlay = figma.createFrame();
    overlay.name = "QA Overlay";
    overlay.layoutMode = "NONE";
    overlay.opacity = 1;
    overlay.fills = [];
    overlay.strokes = [];
    overlay.resizeWithoutConstraints(target.width, target.height);
    overlay.clipsContent = false;
    overlay.setPluginData(ROLE_KEY, "overlay");
    if (target.id === "youtube-cover") {
      const safeWidth = 1546;
      const safeHeight = 423;
      const insetX = (target.width - safeWidth) / 2;
      const insetY = (target.height - safeHeight) / 2;
      appendSafeRect(overlay, insetX, insetY, safeWidth, safeHeight, "Text & Logo Safe Area");
    } else if (target.id === "tiktok-vertical") {
      const top = 108;
      const bottom = 320;
      const left = 44;
      const right = 120;
      const safeWidth = target.width - left - right;
      const safeHeight = target.height - top - bottom;
      appendSafeRect(overlay, left, top, safeWidth, safeHeight, "Content Safe Zone");
    } else {
      const insetX = target.width * safeAreaRatio;
      const insetY = target.height * safeAreaRatio;
      const safeWidth = target.width - insetX * 2;
      const safeHeight = target.height - insetY * 2;
      appendSafeRect(overlay, insetX, insetY, safeWidth, safeHeight, "Safe Area");
    }
    return overlay;
  }
  function appendSafeRect(parent, x, y, width, height, name, color = { r: 0.92, g: 0.4, b: 0.36 }) {
    const safeRect = figma.createRectangle();
    safeRect.name = name;
    safeRect.x = x;
    safeRect.y = y;
    safeRect.resizeWithoutConstraints(width, height);
    safeRect.fills = [];
    safeRect.strokes = [
      {
        type: "SOLID",
        color
      }
    ];
    safeRect.dashPattern = [8, 12];
    safeRect.strokeWeight = 3;
    safeRect.locked = true;
    safeRect.setPluginData(ROLE_KEY, "overlay");
    parent.appendChild(safeRect);
  }

  // core/layout-profile.ts
  function resolveLayoutProfile(dimensions) {
    const safeWidth = Math.max(dimensions.width, 1);
    const safeHeight = Math.max(dimensions.height, 1);
    const aspectRatio = safeHeight / safeWidth;
    if (aspectRatio >= 1.6) {
      return "vertical";
    }
    if (aspectRatio >= 1.2) {
      return "vertical";
    }
    if (aspectRatio <= 0.5) {
      return "horizontal";
    }
    if (aspectRatio <= 0.8) {
      return "horizontal";
    }
    return "square";
  }
  function shouldAdoptVerticalFlow(profile, snapshot) {
    if (profile !== "vertical" || !snapshot) {
      return false;
    }
    if (snapshot.layoutMode === "VERTICAL") {
      return true;
    }
    if (snapshot.layoutMode !== "HORIZONTAL") {
      return false;
    }
    return snapshot.flowChildCount >= 1;
  }
  function shouldExpandAbsoluteChildren(rootLayoutMode, adoptVerticalVariant) {
    if (adoptVerticalVariant) {
      return true;
    }
    if (!rootLayoutMode || rootLayoutMode === "NONE") {
      return true;
    }
    return false;
  }

  // core/content-analyzer.ts
  function analyzeContent(frame) {
    const actualBounds = findActualContentBounds(frame);
    const effectiveWidth = actualBounds ? actualBounds.width : frame.width;
    const effectiveHeight = actualBounds ? actualBounds.height : frame.height;
    const hasText = hasTextContent(frame);
    const hasImages = hasImageContent(frame);
    const childCount = countVisibleChildren(frame);
    const normalizedLayoutMode = normalizeLayoutMode(frame.layoutMode);
    const hasAutoLayout = normalizedLayoutMode !== "NONE";
    let contentDensity = "normal";
    if (childCount === 0) {
      contentDensity = "sparse";
    } else if (childCount > 10) {
      contentDensity = "dense";
    } else if (childCount <= 2) {
      contentDensity = "sparse";
    }
    const strategy = determineScalingStrategy({
      hasAutoLayout,
      layoutDirection: normalizedLayoutMode,
      contentDensity,
      hasText,
      hasImages,
      aspectRatio: effectiveWidth / Math.max(effectiveHeight, 1)
    });
    return {
      actualContentBounds: actualBounds,
      hasAutoLayout,
      layoutDirection: normalizedLayoutMode,
      childCount,
      hasText,
      hasImages,
      contentDensity,
      recommendedStrategy: strategy,
      effectiveWidth,
      effectiveHeight
    };
  }
  function findActualContentBounds(frame) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasVisibleContent = false;
    function processNode(node, depth = 0) {
      if (!node.visible || depth > 10) return;
      if ("getPluginData" in node && (node.getPluginData(ROLE_KEY) === "overlay" || node.getPluginData(LEGACY_ROLE_KEY) === "overlay")) {
        return;
      }
      const hasContent = node.type === "TEXT" && node.characters.length > 0 || (node.type === "RECTANGLE" || node.type === "ELLIPSE") || "fills" in node && Array.isArray(node.fills) && node.fills.length > 0 || "strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0;
      if (hasContent && "absoluteBoundingBox" in node && node.absoluteBoundingBox) {
        const bounds = node.absoluteBoundingBox;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
        hasVisibleContent = true;
      }
      if ("children" in node) {
        for (const child of node.children) {
          processNode(child, depth + 1);
        }
      }
    }
    processNode(frame);
    if (!hasVisibleContent || !frame.absoluteBoundingBox) {
      return null;
    }
    const frameBounds = frame.absoluteBoundingBox;
    const relativeMinX = minX - frameBounds.x;
    const relativeMinY = minY - frameBounds.y;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    return {
      x: Math.max(0, relativeMinX),
      y: Math.max(0, relativeMinY),
      width: Math.min(contentWidth, frame.width),
      height: Math.min(contentHeight, frame.height)
    };
  }
  function hasTextContent(frame) {
    const checkNode = (node) => {
      if (node.type === "TEXT") {
        return node.characters.length > 0;
      }
      if ("children" in node) {
        return node.children.some((child) => checkNode(child));
      }
      return false;
    };
    return checkNode(frame);
  }
  function hasImageContent(frame) {
    const checkNode = (node) => {
      if ("fills" in node && Array.isArray(node.fills)) {
        const hasFills = node.fills;
        if (hasFills.some((fill) => fill.type === "IMAGE" || fill.type === "VIDEO")) {
          return true;
        }
      }
      if ("children" in node) {
        return node.children.some((child) => checkNode(child));
      }
      return false;
    };
    return checkNode(frame);
  }
  function countVisibleChildren(frame) {
    return frame.children.filter((child) => {
      if (!child.visible) return false;
      if ("getPluginData" in child && (child.getPluginData(ROLE_KEY) === "overlay" || child.getPluginData(LEGACY_ROLE_KEY) === "overlay")) {
        return false;
      }
      return true;
    }).length;
  }
  function normalizeLayoutMode(mode) {
    return mode === "GRID" ? "NONE" : mode;
  }
  function determineScalingStrategy(params) {
    const { hasAutoLayout, contentDensity, hasText, hasImages, aspectRatio } = params;
    if (contentDensity === "sparse") {
      return "fill";
    }
    if (contentDensity === "dense" && hasAutoLayout) {
      return "adaptive";
    }
    if (hasText && !hasImages) {
      if (aspectRatio > 2 || aspectRatio < 0.5) {
        return "reflow";
      }
      return "adaptive";
    }
    if (hasImages && !hasText) {
      return "stretch";
    }
    return "adaptive";
  }
  function calculateOptimalScale(analysis, target, safeAreaInsets, profile) {
    const availableWidth = target.width - safeAreaInsets.x * 2;
    const availableHeight = target.height - safeAreaInsets.y * 2;
    const sourceWidth = Math.max(analysis.effectiveWidth, 1);
    const sourceHeight = Math.max(analysis.effectiveHeight, 1);
    const widthScale = availableWidth / sourceWidth;
    const heightScale = availableHeight / sourceHeight;
    let scale;
    switch (analysis.recommendedStrategy) {
      case "fill":
        scale = Math.max(widthScale, heightScale) * 0.95;
        break;
      case "fit":
        scale = Math.min(widthScale, heightScale) * 0.98;
        break;
      case "stretch":
        if (profile === "vertical") {
          scale = heightScale * 0.9;
        } else if (profile === "horizontal") {
          scale = widthScale * 0.9;
        } else {
          scale = (widthScale + heightScale) / 2 * 0.9;
        }
        break;
      case "reflow":
        if (profile === "vertical") {
          scale = Math.min(heightScale * 0.85, widthScale);
        } else if (profile === "horizontal") {
          scale = Math.min(widthScale * 0.85, heightScale);
        } else {
          scale = (Math.min(widthScale, heightScale) + Math.max(widthScale, heightScale)) / 2 * 0.9;
        }
        break;
      case "adaptive":
      default:
        if (profile === "vertical") {
          if (heightScale <= widthScale) {
            scale = heightScale * 0.95;
          } else {
            scale = Math.min(widthScale, heightScale * 0.8 + widthScale * 0.2);
          }
        } else if (profile === "horizontal") {
          if (widthScale <= heightScale) {
            scale = widthScale * 0.95;
          } else {
            scale = Math.min(heightScale, widthScale * 0.8 + heightScale * 0.2);
          }
        } else {
          const avgScale = (widthScale + heightScale) / 2;
          const minScale = Math.min(widthScale, heightScale);
          scale = minScale * 0.6 + avgScale * 0.4;
        }
        break;
    }
    const MIN_SCALE = 0.3;
    const MAX_SCALE = analysis.hasImages ? 12 : 60;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  }

  // core/debug.ts
  function computeDebugFlag() {
    var _a;
    if (typeof process !== "undefined" && ((_a = process == null ? void 0 : process.env) == null ? void 0 : _a.DEBUG_FIX) === "1") {
      return true;
    }
    if (typeof figma !== "undefined") {
      try {
        if (figma.root.getPluginData(DEBUG_KEY) === "1" || figma.root.getPluginData(LEGACY_DEBUG_KEY) === "1") {
          return true;
        }
      } catch (e) {
      }
    }
    if (typeof globalThis !== "undefined") {
      const debugFlag = globalThis.DEBUG_FIX;
      if (debugFlag === "1") {
        return true;
      }
    }
    return false;
  }
  var cachedDebugFlag = null;
  function isDebugFixEnabled() {
    if (cachedDebugFlag === null) {
      cachedDebugFlag = computeDebugFlag();
    }
    return cachedDebugFlag;
  }
  function log(prefix, message, context) {
    if (!isDebugFixEnabled()) {
      return;
    }
    if (context) {
      console.log(prefix, message, context);
      return;
    }
    console.log(prefix, message);
  }
  function debugFixLog(message, context) {
    log("[BiblioScale][frame-detach]", message, context);
  }
  function debugAutoLayoutLog(message, context) {
    log("[BiblioScale][auto-layout]", message, context);
  }

  // core/auto-layout-adapter.ts
  function createLayoutAdaptationPlan(frame, target, profile, scale) {
    const sourceLayoutMode = frame.layoutMode === "GRID" ? "NONE" : frame.layoutMode;
    const context = {
      sourceLayout: {
        mode: sourceLayoutMode,
        width: frame.width,
        height: frame.height,
        childCount: frame.children.filter((c) => c.visible).length,
        hasText: hasTextChildren(frame),
        hasImages: hasImageChildren(frame)
      },
      targetProfile: {
        type: profile,
        width: target.width,
        height: target.height,
        aspectRatio: target.width / target.height
      },
      scale
    };
    const newLayoutMode = determineOptimalLayoutMode(context);
    const sizingModes = determineSizingModes(newLayoutMode, context);
    const alignments = determineAlignments(newLayoutMode, context);
    const wrapBehavior = determineWrapBehavior(newLayoutMode, context);
    const spacing = calculateSpacing(frame, newLayoutMode, context);
    const padding = calculatePaddingAdjustments(frame, newLayoutMode, context);
    const childAdaptations = createChildAdaptations(frame, newLayoutMode, context);
    return {
      layoutMode: newLayoutMode,
      primaryAxisSizingMode: sizingModes.primary,
      counterAxisSizingMode: sizingModes.counter,
      primaryAxisAlignItems: alignments.primary,
      counterAxisAlignItems: alignments.counter,
      layoutWrap: wrapBehavior,
      itemSpacing: spacing.item,
      counterAxisSpacing: spacing.counter,
      paddingAdjustments: padding,
      childAdaptations
    };
  }
  function determineOptimalLayoutMode(context) {
    const { sourceLayout, targetProfile } = context;
    if (sourceLayout.mode === "NONE") {
      if (targetProfile.type === "vertical" && targetProfile.aspectRatio < 0.6) {
        return "VERTICAL";
      }
      if (targetProfile.type === "horizontal" && targetProfile.aspectRatio > 1.5) {
        return "HORIZONTAL";
      }
      return "NONE";
    }
    if (targetProfile.type === "vertical" && targetProfile.aspectRatio < 0.57) {
      if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount >= 2) {
        return "VERTICAL";
      }
      return sourceLayout.mode === "VERTICAL" ? "VERTICAL" : "VERTICAL";
    }
    if (targetProfile.type === "horizontal" && targetProfile.aspectRatio > 2.5) {
      if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount >= 2) {
        return "HORIZONTAL";
      }
      return sourceLayout.mode === "HORIZONTAL" ? "HORIZONTAL" : "HORIZONTAL";
    }
    if (targetProfile.type === "vertical") {
      if (sourceLayout.childCount > 3) {
        return "VERTICAL";
      }
      if (sourceLayout.mode === "HORIZONTAL") {
        return "HORIZONTAL";
      }
      return "VERTICAL";
    }
    if (targetProfile.type === "horizontal") {
      if (sourceLayout.childCount > 3 && sourceLayout.mode === "VERTICAL") {
        return "HORIZONTAL";
      }
      return sourceLayout.mode === "VERTICAL" ? "VERTICAL" : sourceLayout.mode;
    }
    return sourceLayout.mode;
  }
  function determineSizingModes(layoutMode, context) {
    if (layoutMode === "NONE") {
      return { primary: "FIXED", counter: "FIXED" };
    }
    if (context.targetProfile.aspectRatio < 0.5 || context.targetProfile.aspectRatio > 2) {
      return { primary: "FIXED", counter: "FIXED" };
    }
    if (layoutMode === "VERTICAL") {
      return {
        primary: context.targetProfile.type === "vertical" ? "FIXED" : "AUTO",
        counter: "FIXED"
      };
    } else {
      return {
        primary: context.targetProfile.type === "horizontal" ? "FIXED" : "AUTO",
        counter: "FIXED"
      };
    }
  }
  function determineAlignments(layoutMode, context) {
    if (layoutMode === "NONE") {
      return { primary: "MIN", counter: "MIN" };
    }
    if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
      return {
        primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
        counter: "CENTER"
      };
    }
    if (layoutMode === "HORIZONTAL" && context.targetProfile.type === "horizontal") {
      return {
        primary: context.sourceLayout.childCount <= 3 ? "SPACE_BETWEEN" : "MIN",
        counter: "CENTER"
      };
    }
    return {
      primary: "CENTER",
      counter: "CENTER"
    };
  }
  function determineWrapBehavior(layoutMode, context) {
    if (layoutMode === "NONE") {
      return "NO_WRAP";
    }
    if (layoutMode === "VERTICAL" && context.targetProfile.type === "vertical") {
      return "NO_WRAP";
    }
    if (layoutMode === "HORIZONTAL" && context.sourceLayout.childCount > 4) {
      if (context.targetProfile.width > 1200) {
        return "WRAP";
      }
    }
    return "NO_WRAP";
  }
  function calculateSpacing(frame, newLayoutMode, context) {
    if (newLayoutMode === "NONE") {
      return { item: 0 };
    }
    const baseSpacing = frame.layoutMode !== "NONE" ? frame.itemSpacing : 16;
    const scaledSpacing = baseSpacing * context.scale;
    if (context.targetProfile.type === "vertical" && newLayoutMode === "VERTICAL") {
      const extraSpace = context.targetProfile.height - context.sourceLayout.height * context.scale;
      const gaps = Math.max(context.sourceLayout.childCount - 1, 1);
      const additionalSpacing = Math.max(0, extraSpace / gaps * 0.3);
      return {
        item: scaledSpacing + additionalSpacing,
        counter: frame.layoutWrap === "WRAP" ? scaledSpacing : void 0
      };
    }
    if (context.targetProfile.type === "horizontal" && newLayoutMode === "HORIZONTAL") {
      const extraSpace = context.targetProfile.width - context.sourceLayout.width * context.scale;
      const gaps = Math.max(context.sourceLayout.childCount - 1, 1);
      const additionalSpacing = Math.max(0, extraSpace / gaps * 0.3);
      return {
        item: scaledSpacing + additionalSpacing,
        counter: frame.layoutWrap === "WRAP" ? scaledSpacing : void 0
      };
    }
    return { item: scaledSpacing };
  }
  function calculatePaddingAdjustments(frame, newLayoutMode, context) {
    const basePadding = {
      top: frame.paddingTop || 0,
      right: frame.paddingRight || 0,
      bottom: frame.paddingBottom || 0,
      left: frame.paddingLeft || 0
    };
    const scaledPadding = {
      top: basePadding.top * context.scale,
      right: basePadding.right * context.scale,
      bottom: basePadding.bottom * context.scale,
      left: basePadding.left * context.scale
    };
    if (context.targetProfile.type === "vertical") {
      const verticalExtra = (context.targetProfile.height - context.sourceLayout.height * context.scale) * 0.1;
      scaledPadding.top += verticalExtra;
      scaledPadding.bottom += verticalExtra;
    }
    if (context.targetProfile.type === "horizontal") {
      const horizontalExtra = (context.targetProfile.width - context.sourceLayout.width * context.scale) * 0.1;
      scaledPadding.left += horizontalExtra;
      scaledPadding.right += horizontalExtra;
    }
    const clampPadding = (side, value) => {
      if (value >= 0) {
        return value;
      }
      debugAutoLayoutLog("padding clamped to zero", {
        side,
        requested: value,
        targetType: context.targetProfile.type,
        targetWidth: context.targetProfile.width,
        targetHeight: context.targetProfile.height,
        sourceWidth: context.sourceLayout.width,
        sourceHeight: context.sourceLayout.height,
        scale: context.scale
      });
      return 0;
    };
    return {
      top: clampPadding("top", scaledPadding.top),
      right: clampPadding("right", scaledPadding.right),
      bottom: clampPadding("bottom", scaledPadding.bottom),
      left: clampPadding("left", scaledPadding.left)
    };
  }
  function createChildAdaptations(frame, newLayoutMode, context) {
    const adaptations = /* @__PURE__ */ new Map();
    frame.children.forEach((child, index) => {
      var _a;
      if (!child.visible) return;
      const adaptation = {};
      const containsImage = hasImageContent2(child);
      if (frame.layoutMode !== newLayoutMode && newLayoutMode !== "NONE") {
        if (newLayoutMode === "VERTICAL") {
          adaptation.layoutAlign = containsImage ? "INHERIT" : "STRETCH";
          adaptation.layoutGrow = 0;
          if (!containsImage && child.type === "TEXT") {
            adaptation.maxWidth = context.targetProfile.width * 0.8;
          }
          if (containsImage) {
            debugAutoLayoutLog("preserving media aspect ratio in vertical flow", {
              childId: child.id,
              childType: child.type,
              targetWidth: context.targetProfile.width,
              targetHeight: context.targetProfile.height
            });
          }
        }
        if (newLayoutMode === "HORIZONTAL") {
          adaptation.layoutAlign = "INHERIT";
          adaptation.layoutGrow = containsImage ? 0 : 1;
          adaptation.maxHeight = context.targetProfile.height * 0.8;
          const previousAlign = (_a = child.layoutAlign) != null ? _a : "unknown";
          debugAutoLayoutLog("child layout align normalized", {
            childId: child.id,
            childType: child.type,
            previousAlign,
            assignedAlign: adaptation.layoutAlign,
            sourceLayoutMode: frame.layoutMode,
            targetLayoutMode: newLayoutMode
          });
          if (containsImage && adaptation.layoutGrow === 0) {
            debugAutoLayoutLog("preventing media stretch in horizontal flow", {
              childId: child.id,
              childType: child.type,
              targetWidth: context.targetProfile.width,
              targetHeight: context.targetProfile.height
            });
          }
        }
      }
      if (context.targetProfile.aspectRatio < 0.5 || context.targetProfile.aspectRatio > 2) {
        if (index === 0 || index === frame.children.length - 1) {
          adaptation.layoutGrow = 0;
        }
      }
      if (Object.keys(adaptation).length > 0) {
        adaptations.set(child.id, adaptation);
      }
    });
    return adaptations;
  }
  function applyLayoutAdaptation(frame, plan) {
    frame.layoutMode = plan.layoutMode;
    if (plan.layoutMode !== "NONE") {
      frame.primaryAxisSizingMode = plan.primaryAxisSizingMode;
      frame.counterAxisSizingMode = plan.counterAxisSizingMode;
      frame.primaryAxisAlignItems = plan.primaryAxisAlignItems;
      frame.counterAxisAlignItems = plan.counterAxisAlignItems;
      frame.layoutWrap = plan.layoutWrap;
      frame.itemSpacing = plan.itemSpacing;
      if (plan.layoutWrap === "WRAP" && plan.counterAxisSpacing !== void 0) {
        frame.counterAxisSpacing = plan.counterAxisSpacing;
      }
      frame.paddingTop = plan.paddingAdjustments.top;
      frame.paddingRight = plan.paddingAdjustments.right;
      frame.paddingBottom = plan.paddingAdjustments.bottom;
      frame.paddingLeft = plan.paddingAdjustments.left;
      frame.children.forEach((child) => {
        const adaptation = plan.childAdaptations.get(child.id);
        if (adaptation && "layoutAlign" in child) {
          if (adaptation.layoutAlign) {
            child.layoutAlign = adaptation.layoutAlign;
          }
          if (adaptation.layoutGrow !== void 0 && "layoutGrow" in child) {
            child.layoutGrow = adaptation.layoutGrow;
          }
        }
      });
    }
  }
  function hasTextChildren(frame) {
    return frame.children.some(
      (child) => child.type === "TEXT" || "children" in child && hasTextChildren(child)
    );
  }
  function hasImageContent2(node) {
    if ("fills" in node) {
      const fills = node.fills;
      if (fills.some((fill) => fill.type === "IMAGE" || fill.type === "VIDEO")) {
        return true;
      }
    }
    if ("children" in node) {
      return node.children.some((child) => hasImageContent2(child));
    }
    return false;
  }
  function hasImageChildren(frame) {
    return hasImageContent2(frame);
  }

  // core/ai-signals.ts
  var MIN_CONFIDENCE = 0.35;
  var MIN_FOCAL_CONFIDENCE = 0.55;
  function readAiSignals(node, key = AI_SIGNALS_KEY) {
    var _a, _b, _c;
    const candidateKeys = key === AI_SIGNALS_KEY ? [AI_SIGNALS_KEY, LEGACY_AI_SIGNALS_KEY] : [key];
    for (const candidate of candidateKeys) {
      let raw = null;
      try {
        raw = node.getPluginData(candidate);
      } catch (e) {
        continue;
      }
      if (!raw) {
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        debugFixLog("ai signals parsed", { hasRoles: ((_a = parsed == null ? void 0 : parsed.roles) == null ? void 0 : _a.length) > 0, qa: (_c = (_b = parsed == null ? void 0 : parsed.qa) == null ? void 0 : _b.length) != null ? _c : 0 });
        return parsed;
      } catch (error) {
        debugFixLog("ai signals parse failed", { error: error instanceof Error ? error.message : String(error) });
      }
    }
    return null;
  }
  function deriveWarningsFromAiSignals(signals) {
    var _a;
    if (!signals || !((_a = signals.qa) == null ? void 0 : _a.length)) {
      return [];
    }
    const warnings = [];
    for (const qa of signals.qa) {
      if (qa.confidence !== void 0 && qa.confidence < MIN_CONFIDENCE) {
        continue;
      }
      const warning = mapQaToWarning(qa);
      if (warning) {
        warnings.push(warning);
      }
    }
    debugFixLog("ai warnings derived", { count: warnings.length });
    return warnings;
  }
  function mapQaToWarning(qa) {
    var _a, _b, _c, _d, _e, _f, _g;
    const severity = qa.severity === "info" ? "info" : "warn";
    switch (qa.code) {
      case "LOW_CONTRAST":
        return {
          code: "AI_LOW_CONTRAST",
          severity,
          message: (_a = qa.message) != null ? _a : "AI flagged low contrast between foreground and background."
        };
      case "LOGO_TOO_SMALL":
        return {
          code: "AI_LOGO_VISIBILITY",
          severity,
          message: (_b = qa.message) != null ? _b : "Logo may be too small or obscured."
        };
      case "TEXT_OVERLAP":
        return {
          code: "AI_TEXT_OVERLAP",
          severity,
          message: (_c = qa.message) != null ? _c : "Text elements may be overlapping or crowded."
        };
      case "UNCERTAIN_ROLES":
        return {
          code: "AI_ROLE_UNCERTAIN",
          severity,
          message: (_d = qa.message) != null ? _d : "AI could not confidently identify some elements."
        };
      case "SALIENCE_MISALIGNED":
        return {
          code: "AI_SALIENCE_MISALIGNED",
          severity,
          message: (_e = qa.message) != null ? _e : "Key visual focus may be misaligned with the frame."
        };
      case "SAFE_AREA_RISK":
        return {
          code: "AI_SAFE_AREA_RISK",
          severity,
          message: (_f = qa.message) != null ? _f : "Important content may sit near or outside the safe area."
        };
      case "GENERIC":
        return {
          code: "AI_GENERIC",
          severity,
          message: (_g = qa.message) != null ? _g : "AI surfaced a potential composition issue."
        };
      default:
        return null;
    }
  }
  function resolvePrimaryFocalPoint(signals) {
    var _a, _b;
    if (!((_a = signals == null ? void 0 : signals.focalPoints) == null ? void 0 : _a.length)) {
      return null;
    }
    const sorted = [...signals.focalPoints].sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = b.confidence) != null ? _a2 : 0) - ((_b2 = a.confidence) != null ? _b2 : 0);
    });
    const [primary] = sorted;
    const confidence = (_b = primary == null ? void 0 : primary.confidence) != null ? _b : 0;
    if (!primary || confidence < MIN_FOCAL_CONFIDENCE) {
      debugFixLog("focal point discarded due to low confidence", { confidence });
      return null;
    }
    const clamp4 = (value) => Math.min(Math.max(value, 0), 1);
    const focalPoint = {
      x: clamp4(primary.x),
      y: clamp4(primary.y),
      confidence
    };
    debugFixLog("primary focal point resolved", focalPoint);
    return focalPoint;
  }

  // core/layout-advice.ts
  var DEFAULT_CONFIDENCE = 0.6;
  var toNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : void 0;
    }
    return void 0;
  };
  function clampScore(value) {
    if (value === void 0) {
      return void 0;
    }
    const normalized = value > 1 && value <= 100 ? value / 100 : value;
    return Math.min(Math.max(normalized, 0), 1);
  }
  function normalizeOption(option) {
    var _a, _b, _c, _d;
    if (!option || typeof option !== "object") {
      return null;
    }
    const rawId = (_a = option.id) != null ? _a : option.patternId;
    const rawLabel = (_b = option.label) != null ? _b : option.name;
    if (typeof rawId !== "string" || typeof rawLabel !== "string") {
      return null;
    }
    const id = rawId;
    const label = rawLabel;
    const optionDescription = option.description;
    const description = typeof optionDescription === "string" ? optionDescription : "";
    const score = (_d = (_c = clampScore(toNumber(option.score))) != null ? _c : clampScore(toNumber(option.confidence))) != null ? _d : clampScore(toNumber(option.probability));
    return {
      id,
      label,
      description,
      score: typeof score === "number" && Number.isFinite(score) ? score : void 0
    };
  }
  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const targetId = entry.targetId;
    if (typeof targetId !== "string") {
      return null;
    }
    const options = Array.isArray(entry.options) ? entry.options : [];
    const normalizedOptions = options.map((option) => normalizeOption(option)).filter((option) => Boolean(option));
    if (normalizedOptions.length === 0) {
      return null;
    }
    const selectedId = entry.selectedId;
    return {
      targetId,
      selectedId: typeof selectedId === "string" ? selectedId : void 0,
      options: normalizedOptions
    };
  }
  function normalizeLayoutAdvice(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    const normalizedEntries = entries.map((entry) => normalizeEntry(entry)).filter((entry) => Boolean(entry));
    if (normalizedEntries.length === 0) {
      return null;
    }
    return { entries: normalizedEntries };
  }
  function readLayoutAdvice(node, key = LAYOUT_ADVICE_KEY) {
    var _a, _b;
    const candidateKeys = key === LAYOUT_ADVICE_KEY ? [LAYOUT_ADVICE_KEY, LEGACY_LAYOUT_ADVICE_KEY] : [key];
    for (const candidate of candidateKeys) {
      let raw = null;
      try {
        raw = node.getPluginData(candidate);
      } catch (e) {
        continue;
      }
      if (!raw) {
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeLayoutAdvice(parsed);
        debugFixLog("layout advice parsed", {
          entries: (_b = (_a = normalized == null ? void 0 : normalized.entries) == null ? void 0 : _a.length) != null ? _b : 0
        });
        return normalized;
      } catch (error) {
        debugFixLog("layout advice parse failed", { error: error instanceof Error ? error.message : String(error) });
      }
    }
    return null;
  }
  function resolvePatternLabel(advice, targetId, patternId) {
    if (!advice || !patternId) {
      return void 0;
    }
    const entry = advice.entries.find((item) => item.targetId === targetId);
    const match = entry == null ? void 0 : entry.options.find((option) => option.id === patternId);
    return match == null ? void 0 : match.label;
  }
  function autoSelectLayoutPattern(advice, targetId, minConfidence = DEFAULT_CONFIDENCE) {
    var _a, _b;
    if (!advice) {
      return null;
    }
    const entry = advice.entries.find((item) => item.targetId === targetId);
    if (!entry || !Array.isArray(entry.options) || entry.options.length === 0) {
      debugFixLog("auto layout selection missing options", { targetId });
      return { fallback: true };
    }
    const sorted = [...entry.options].sort((a, b) => {
      var _a2, _b2;
      return ((_a2 = b.score) != null ? _a2 : 0) - ((_b2 = a.score) != null ? _b2 : 0);
    });
    const highest = sorted[0];
    const fromSelected = entry.selectedId ? entry.options.find((option) => option.id === entry.selectedId) : null;
    const candidate = (_a = highest != null ? highest : fromSelected) != null ? _a : null;
    const confidence = (_b = candidate == null ? void 0 : candidate.score) != null ? _b : 0;
    const confidentEnough = confidence >= minConfidence;
    if (!candidate || !confidentEnough) {
      debugFixLog("auto layout selection falling back to deterministic layout", {
        targetId,
        confidence,
        minConfidence
      });
      return {
        patternId: void 0,
        patternLabel: void 0,
        confidence,
        fallback: true
      };
    }
    debugFixLog("auto layout selection succeeded", {
      targetId,
      patternId: candidate.id,
      confidence
    });
    return {
      patternId: candidate.id,
      patternLabel: candidate.label,
      confidence,
      fallback: false
    };
  }

  // core/ai-service.ts
  var OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
  var OPENAI_MODEL = "gpt-4o-mini";
  var MAX_SUMMARY_NODES = 24;
  var VALID_ROLES = [
    "logo",
    "hero_image",
    "secondary_image",
    "title",
    "subtitle",
    "body",
    "cta",
    "badge",
    "list",
    "decorative",
    "unknown"
  ];
  var VALID_QA_CODES = [
    "LOW_CONTRAST",
    "LOGO_TOO_SMALL",
    "TEXT_OVERLAP",
    "UNCERTAIN_ROLES",
    "SALIENCE_MISALIGNED",
    "SAFE_AREA_RISK",
    "GENERIC"
  ];
  async function requestAiInsights(frame, apiKey) {
    var _a, _b, _c, _d, _e, _f;
    const summary = summarizeFrame(frame);
    const body = {
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are ${PLUGIN_NAME} Layout AI. Analyze a marketing frame summary and respond ONLY with JSON object {"signals":{roles,focalPoints,qa},"layoutAdvice":{entries}}. roles array must include nodeId, role, confidence 0-1. Focal points require x,y,confidence 0-1. QA codes should match LOW_CONTRAST, LOGO_TOO_SMALL, TEXT_OVERLAP, UNCERTAIN_ROLES, SALIENCE_MISALIGNED, SAFE_AREA_RISK, GENERIC. Layout advice entries list targetId from provided list with options (id,label,description,score 0-1) ranked by score. Return stack-friendly options for vertical targets. Keep JSON compact without commentary.`
        },
        {
          role: "user",
          content: JSON.stringify({
            frame: summary,
            targets: VARIANT_TARGETS
          })
        }
      ]
    };
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`OpenAI request failed (${response.status} ${response.statusText}): ${message.slice(0, 200)}`);
    }
    const payload = await response.json();
    const content = (_c = (_b = (_a = payload.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content;
    if (!content) {
      throw new Error("OpenAI response missing content.");
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`OpenAI response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    const signals = sanitizeAiSignals(parsed.signals);
    const layoutAdvice = normalizeLayoutAdvice(parsed.layoutAdvice);
    debugFixLog("ai service parsed response", {
      roles: (_d = signals == null ? void 0 : signals.roles.length) != null ? _d : 0,
      qa: (_e = signals == null ? void 0 : signals.qa.length) != null ? _e : 0,
      layoutTargets: (_f = layoutAdvice == null ? void 0 : layoutAdvice.entries.length) != null ? _f : 0
    });
    if (!signals && !layoutAdvice) {
      return null;
    }
    return {
      signals,
      layoutAdvice: layoutAdvice != null ? layoutAdvice : void 0
    };
  }
  function summarizeFrame(frame) {
    var _a, _b;
    const frameBounds = frame.absoluteBoundingBox;
    const originX = (_a = frameBounds == null ? void 0 : frameBounds.x) != null ? _a : 0;
    const originY = (_b = frameBounds == null ? void 0 : frameBounds.y) != null ? _b : 0;
    const nodes = [];
    const queue = [...frame.children];
    while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
      const node = queue.shift();
      if (!node || !node.visible) {
        continue;
      }
      const description = describeNode(node, originX, originY);
      if (description) {
        nodes.push(description);
      }
      if ("children" in node) {
        queue.push(...node.children);
      }
    }
    return {
      id: frame.id,
      name: frame.name,
      size: {
        width: Math.round(frame.width),
        height: Math.round(frame.height)
      },
      childCount: frame.children.length,
      nodes
    };
  }
  function describeNode(node, originX, originY) {
    if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
      return null;
    }
    const bounds = node.absoluteBoundingBox;
    const text = node.type === "TEXT" ? node.characters.replace(/\s+/g, " ").trim().slice(0, 160) : void 0;
    const layoutDetails = "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE" ? {
      layoutMode: node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems
    } : {};
    return __spreadValues(__spreadValues({
      id: node.id,
      name: node.name || node.type,
      type: node.type,
      rel: {
        x: round3(bounds.x - originX),
        y: round3(bounds.y - originY),
        width: round3(bounds.width),
        height: round3(bounds.height)
      }
    }, text ? { text } : {}), layoutDetails);
  }
  function round3(value) {
    return Math.round(value * 100) / 100;
  }
  function sanitizeAiSignals(raw) {
    if (!raw || typeof raw !== "object") {
      return void 0;
    }
    const roles = Array.isArray(raw.roles) ? raw.roles.map((entry) => sanitizeRole(entry)).filter((entry) => Boolean(entry)) : [];
    const focalPoints = Array.isArray(raw.focalPoints) ? raw.focalPoints.map((entry) => sanitizeFocal(entry)).filter((entry) => Boolean(entry)) : [];
    const qa = Array.isArray(raw.qa) ? raw.qa.map((entry) => sanitizeQa(entry)).filter((entry) => Boolean(entry)) : [];
    if (roles.length === 0 && focalPoints.length === 0 && qa.length === 0) {
      return void 0;
    }
    return {
      roles,
      focalPoints,
      qa
    };
  }
  function sanitizeRole(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const nodeId = entry.nodeId;
    const role = entry.role;
    if (typeof nodeId !== "string" || typeof role !== "string") {
      return null;
    }
    const normalizedRole = role.trim().replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return null;
    }
    const confidence = clampToUnit(entry.confidence);
    return {
      nodeId,
      role: normalizedRole,
      confidence: confidence != null ? confidence : 0.5
    };
  }
  function sanitizeFocal(entry) {
    var _a;
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const nodeId = entry.nodeId;
    const rawX = entry.x;
    const rawY = entry.y;
    if (typeof rawX !== "number" || typeof rawY !== "number") {
      return null;
    }
    return {
      nodeId: typeof nodeId === "string" ? nodeId : "",
      x: clampValue(rawX),
      y: clampValue(rawY),
      confidence: (_a = clampToUnit(entry.confidence)) != null ? _a : 0.5
    };
  }
  function sanitizeQa(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const code = entry.code;
    if (typeof code !== "string") {
      return null;
    }
    const normalizedCode = code.trim().toUpperCase();
    if (!VALID_QA_CODES.includes(normalizedCode)) {
      return null;
    }
    const severityRaw = entry.severity;
    const severity = severityRaw === "info" ? "info" : severityRaw === "error" ? "error" : "warn";
    const message = entry.message;
    return {
      code: normalizedCode,
      severity,
      message: typeof message === "string" ? message : void 0,
      confidence: clampToUnit(entry.confidence)
    };
  }
  function clampToUnit(value) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
    if (!Number.isFinite(parsed)) {
      return void 0;
    }
    const normalized = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
    return Math.min(Math.max(normalized, 0), 1);
  }
  function clampValue(value) {
    return Math.min(Math.max(value, 0), 1);
  }

  // core/telemetry.ts
  function trackEvent(eventName, properties) {
    if (!isDebugFixEnabled()) {
      return;
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    console.log(`[BiblioScale][Telemetry] ${eventName}`, __spreadValues({
      timestamp
    }, properties));
  }

  // core/build-env.ts
  var DEFAULT_AI_API_KEY = true ? "" : "";
  var HAS_DEFAULT_AI_API_KEY = DEFAULT_AI_API_KEY.length > 0;

  // core/main.ts
  var MAX_SAFE_AREA_RATIO = 0.25;
  var RUN_GAP = 160;
  var RUN_MARGIN = 48;
  var MAX_ROW_WIDTH = 3200;
  var MIN_PATTERN_CONFIDENCE = 0.65;
  var HAS_DEFAULT_AI_KEY = HAS_DEFAULT_AI_API_KEY;
  var cachedAiApiKey = null;
  var aiKeyLoaded = false;
  var aiStatus = "missing-key";
  var aiStatusDetail = null;
  var aiRequestToken = 0;
  var aiUsingDefaultKey = false;
  function hasOverlayRole(node) {
    if (!("getPluginData" in node) || typeof node.getPluginData !== "function") {
      return false;
    }
    try {
      return node.getPluginData(ROLE_KEY) === "overlay" || node.getPluginData(LEGACY_ROLE_KEY) === "overlay";
    } catch (e) {
      return false;
    }
  }
  figma.showUI(UI_TEMPLATE, {
    width: 360,
    height: 540,
    themeColors: true
  });
  figma.ui.onmessage = async (rawMessage) => {
    var _a;
    switch (rawMessage.type) {
      case "request-initial-state":
        await postInitialState();
        break;
      case "generate-variants":
        await handleGenerateRequest(
          rawMessage.payload.targetIds,
          rawMessage.payload.safeAreaRatio,
          (_a = rawMessage.payload.layoutPatterns) != null ? _a : {}
        );
        break;
      case "set-ai-signals":
        await handleSetAiSignals(rawMessage.payload.signals);
        break;
      case "set-layout-advice":
        await handleSetLayoutAdvice(rawMessage.payload.advice);
        break;
      case "set-api-key":
        await handleSetApiKey(rawMessage.payload.key);
        break;
      case "refresh-ai":
        await handleRefreshAiRequest();
        break;
      default:
        console.warn("Unhandled message", rawMessage);
    }
  };
  figma.on("selectionchange", () => {
    void handleSelectionChange();
  });
  async function handleSelectionChange() {
    await ensureAiKeyLoaded();
    const frame = getSelectionFrame();
    const selectionState = createSelectionState(frame);
    postToUI({ type: "selection-update", payload: selectionState });
    if (frame) {
      void maybeRequestAiForFrame(frame);
    }
  }
  async function postInitialState() {
    await ensureAiKeyLoaded();
    const selectionFrame = getSelectionFrame();
    const selectionState = createSelectionState(selectionFrame);
    const lastRunSummary = readLastRun();
    const payload = {
      selectionOk: selectionState.selectionOk,
      selectionName: selectionState.selectionName,
      error: selectionState.error,
      aiSignals: selectionState.aiSignals,
      layoutAdvice: selectionState.layoutAdvice,
      targets: VARIANT_TARGETS,
      lastRun: lastRunSummary != null ? lastRunSummary : void 0
    };
    debugFixLog("initializing UI with targets", {
      targetIds: VARIANT_TARGETS.map((target) => target.id),
      targetCount: VARIANT_TARGETS.length
    });
    postToUI({ type: "init", payload });
    if (selectionFrame) {
      void maybeRequestAiForFrame(selectionFrame);
    }
  }
  async function handleGenerateRequest(targetIds, rawSafeAreaRatio, layoutPatterns) {
    var _a, _b, _c, _d, _e;
    const selectionFrame = getSelectionFrame();
    if (!selectionFrame) {
      postToUI({ type: "error", payload: { message: "Select exactly one frame before generating variants." } });
      return;
    }
    const targets = targetIds.map((id) => getTargetById(id)).filter((target) => Boolean(target));
    if (targets.length === 0) {
      postToUI({ type: "error", payload: { message: "Pick at least one target size." } });
      return;
    }
    const safeAreaRatio = clamp3(rawSafeAreaRatio, 0, MAX_SAFE_AREA_RATIO);
    postToUI({ type: "status", payload: { status: "running" } });
    try {
      const stagingPage = ensureStagingPage();
      const runId = `run-${Date.now()}`;
      const runContainer = createRunContainer(stagingPage, runId, selectionFrame.name);
      const results = [];
      const variantNodes = [];
      const overlaysToLock = [];
      const fontCache = /* @__PURE__ */ new Set();
      await loadFontsForNode(selectionFrame, fontCache);
      const layoutAdvice = readLayoutAdvice(selectionFrame);
      const aiSignals = readAiSignals(selectionFrame);
      const primaryFocal = resolvePrimaryFocalPoint(aiSignals);
      for (const target of targets) {
        const layoutProfile = resolveLayoutProfile({ width: target.width, height: target.height });
        debugFixLog("prepping variant target", {
          targetId: target.id,
          targetLabel: target.label,
          dimensions: `${target.width}x${target.height}`,
          runId,
          safeAreaRatio,
          layoutProfile
        });
        const variantNode = selectionFrame.clone();
        variantNode.name = `${selectionFrame.name} \u2192 ${target.label}`;
        variantNode.setPluginData(TARGET_ID_KEY, target.id);
        variantNode.setPluginData(RUN_ID_KEY, runId);
        runContainer.appendChild(variantNode);
        const autoLayoutSnapshots = /* @__PURE__ */ new Map();
        await prepareCloneForLayout(variantNode, autoLayoutSnapshots);
        const rootSnapshot = (_a = autoLayoutSnapshots.get(variantNode.id)) != null ? _a : null;
        const safeAreaMetrics = await scaleNodeTree(
          variantNode,
          target,
          safeAreaRatio,
          fontCache,
          rootSnapshot,
          layoutProfile,
          primaryFocal
        );
        const layoutAdaptationPlan = createLayoutAdaptationPlan(
          variantNode,
          target,
          layoutProfile,
          safeAreaMetrics.scale
        );
        debugFixLog("Layout adaptation plan created", {
          targetId: target.id,
          originalMode: (_b = rootSnapshot == null ? void 0 : rootSnapshot.layoutMode) != null ? _b : "NONE",
          newMode: layoutAdaptationPlan.layoutMode,
          profile: layoutProfile
        });
        applyLayoutAdaptation(variantNode, layoutAdaptationPlan);
        restoreAutoLayoutSettings(variantNode, autoLayoutSnapshots, safeAreaMetrics);
        const overlay = createQaOverlay(target, safeAreaRatio);
        variantNode.appendChild(overlay);
        const overlayConfig = configureQaOverlay(overlay, { parentLayoutMode: variantNode.layoutMode });
        overlaysToLock.push(overlay);
        debugFixLog("qa overlay configured", {
          overlayId: overlay.id,
          variantId: variantNode.id,
          positioningUpdated: overlayConfig.positioningUpdated,
          layoutPositioning: "layoutPositioning" in overlay ? overlay.layoutPositioning : void 0,
          constraints: "constraints" in overlay ? overlay.constraints : void 0,
          locked: overlay.locked,
          willLockAfterFlush: true
        });
        const patternSelection = autoSelectLayoutPattern(layoutAdvice, target.id, MIN_PATTERN_CONFIDENCE);
        const userSelection = layoutPatterns[target.id];
        const adviceEntry = layoutAdvice == null ? void 0 : layoutAdvice.entries.find((entry) => entry.targetId === target.id);
        const chosenPatternId = userSelection != null ? userSelection : patternSelection && !patternSelection.fallback ? (_c = patternSelection.patternId) != null ? _c : adviceEntry == null ? void 0 : adviceEntry.selectedId : void 0;
        const layoutFallback = !userSelection && ((_d = patternSelection == null ? void 0 : patternSelection.fallback) != null ? _d : false);
        const patternConfidence = chosenPatternId && (patternSelection == null ? void 0 : patternSelection.patternId) === chosenPatternId && !layoutFallback ? patternSelection.confidence : void 0;
        if (chosenPatternId) {
          variantNode.setPluginData(LAYOUT_PATTERN_KEY, chosenPatternId);
          debugFixLog("layout pattern tagged on variant", {
            targetId: target.id,
            patternId: chosenPatternId,
            confidence: patternConfidence
          });
          trackEvent("LAYOUT_ADVICE_APPLIED", {
            targetId: target.id,
            patternId: chosenPatternId,
            confidence: patternConfidence,
            fallback: layoutFallback,
            runId
          });
        }
        const warnings = collectWarnings(variantNode, target, safeAreaRatio);
        if (layoutFallback) {
          warnings.push({
            code: "AI_LAYOUT_FALLBACK",
            severity: "info",
            message: "AI confidence was low, so a deterministic layout was used."
          });
        }
        warnings.forEach((w) => {
          trackEvent("QA_ALERT_DISPLAYED", {
            targetId: target.id,
            code: w.code,
            severity: w.severity,
            runId
          });
        });
        variantNodes.push(variantNode);
        trackEvent("VARIANT_GENERATED", {
          targetId: target.id,
          warningsCount: warnings.length,
          hasLayoutPattern: Boolean(chosenPatternId),
          safeAreaRatio,
          runId
        });
        results.push({
          targetId: target.id,
          nodeId: variantNode.id,
          warnings,
          layoutPatternId: chosenPatternId,
          layoutPatternLabel: (_e = resolvePatternLabel(layoutAdvice, target.id, chosenPatternId)) != null ? _e : patternSelection == null ? void 0 : patternSelection.patternLabel,
          layoutPatternConfidence: patternConfidence,
          layoutPatternFallback: layoutFallback
        });
      }
      await lockOverlays(overlaysToLock);
      layoutVariants(runContainer, variantNodes);
      promoteVariantsToPage(stagingPage, runContainer, variantNodes);
      exposeRun(stagingPage, variantNodes);
      writeLastRun({
        runId,
        timestamp: Date.now(),
        sourceNodeName: selectionFrame.name,
        targetIds: targets.map((target) => target.id)
      });
      postToUI({
        type: "generation-complete",
        payload: {
          runId,
          results
        }
      });
      postToUI({ type: "status", payload: { status: "idle" } });
      figma.notify(`${PLUGIN_NAME}: Generated ${targets.length} variant${targets.length === 1 ? "" : "s"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while generating variants.";
      console.error(`${PLUGIN_NAME} generation failed`, error);
      postToUI({ type: "error", payload: { message } });
      postToUI({ type: "status", payload: { status: "idle" } });
    }
  }
  async function handleSetAiSignals(signals) {
    var _a, _b, _c, _d;
    const frame = getSelectionFrame();
    if (!frame) {
      postToUI({ type: "error", payload: { message: "Select a single frame before applying AI signals." } });
      return;
    }
    try {
      const serialized = JSON.stringify(signals);
      frame.setPluginData(AI_SIGNALS_KEY, serialized);
      debugFixLog("ai signals stored on selection", {
        roleCount: (_b = (_a = signals.roles) == null ? void 0 : _a.length) != null ? _b : 0,
        qaCount: (_d = (_c = signals.qa) == null ? void 0 : _c.length) != null ? _d : 0
      });
      figma.notify("AI signals applied to selection.");
      const selectionState = createSelectionState(frame);
      postToUI({ type: "selection-update", payload: selectionState });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply AI signals.";
      postToUI({ type: "error", payload: { message } });
    }
  }
  function getSelectionFrame() {
    if (figma.currentPage.selection.length !== 1) {
      return null;
    }
    const [node] = figma.currentPage.selection;
    if (node.type !== "FRAME") {
      return null;
    }
    return node;
  }
  function createSelectionState(frame) {
    if (frame) {
      const aiSignals = readAiSignals(frame);
      const layoutAdvice = readLayoutAdvice(frame);
      return {
        selectionOk: true,
        selectionName: frame.name,
        selectionWidth: frame.width,
        selectionHeight: frame.height,
        aiSignals: aiSignals != null ? aiSignals : void 0,
        layoutAdvice: layoutAdvice != null ? layoutAdvice : void 0,
        aiConfigured: Boolean(cachedAiApiKey),
        aiStatus,
        aiError: aiStatus === "error" ? aiStatusDetail != null ? aiStatusDetail : "AI request failed." : void 0,
        aiUsingDefaultKey: aiUsingDefaultKey || void 0
      };
    }
    return {
      selectionOk: false,
      error: "Select a single frame to begin.",
      aiConfigured: Boolean(cachedAiApiKey),
      aiStatus,
      aiError: aiStatus === "error" ? aiStatusDetail != null ? aiStatusDetail : "AI request failed." : void 0,
      aiUsingDefaultKey: aiUsingDefaultKey || void 0
    };
  }
  function postToUI(message) {
    figma.ui.postMessage(message);
  }
  function ensureStagingPage() {
    const existing = figma.root.children.find(
      (child) => child.type === "PAGE" && child.name === STAGING_PAGE_NAME
    );
    if (existing) {
      return existing;
    }
    const page = figma.createPage();
    page.name = STAGING_PAGE_NAME;
    figma.root.appendChild(page);
    return page;
  }
  function createRunContainer(page, runId, sourceName) {
    figma.currentPage = page;
    const container = figma.createFrame();
    container.name = `Run ${formatTimestamp(/* @__PURE__ */ new Date())} \xB7 ${sourceName}`;
    container.cornerRadius = 24;
    container.layoutMode = "NONE";
    container.fills = [
      {
        type: "SOLID",
        color: { r: 0.97, g: 0.98, b: 1 }
      }
    ];
    container.strokes = [
      {
        type: "SOLID",
        color: { r: 0.62, g: 0.68, b: 0.87 }
      }
    ];
    container.strokeWeight = 2;
    container.paddingLeft = RUN_MARGIN;
    container.paddingRight = RUN_MARGIN;
    container.paddingTop = RUN_MARGIN;
    container.paddingBottom = RUN_MARGIN;
    container.itemSpacing = RUN_GAP;
    container.clipsContent = false;
    container.setPluginData(RUN_ID_KEY, runId);
    page.appendChild(container);
    const bottom = page.children.reduce((accumulator, child) => {
      if (child === container) {
        return accumulator;
      }
      return Math.max(accumulator, child.y + child.height);
    }, 0);
    container.x = 0;
    container.y = bottom + RUN_GAP;
    container.resizeWithoutConstraints(800, 800);
    return container;
  }
  async function prepareCloneForLayout(frame, autoLayoutSnapshots) {
    const snapshot = captureAutoLayoutSnapshot(frame);
    if (snapshot) {
      autoLayoutSnapshots.set(frame.id, snapshot);
      frame.layoutMode = "NONE";
    }
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.paddingLeft = 0;
    frame.paddingRight = 0;
    frame.paddingTop = 0;
    frame.paddingBottom = 0;
    frame.itemSpacing = 0;
    if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
      frame.counterAxisSpacing = 0;
    }
    frame.clipsContent = true;
  }
  function captureAutoLayoutSnapshot(frame) {
    if (frame.layoutMode === "NONE") {
      return null;
    }
    let counterAxisSpacing = null;
    if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
      counterAxisSpacing = frame.counterAxisSpacing;
    }
    let flowChildCount = 0;
    let absoluteChildCount = 0;
    for (const child of frame.children) {
      if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") {
        absoluteChildCount += 1;
      } else {
        flowChildCount += 1;
      }
    }
    return {
      layoutMode: frame.layoutMode,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode,
      layoutWrap: frame.layoutWrap,
      primaryAxisAlignItems: frame.primaryAxisAlignItems,
      counterAxisAlignItems: frame.counterAxisAlignItems,
      itemSpacing: frame.itemSpacing,
      counterAxisSpacing,
      paddingLeft: frame.paddingLeft,
      paddingRight: frame.paddingRight,
      paddingTop: frame.paddingTop,
      paddingBottom: frame.paddingBottom,
      clipsContent: frame.clipsContent,
      flowChildCount,
      absoluteChildCount
    };
  }
  function restoreAutoLayoutSettings(frame, autoLayoutSnapshots, metrics) {
    const snapshot = autoLayoutSnapshots.get(frame.id);
    if (!snapshot) {
      return;
    }
    frame.clipsContent = snapshot.clipsContent;
    if (frame.layoutMode === "NONE") {
      return;
    }
    const basePaddingLeft = scaleAutoLayoutMetric(snapshot.paddingLeft, metrics.scale);
    const basePaddingRight = scaleAutoLayoutMetric(snapshot.paddingRight, metrics.scale);
    const basePaddingTop = scaleAutoLayoutMetric(snapshot.paddingTop, metrics.scale);
    const basePaddingBottom = scaleAutoLayoutMetric(snapshot.paddingBottom, metrics.scale);
    const baseItemSpacing = scaleAutoLayoutMetric(snapshot.itemSpacing, metrics.scale);
    const horizontalPlan = metrics.horizontal;
    const verticalPlan = metrics.vertical;
    const round4 = (value) => Math.round(value * 100) / 100;
    frame.paddingLeft = round4(basePaddingLeft + horizontalPlan.start);
    frame.paddingRight = round4(basePaddingRight + horizontalPlan.end);
    frame.paddingTop = round4(basePaddingTop + verticalPlan.start);
    frame.paddingBottom = round4(basePaddingBottom + verticalPlan.end);
    let nextItemSpacing = baseItemSpacing;
    if (snapshot.layoutMode === "HORIZONTAL" && snapshot.flowChildCount >= 2) {
      const gaps = Math.max(snapshot.flowChildCount - 1, 1);
      const perGap = horizontalPlan.interior / gaps;
      nextItemSpacing = round4(baseItemSpacing + perGap);
    } else if (snapshot.layoutMode === "VERTICAL" && snapshot.flowChildCount >= 2) {
      const gaps = Math.max(snapshot.flowChildCount - 1, 1);
      const perGap = verticalPlan.interior / gaps;
      nextItemSpacing = round4(baseItemSpacing + perGap);
    }
    frame.itemSpacing = nextItemSpacing;
    if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
      const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
      frame.counterAxisSpacing = round4(baseCounterSpacing);
    }
    debugFixLog("auto layout fine-tuned", {
      nodeId: frame.id,
      layoutMode: frame.layoutMode
    });
  }
  function scaleAutoLayoutMetric(value, scale) {
    const scaled = value * scale;
    return Math.round(scaled * 100) / 100;
  }
  function expandAbsoluteChildren(frame, horizontal, vertical, profile) {
    const safeWidth = frame.width - horizontal.start - horizontal.end;
    const safeHeight = frame.height - vertical.start - vertical.end;
    if (safeWidth <= 0 || safeHeight <= 0) {
      return;
    }
    const safeBounds = {
      x: horizontal.start,
      y: vertical.start,
      width: safeWidth,
      height: safeHeight
    };
    const absoluteChildren = frame.children.filter((child) => {
      if (hasOverlayRole(child)) {
        return false;
      }
      if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
        return false;
      }
      return true;
    });
    if (absoluteChildren.length === 0) {
      return;
    }
    const childSnapshots = absoluteChildren.filter((child) => {
      return typeof child.x === "number" && typeof child.y === "number" && typeof child.width === "number" && typeof child.height === "number";
    }).map((child) => ({
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height
    }));
    if (childSnapshots.length === 0) {
      return;
    }
    const planned = planAbsoluteChildPositions({
      profile,
      safeBounds,
      children: childSnapshots
    });
    const lookup = new Map(planned.map((plan) => [plan.id, plan]));
    for (const child of absoluteChildren) {
      const plan = lookup.get(child.id);
      if (!plan) {
        continue;
      }
      if (Number.isFinite(plan.x)) {
        child.x = plan.x;
      }
      if (Number.isFinite(plan.y)) {
        child.y = plan.y;
      }
    }
    debugFixLog("absolute children expanded", {
      nodeId: frame.id,
      safeBounds,
      childCount: absoluteChildren.length,
      profile,
      appliedPlans: planned
    });
  }
  function adjustAutoLayoutProperties(node, scale) {
    if (node.type !== "FRAME" && node.type !== "COMPONENT") {
      return;
    }
    if (node.layoutMode === "NONE") {
      return;
    }
    node.paddingLeft = scaleAutoLayoutMetric(node.paddingLeft, scale);
    node.paddingRight = scaleAutoLayoutMetric(node.paddingRight, scale);
    node.paddingTop = scaleAutoLayoutMetric(node.paddingTop, scale);
    node.paddingBottom = scaleAutoLayoutMetric(node.paddingBottom, scale);
    node.itemSpacing = scaleAutoLayoutMetric(node.itemSpacing, scale);
    if (node.layoutWrap === "WRAP" && typeof node.counterAxisSpacing === "number") {
      node.counterAxisSpacing = scaleAutoLayoutMetric(node.counterAxisSpacing, scale);
    }
  }
  async function scaleNodeTree(frame, target, safeAreaRatio, fontCache, rootSnapshot, profile, primaryFocal = null) {
    var _a, _b, _c, _d;
    const contentAnalysis = analyzeContent(frame);
    debugFixLog("Content analysis complete", {
      frameId: frame.id,
      frameName: frame.name,
      effectiveDimensions: `${contentAnalysis.effectiveWidth}\xD7${contentAnalysis.effectiveHeight}`,
      strategy: contentAnalysis.recommendedStrategy,
      contentDensity: contentAnalysis.contentDensity,
      hasText: contentAnalysis.hasText,
      hasImages: contentAnalysis.hasImages,
      actualBounds: contentAnalysis.actualContentBounds
    });
    const contentMargins = measureContentMargins(frame);
    const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
    const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);
    const safeInsetX = target.width * safeAreaRatio;
    const safeInsetY = target.height * safeAreaRatio;
    const scale = calculateOptimalScale(
      contentAnalysis,
      target,
      { x: safeInsetX, y: safeInsetY },
      profile
    );
    debugFixLog("Optimal scale calculated", {
      scale,
      sourceEffective: `${sourceWidth}\xD7${sourceHeight}`,
      target: `${target.width}\xD7${target.height}`,
      profile,
      strategy: contentAnalysis.recommendedStrategy
    });
    await scaleNodeRecursive(frame, scale, fontCache);
    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;
    const extraWidth = Math.max(target.width - scaledWidth, 0);
    const extraHeight = Math.max(target.height - scaledHeight, 0);
    const horizontalGaps = contentMargins != null ? { start: contentMargins.left, end: contentMargins.right } : null;
    const verticalGaps = contentMargins != null ? { start: contentMargins.top, end: contentMargins.bottom } : null;
    const absoluteChildCount = countAbsoluteChildren(frame);
    const verticalSummary = rootSnapshot ? {
      layoutMode: rootSnapshot.layoutMode,
      flowChildCount: rootSnapshot.flowChildCount
    } : null;
    const adoptVerticalVariant = shouldAdoptVerticalFlow(profile, verticalSummary);
    const horizontalPlan = planAutoLayoutExpansion({
      totalExtra: extraWidth,
      safeInset: safeInsetX,
      gaps: horizontalGaps,
      flowChildCount: rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" ? rootSnapshot.flowChildCount : absoluteChildCount,
      baseItemSpacing: rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale) : 0,
      allowInteriorExpansion: rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" && rootSnapshot.flowChildCount >= 2 || (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false),
      focalRatio: (_a = primaryFocal == null ? void 0 : primaryFocal.x) != null ? _a : null
    });
    const verticalFlowChildCount = rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" ? rootSnapshot.flowChildCount : adoptVerticalVariant ? (_b = rootSnapshot == null ? void 0 : rootSnapshot.flowChildCount) != null ? _b : absoluteChildCount : absoluteChildCount;
    const verticalAllowInterior = adoptVerticalVariant || rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" && rootSnapshot.flowChildCount >= 2 || (rootSnapshot == null ? void 0 : rootSnapshot.layoutWrap) === "WRAP" && rootSnapshot.flowChildCount >= 2 || (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false);
    const verticalPlan = planAutoLayoutExpansion({
      totalExtra: extraHeight,
      safeInset: safeInsetY,
      gaps: verticalGaps,
      flowChildCount: verticalFlowChildCount,
      baseItemSpacing: rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale) : 0,
      allowInteriorExpansion: verticalAllowInterior,
      focalRatio: (_c = primaryFocal == null ? void 0 : primaryFocal.y) != null ? _c : null
    });
    const offsetX = horizontalPlan.start;
    const offsetY = verticalPlan.start;
    frame.resizeWithoutConstraints(target.width, target.height);
    repositionChildren(frame, offsetX, offsetY);
    if (shouldExpandAbsoluteChildren(rootSnapshot == null ? void 0 : rootSnapshot.layoutMode, adoptVerticalVariant)) {
      expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile);
    }
    frame.setPluginData(
      SAFE_AREA_KEY,
      JSON.stringify({ insetX: safeInsetX, insetY: safeInsetY, width: target.width, height: target.height })
    );
    if (primaryFocal) {
      frame.setPluginData(FOCAL_POINT_KEY, JSON.stringify(primaryFocal));
    }
    debugFixLog("axis expansion planned", {
      nodeId: frame.id,
      layoutMode: (_d = rootSnapshot == null ? void 0 : rootSnapshot.layoutMode) != null ? _d : "NONE",
      extraWidth,
      extraHeight,
      horizontalPlan,
      verticalPlan,
      profile,
      adoptVerticalVariant,
      focal: primaryFocal ? { x: primaryFocal.x, y: primaryFocal.y, confidence: primaryFocal.confidence } : null
    });
    return {
      scale,
      scaledWidth,
      scaledHeight,
      safeInsetX,
      safeInsetY,
      targetWidth: target.width,
      targetHeight: target.height,
      horizontal: horizontalPlan,
      vertical: verticalPlan,
      profile,
      adoptVerticalVariant
    };
  }
  async function scaleNodeRecursive(node, scale, fontCache) {
    if ("children" in node) {
      for (const child of node.children) {
        adjustNodePosition(child, scale);
        await scaleNodeRecursive(child, scale, fontCache);
      }
    }
    if (node.type === "TEXT") {
      await scaleTextNode(node, scale, fontCache);
      return;
    }
    if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
      const newWidth = node.width * scale;
      const newHeight = node.height * scale;
      if ("resizeWithoutConstraints" in node && typeof node.resizeWithoutConstraints === "function") {
        node.resizeWithoutConstraints(newWidth, newHeight);
      } else if ("resize" in node && typeof node.resize === "function") {
        node.resize(newWidth, newHeight);
      }
    }
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      node.strokeWeight *= scale;
    }
    if ("cornerRadius" in node) {
      const withCornerRadius = node;
      if (withCornerRadius.cornerRadius !== figma.mixed && typeof withCornerRadius.cornerRadius === "number") {
        withCornerRadius.cornerRadius *= scale;
      }
    }
    const rectangleCorners = node;
    if (typeof rectangleCorners.topLeftRadius === "number") {
      rectangleCorners.topLeftRadius *= scale;
    }
    if (typeof rectangleCorners.topRightRadius === "number") {
      rectangleCorners.topRightRadius *= scale;
    }
    if (typeof rectangleCorners.bottomLeftRadius === "number") {
      rectangleCorners.bottomLeftRadius *= scale;
    }
    if (typeof rectangleCorners.bottomRightRadius === "number") {
      rectangleCorners.bottomRightRadius *= scale;
    }
    if ("effects" in node && Array.isArray(node.effects)) {
      node.effects = node.effects.map((effect) => scaleEffect(effect, scale));
    }
    if ("fills" in node && Array.isArray(node.fills)) {
      node.fills = node.fills.map((paint) => scalePaint(paint, scale));
    }
    adjustAutoLayoutProperties(node, scale);
  }
  function adjustNodePosition(node, scale) {
    if ("layoutPositioning" in node) {
      if (node.layoutPositioning === "ABSOLUTE") {
        node.x *= scale;
        node.y *= scale;
      }
      return;
    }
    if ("x" in node && typeof node.x === "number" && "y" in node && typeof node.y === "number") {
      node.x *= scale;
      node.y *= scale;
    }
  }
  async function scaleTextNode(node, scale, fontCache) {
    const characters = node.characters;
    if (characters.length === 0) {
      if (node.fontSize !== figma.mixed && typeof node.fontSize === "number") {
        node.fontSize = node.fontSize * scale;
      }
      return;
    }
    const fontNames = await node.getRangeAllFontNames(0, characters.length);
    for (const font of fontNames) {
      const cacheKey = `${font.family}__${font.style}`;
      if (!fontCache.has(cacheKey)) {
        await figma.loadFontAsync(font);
        fontCache.add(cacheKey);
      }
    }
    for (let i = 0; i < characters.length; i += 1) {
      const nextIndex = i + 1;
      const fontSize = node.getRangeFontSize(i, nextIndex);
      if (fontSize !== figma.mixed && typeof fontSize === "number") {
        node.setRangeFontSize(i, nextIndex, fontSize * scale);
      }
      const lineHeight = node.getRangeLineHeight(i, nextIndex);
      if (lineHeight !== figma.mixed && lineHeight.unit === "PIXELS") {
        node.setRangeLineHeight(i, nextIndex, {
          unit: "PIXELS",
          value: lineHeight.value * scale
        });
      }
      const letterSpacing = node.getRangeLetterSpacing(i, nextIndex);
      if (letterSpacing !== figma.mixed && letterSpacing.unit === "PIXELS") {
        node.setRangeLetterSpacing(i, nextIndex, {
          unit: "PIXELS",
          value: letterSpacing.value * scale
        });
      }
    }
  }
  function scaleEffect(effect, scale) {
    const clone = cloneValue(effect);
    if ((clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") && typeof clone.radius === "number") {
      clone.radius *= scale;
      clone.offset = { x: clone.offset.x * scale, y: clone.offset.y * scale };
    }
    if ((clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") && typeof clone.radius === "number") {
      clone.radius *= scale;
    }
    return clone;
  }
  function scalePaint(paint, scale) {
    var _a;
    const clone = cloneValue(paint);
    if ((clone.type === "IMAGE" || clone.type === "VIDEO") && clone.scaleMode === "TILE") {
      clone.scalingFactor = ((_a = clone.scalingFactor) != null ? _a : 1) * scale;
    }
    if (clone.type === "GRADIENT_LINEAR" || clone.type === "GRADIENT_RADIAL" || clone.type === "GRADIENT_ANGULAR" || clone.type === "GRADIENT_DIAMOND") {
      const gradientClone = clone;
      if (Array.isArray(gradientClone.gradientHandlePositions)) {
        gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((position) => ({
          x: position.x * scale,
          y: position.y * scale
        }));
      }
      gradientClone.gradientTransform = gradientClone.gradientTransform.map(
        (row) => row.map((value, index) => index === 2 ? value : value * scale)
      );
    }
    return clone;
  }
  function repositionChildren(parent, offsetX, offsetY) {
    if (!("children" in parent)) {
      return;
    }
    for (const child of parent.children) {
      if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE") {
        continue;
      }
      if ("x" in child && typeof child.x === "number") {
        child.x += offsetX;
      }
      if ("y" in child && typeof child.y === "number") {
        child.y += offsetY;
      }
    }
  }
  function countAbsoluteChildren(frame) {
    if (!("children" in frame)) {
      return 0;
    }
    let count = 0;
    for (const child of frame.children) {
      if (hasOverlayRole(child)) {
        continue;
      }
      if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
        continue;
      }
      count += 1;
    }
    return count;
  }
  async function lockOverlays(overlays) {
    if (overlays.length === 0) {
      return;
    }
    const flushAsync = figma.flushAsync;
    if (typeof flushAsync === "function") {
      try {
        await flushAsync.call(figma);
        debugFixLog("flush completed before locking overlays", { overlayCount: overlays.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        debugFixLog("flush failed before locking overlays", {
          overlayCount: overlays.length,
          errorMessage: message
        });
      }
    }
    for (const overlay of overlays) {
      overlay.locked = true;
      debugFixLog("qa overlay locked", {
        overlayId: overlay.id
      });
    }
  }
  function layoutVariants(container, variants) {
    if (variants.length === 0) {
      return;
    }
    const sizes = variants.map((variant) => ({ width: variant.width, height: variant.height }));
    const layout = computeVariantLayout(sizes, { margin: RUN_MARGIN, gap: RUN_GAP, maxRowWidth: MAX_ROW_WIDTH });
    layout.positions.forEach((position, index) => {
      const variant = variants[index];
      variant.x = position.x;
      variant.y = position.y;
    });
    const containerWidth = Math.max(container.width, layout.bounds.width);
    const containerHeight = Math.max(container.height, layout.bounds.height);
    container.resizeWithoutConstraints(containerWidth, containerHeight);
    debugFixLog("variants positioned within container", {
      containerWidth,
      containerHeight,
      variantCount: variants.length
    });
  }
  function promoteVariantsToPage(page, container, variants) {
    var _a;
    const parent = container.parent;
    if (!parent || parent.type !== "PAGE") {
      debugFixLog("skipped promotion because container parent is not a page", {
        parentType: (_a = parent == null ? void 0 : parent.type) != null ? _a : "none"
      });
      return;
    }
    const baseX = container.x;
    const baseY = container.y;
    for (const variant of variants) {
      const absoluteX = baseX + variant.x;
      const absoluteY = baseY + variant.y;
      page.appendChild(variant);
      variant.x = absoluteX;
      variant.y = absoluteY;
    }
    container.remove();
    debugFixLog("variants promoted to top-level frames", {
      baseX,
      baseY,
      variantCount: variants.length
    });
  }
  function exposeRun(page, variants) {
    if (variants.length === 0) {
      return;
    }
    figma.currentPage = page;
    figma.viewport.scrollAndZoomIntoView([...variants]);
  }
  function collectWarnings(frame, target, safeAreaRatio) {
    const warnings = [];
    const safeInsetX = target.width * safeAreaRatio;
    const safeInsetY = target.height * safeAreaRatio;
    const safeWidth = target.width - safeInsetX * 2;
    const safeHeight = target.height - safeInsetY * 2;
    const bounds = frame.absoluteBoundingBox;
    if (!bounds) {
      return warnings;
    }
    const safeArea = {
      x: bounds.x + safeInsetX,
      y: bounds.y + safeInsetY,
      width: safeWidth,
      height: safeHeight
    };
    const contentBounds = combineChildBounds(frame);
    if (contentBounds && !isWithinSafeArea(contentBounds, safeArea)) {
      warnings.push({
        code: "OUTSIDE_SAFE_AREA",
        severity: "warn",
        message: "Some layers extend outside the safe area."
      });
    }
    if (contentBounds) {
      const contentCenterX = contentBounds.x + contentBounds.width / 2;
      const frameCenterX = bounds.x + bounds.width / 2;
      const delta = Math.abs(contentCenterX - frameCenterX);
      if (delta > 32) {
        warnings.push({
          code: "MISALIGNED",
          severity: "info",
          message: "Primary content is offset; consider centering horizontally."
        });
      }
    }
    const aiSignals = readAiSignals(frame);
    if (aiSignals) {
      const aiWarnings = deriveWarningsFromAiSignals(aiSignals);
      if (aiWarnings.length > 0) {
        warnings.push(...aiWarnings);
      }
    }
    return warnings;
  }
  function measureContentMargins(frame) {
    const frameBounds = frame.absoluteBoundingBox;
    if (!frameBounds) {
      return null;
    }
    const aiSignals = readAiSignals(frame);
    const contentBounds = combineChildBounds(frame, aiSignals || void 0);
    if (!contentBounds) {
      return null;
    }
    const left = Math.max(contentBounds.x - frameBounds.x, 0);
    const top = Math.max(contentBounds.y - frameBounds.y, 0);
    const right = Math.max(frameBounds.x + frameBounds.width - (contentBounds.x + contentBounds.width), 0);
    const bottom = Math.max(frameBounds.y + frameBounds.height - (contentBounds.y + contentBounds.height), 0);
    return { left, right, top, bottom };
  }
  var IGNORED_ROLES = /* @__PURE__ */ new Set(["hero_image", "secondary_image", "decorative"]);
  function isBackgroundOrIgnored(node, rootFrame, aiSignals) {
    if (hasOverlayRole(node)) {
      return true;
    }
    if (aiSignals == null ? void 0 : aiSignals.roles) {
      const roleEntry = aiSignals.roles.find((r) => r.nodeId === node.id);
      if (roleEntry && IGNORED_ROLES.has(roleEntry.role)) {
        return true;
      }
    }
    if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
      const nodeArea = node.width * node.height;
      const rootArea = rootFrame.width * rootFrame.height;
      if (rootArea > 0 && nodeArea >= rootArea * 0.95) {
        return true;
      }
    }
    return false;
  }
  function combineChildBounds(frame, aiSignals) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const queue = [...frame.children];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) {
        continue;
      }
      if (isBackgroundOrIgnored(node, frame, aiSignals)) {
        continue;
      }
      if ("children" in node) {
        queue.push(...node.children);
      }
      if (!("absoluteBoundingBox" in node)) {
        continue;
      }
      const bbox = node.absoluteBoundingBox;
      if (!bbox) {
        continue;
      }
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  function isWithinSafeArea(bounds, safe) {
    const tolerance = 2;
    return bounds.x >= safe.x - tolerance && bounds.y >= safe.y - tolerance && bounds.x + bounds.width <= safe.x + safe.width + tolerance && bounds.y + bounds.height <= safe.y + safe.height + tolerance;
  }
  function formatTimestamp(date) {
    return `${date.toLocaleDateString()} \xB7 ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  function writeLastRun(summary) {
    const encoded = JSON.stringify(summary);
    figma.root.setPluginData(LAST_RUN_KEY, encoded);
  }
  function readLastRun() {
    const raw = figma.root.getPluginData(LAST_RUN_KEY) || figma.root.getPluginData(LEGACY_LAST_RUN_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.runId !== "string") {
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn(`Failed to parse ${PLUGIN_NAME} last run plugin data`, error);
      return null;
    }
  }
  async function loadFontsForNode(node, cache) {
    if (node.type === "TEXT") {
      const characters = node.characters;
      const fonts = await node.getRangeAllFontNames(0, characters.length);
      for (const font of fonts) {
        const key = `${font.family}__${font.style}`;
        if (!cache.has(key)) {
          await figma.loadFontAsync(font);
          cache.add(key);
        }
      }
    }
    if ("children" in node) {
      for (const child of node.children) {
        await loadFontsForNode(child, cache);
      }
    }
  }
  function clamp3(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }
  async function ensureAiKeyLoaded() {
    if (aiKeyLoaded) {
      return;
    }
    const stored = await figma.clientStorage.getAsync(AI_KEY_STORAGE_KEY);
    const legacyStored = await figma.clientStorage.getAsync(LEGACY_AI_KEY_STORAGE_KEY);
    const activeValue = typeof stored === "string" && stored.trim().length > 0 ? stored : typeof legacyStored === "string" ? legacyStored : "";
    const trimmed = typeof activeValue === "string" ? activeValue.trim() : "";
    const migratedFromLegacy = trimmed.length > 0 && (!stored || typeof stored === "string" && stored.trim().length === 0) && typeof legacyStored === "string" && legacyStored.trim().length > 0;
    if (migratedFromLegacy) {
      await figma.clientStorage.setAsync(AI_KEY_STORAGE_KEY, trimmed);
    }
    if (trimmed.length > 0) {
      cachedAiApiKey = trimmed;
      aiUsingDefaultKey = HAS_DEFAULT_AI_KEY && trimmed === DEFAULT_AI_API_KEY;
    } else if (HAS_DEFAULT_AI_KEY) {
      cachedAiApiKey = DEFAULT_AI_API_KEY;
      aiUsingDefaultKey = true;
    } else {
      cachedAiApiKey = null;
      aiUsingDefaultKey = false;
    }
    aiKeyLoaded = true;
    aiStatus = cachedAiApiKey ? "idle" : "missing-key";
    aiStatusDetail = null;
    debugFixLog("ai key source resolved", {
      source: cachedAiApiKey ? aiUsingDefaultKey ? "default" : "user-provided" : "missing",
      usingDefault: aiUsingDefaultKey
    });
  }
  async function handleSetApiKey(key) {
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      await figma.clientStorage.deleteAsync(AI_KEY_STORAGE_KEY);
      await figma.clientStorage.deleteAsync(LEGACY_AI_KEY_STORAGE_KEY);
      if (HAS_DEFAULT_AI_KEY) {
        cachedAiApiKey = DEFAULT_AI_API_KEY;
        aiUsingDefaultKey = true;
        aiStatus = "idle";
        figma.notify("OpenAI key cleared. Using workspace default key.");
      } else {
        cachedAiApiKey = null;
        aiUsingDefaultKey = false;
        aiStatus = "missing-key";
        figma.notify("OpenAI key cleared.");
      }
      aiStatusDetail = null;
    } else {
      await figma.clientStorage.setAsync(AI_KEY_STORAGE_KEY, trimmed);
      await figma.clientStorage.deleteAsync(LEGACY_AI_KEY_STORAGE_KEY);
      cachedAiApiKey = trimmed;
      aiUsingDefaultKey = HAS_DEFAULT_AI_KEY && trimmed === DEFAULT_AI_API_KEY;
      aiStatus = "idle";
      aiStatusDetail = null;
      figma.notify(
        aiUsingDefaultKey ? "OpenAI key saved. Matching workspace default key." : "OpenAI key saved locally."
      );
    }
    aiKeyLoaded = true;
    const frame = getSelectionFrame();
    const selectionState = createSelectionState(frame);
    postToUI({ type: "selection-update", payload: selectionState });
    if (frame && cachedAiApiKey) {
      void maybeRequestAiForFrame(frame, { force: true });
    }
  }
  async function handleRefreshAiRequest() {
    await ensureAiKeyLoaded();
    const frame = getSelectionFrame();
    if (!frame) {
      figma.notify("Select a single frame to analyze with AI.");
      postToUI({ type: "selection-update", payload: createSelectionState(null) });
      return;
    }
    if (!cachedAiApiKey) {
      aiStatus = "missing-key";
      aiStatusDetail = null;
      figma.notify("Add an OpenAI API key to run AI insights.");
      postToUI({ type: "selection-update", payload: createSelectionState(frame) });
      return;
    }
    await maybeRequestAiForFrame(frame, { force: true });
  }
  async function maybeRequestAiForFrame(frame, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (!cachedAiApiKey) {
      aiStatus = "missing-key";
      aiStatusDetail = null;
      const current = getSelectionFrame();
      postToUI({ type: "selection-update", payload: createSelectionState(current) });
      return;
    }
    const existingSignals = readAiSignals(frame);
    const existingAdvice = readLayoutAdvice(frame);
    if (!(options == null ? void 0 : options.force) && existingSignals && existingAdvice) {
      return;
    }
    const requestId = ++aiRequestToken;
    aiStatus = "fetching";
    aiStatusDetail = null;
    const currentSelection = getSelectionFrame();
    if (currentSelection && currentSelection.id === frame.id) {
      postToUI({ type: "selection-update", payload: createSelectionState(frame) });
    }
    let encounteredError = false;
    try {
      debugFixLog("requesting ai insights", { frameId: frame.id, nodeName: frame.name });
      trackEvent("AI_ANALYSIS_REQUESTED", { frameId: frame.id, requestId });
      const result = await requestAiInsights(frame, cachedAiApiKey);
      if (!result) {
        encounteredError = true;
        aiStatus = "error";
        aiStatusDetail = "AI response missing structured layout data.";
        trackEvent("AI_ANALYSIS_FAILED", { frameId: frame.id, reason: aiStatusDetail });
        return;
      }
      if (result.signals) {
        frame.setPluginData(AI_SIGNALS_KEY, JSON.stringify(result.signals));
      } else {
        frame.setPluginData(AI_SIGNALS_KEY, "");
      }
      if (result.layoutAdvice) {
        frame.setPluginData(LAYOUT_ADVICE_KEY, JSON.stringify(result.layoutAdvice));
      } else {
        frame.setPluginData(LAYOUT_ADVICE_KEY, "");
      }
      debugFixLog("ai insights stored on frame", {
        frameId: frame.id,
        roles: (_b = (_a = result.signals) == null ? void 0 : _a.roles.length) != null ? _b : 0,
        layoutEntries: (_d = (_c = result.layoutAdvice) == null ? void 0 : _c.entries.length) != null ? _d : 0
      });
      trackEvent("AI_ANALYSIS_COMPLETED", {
        frameId: frame.id,
        roleCount: (_f = (_e = result.signals) == null ? void 0 : _e.roles.length) != null ? _f : 0,
        qaCount: (_h = (_g = result.signals) == null ? void 0 : _g.qa.length) != null ? _h : 0,
        layoutEntries: (_j = (_i = result.layoutAdvice) == null ? void 0 : _i.entries.length) != null ? _j : 0
      });
    } catch (error) {
      encounteredError = true;
      aiStatus = "error";
      aiStatusDetail = error instanceof Error ? error.message : String(error);
      console.error(`${PLUGIN_NAME} AI request failed`, error);
      trackEvent("AI_ANALYSIS_FAILED", { frameId: frame.id, reason: aiStatusDetail });
    } finally {
      if (!encounteredError) {
        aiStatus = cachedAiApiKey ? "idle" : "missing-key";
        aiStatusDetail = null;
      }
      if (requestId === aiRequestToken) {
        const current = getSelectionFrame();
        if (current && current.id === frame.id) {
          postToUI({ type: "selection-update", payload: createSelectionState(current) });
        }
      }
    }
  }
  async function handleSetLayoutAdvice(advice) {
    var _a, _b;
    const frame = getSelectionFrame();
    if (!frame) {
      postToUI({ type: "error", payload: { message: "Select a single frame before applying layout advice." } });
      return;
    }
    try {
      const normalized = normalizeLayoutAdvice(advice);
      if (!normalized) {
        postToUI({ type: "error", payload: { message: "Layout advice was empty or malformed." } });
        return;
      }
      const serialized = JSON.stringify(normalized);
      frame.setPluginData(LAYOUT_ADVICE_KEY, serialized);
      debugFixLog("layout advice stored on selection", {
        entries: (_b = (_a = normalized.entries) == null ? void 0 : _a.length) != null ? _b : 0
      });
      figma.notify("Layout advice applied to selection.");
      const selectionState = createSelectionState(frame);
      postToUI({ type: "selection-update", payload: selectionState });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply layout advice.";
      postToUI({ type: "error", payload: { message } });
    }
  }
})();
//# sourceMappingURL=main.js.map
