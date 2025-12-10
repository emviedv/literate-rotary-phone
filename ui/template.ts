export const UI_TEMPLATE = `<!DOCTYPE html>
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
            Tight · 4%
          </button>
          <button type="button" class="preset-pill active" data-safe-area-preset="balanced" data-label="Balanced" data-value="0.08">
            Balanced · 8%
          </button>
          <button type="button" class="preset-pill" data-safe-area-preset="roomy" data-label="Roomy" data-value="0.12">
            Roomy · 12%
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
          dim.textContent = \`\${target.width} × \${target.height}\`;
          
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
          text = "Analyzing selection with AI…";
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
        setBusy(true, "Generating variants…");
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
          generateButton.textContent = "Generating…";
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
        return \`\${formatted} — \${lastRun.sourceNodeName} (\${lastRun.targetIds.length} targets)\`;
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
          layoutStatus.textContent = "Fetching AI layout patterns…";
        } else if (aiStatusState === "error") {
          layoutStatus.textContent = aiErrorMessage || "AI request failed. Using auto layout.";
        } else if (!hasAdvice) {
          layoutStatus.textContent = "Run AI analysis to populate layout patterns.";
        } else {
          layoutStatus.textContent =
            "AI-suggested patterns per target. Confident picks (≥" +
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
              Math.round(confidentOption.score * 100) + "% ≥ " + layoutThresholdPercent + "% threshold";
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
          aiEmpty.textContent = "Analyzing selection with AI…";
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
        statusMessage.textContent = "Requesting AI insights…";
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
              setBusy(true, "Generating variants…");
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
  </script>
</body>
</html>`;
