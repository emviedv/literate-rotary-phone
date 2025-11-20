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

    <section class="section" id="aiSetupSection">
      <h2>AI setup</h2>
      <p id="aiKeyStatus" class="status">Add an OpenAI API key to enable AI insights.</p>
      <input id="aiKeyInput" type="password" placeholder="sk-..." autocomplete="off" spellcheck="false" />
      <div class="button-row">
        <button id="saveAiKey">Save key</button>
        <button id="clearAiKey" class="secondary">Clear key</button>
        <button id="refreshAiButton" class="secondary">Run AI analysis</button>
      </div>
    </section>

    <section class="section" id="aiSection" hidden>
      <h2>AI signals</h2>
      <div id="aiEmpty" class="status">No AI signals found on selection.</div>
      <div id="aiRoles" class="ai-row" role="list"></div>
      <div id="aiQa" class="ai-qa" role="list"></div>
      <button id="applySampleAi" style="align-self: flex-start;">Apply sample AI signals</button>
    </section>

    <section class="section" id="layoutSection" hidden>
      <h2>Layout patterns</h2>
      <p class="status" id="layoutStatus">AI-suggested patterns per target.</p>
      <div id="layoutContainer" class="layout-list"></div>
      <button id="applySampleLayout" style="align-self: flex-start;">Apply sample layout advice</button>
    </section>

    <section class="section">
      <h2 id="targetSection">Targets</h2>
      <div class="targets">
        <select id="targetSelect" multiple size="4" aria-labelledby="targetSection" aria-describedby="targetHelp"></select>
        <p id="targetHelp" class="targets-help">Hold Cmd (Mac) or Ctrl (Windows) to choose multiple target sizes.</p>
        <p id="targetSummary" class="targets-summary"></p>
      </div>
    </section>

    <section class="section">
      <h2>Safe area</h2>
      <div class="safe-area-control">
        <div>
          <span class="safe-area-value" id="safeAreaValue">8%</span>
          <span style="color: var(--figma-color-text-secondary, #475467); margin-left: 4px;">margin</span>
        </div>
        <input id="safeAreaSlider" type="range" min="0" max="0.2" step="0.01" value="0.08" />
        <p style="font-size: 12px; color: var(--figma-color-text-secondary, #475467);">
          Adjusts the inset used for QA overlays and safe-area checks.
        </p>
      </div>
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
      const targetSelect = document.getElementById("targetSelect");
      const targetSummary = document.getElementById("targetSummary");
      const safeAreaSlider = document.getElementById("safeAreaSlider");
      const safeAreaValue = document.getElementById("safeAreaValue");
      const generateButton = document.getElementById("generateButton");
      const statusMessage = document.getElementById("statusMessage");
      const aiKeyStatus = document.getElementById("aiKeyStatus");
      const aiKeyInput = document.getElementById("aiKeyInput");
      const saveAiKey = document.getElementById("saveAiKey");
      const clearAiKey = document.getElementById("clearAiKey");
      const refreshAiButton = document.getElementById("refreshAiButton");
      const lastRunSection = document.getElementById("lastRunSection");
      const lastRunContent = document.getElementById("lastRunContent");
      const resultsSection = document.getElementById("resultsSection");
      const resultsContainer = document.getElementById("resultsContainer");
      const aiSection = document.getElementById("aiSection");
      const aiEmpty = document.getElementById("aiEmpty");
      const aiRoles = document.getElementById("aiRoles");
      const aiQa = document.getElementById("aiQa");
      const applySampleAi = document.getElementById("applySampleAi");
      const layoutSection = document.getElementById("layoutSection");
      const layoutStatus = document.getElementById("layoutStatus");
      const layoutContainer = document.getElementById("layoutContainer");
      const applySampleLayout = document.getElementById("applySampleLayout");

      const LAYOUT_CONFIDENCE_THRESHOLD = 0.65;
      let availableTargets = [];
      let selectionReady = false;
      let isBusy = false;
      let layoutSelections = {};
      let aiConfigured = false;
      let aiStatusState = "missing-key";
      let aiErrorMessage = "";
      let aiUsingDefaultKey = false;

      if (!(targetSelect instanceof HTMLSelectElement)) {
        throw new Error("Target select element missing.");
      }
      if (!(targetSummary instanceof HTMLElement)) {
        throw new Error("Target summary element missing.");
      }
      if (!(aiKeyStatus instanceof HTMLElement)) {
        throw new Error("AI key status element missing.");
      }
      if (!(aiKeyInput instanceof HTMLInputElement)) {
        throw new Error("AI key input missing.");
      }
      if (!(saveAiKey instanceof HTMLButtonElement) || !(clearAiKey instanceof HTMLButtonElement)) {
        throw new Error("AI key buttons missing.");
      }
      if (!(refreshAiButton instanceof HTMLButtonElement)) {
        throw new Error("AI refresh button missing.");
      }

      function renderTargets(targets) {
        availableTargets = targets;
        targetSelect.innerHTML = "";
        const minimumVisible = 4;
        const maximumVisible = 8;
        const visibleRows = Math.min(Math.max(targets.length, minimumVisible), maximumVisible);
        targetSelect.size = targets.length === 0 ? minimumVisible : visibleRows;
        targetSelect.disabled = targets.length === 0;
        targets.forEach((target) => {
          const option = document.createElement("option");
          option.value = target.id;
          option.textContent = \`\${target.label} (\${target.width} × \${target.height})\`;
          option.title = \`\${target.description} - \${target.width} × \${target.height}\`;
          option.selected = true;
          targetSelect.appendChild(option);
        });
        updateGenerateState();
      }

      function updateSafeAreaValue() {
        const percent = Math.round(Number(safeAreaSlider.value) * 100);
        safeAreaValue.textContent = \`\${percent}%\`;
      }

      function getSelectedTargetIds() {
        return Array.from(targetSelect.selectedOptions).map((option) => option.value);
      }

      function updateTargetSummary(selectedTargetIds) {
        if (availableTargets.length === 0) {
          targetSummary.textContent = "No targets available.";
          return;
        }
        if (selectedTargetIds.length === 0) {
          targetSummary.textContent = "No targets selected.";
          return;
        }
        if (selectedTargetIds.length === availableTargets.length) {
          targetSummary.textContent = "All targets selected.";
          return;
        }
        if (selectedTargetIds.length <= 3) {
          const labels = availableTargets
            .filter((target) => selectedTargetIds.includes(target.id))
            .map((target) => target.label);
          targetSummary.textContent = labels.join(", ");
          return;
        }
        targetSummary.textContent = \`\${selectedTargetIds.length} targets selected.\`;
      }

      function updateGenerateState() {
        const selectedTargets = getSelectedTargetIds();
        generateButton.disabled = isBusy || !selectionReady || selectedTargets.length === 0;
        updateTargetSummary(selectedTargets);
      }

      function updateAiStatusDisplay() {
        let text = "";
        if (!aiConfigured) {
          text = "Add an OpenAI API key to enable AI insights.";
        } else if (aiStatusState === "fetching") {
          text = "Analyzing selection with AI…";
        } else if (aiStatusState === "error") {
          text = aiErrorMessage || "AI request failed. Try again.";
        } else if (!selectionReady) {
          text = aiUsingDefaultKey
            ? "Workspace default AI key ready. Select a frame to analyze."
            : "Select a frame to request AI analysis.";
        } else if (aiUsingDefaultKey) {
          text = "AI ready via workspace default key. Run analysis to refresh insights.";
        } else {
          text = "AI ready. Click Run AI analysis to refresh insights.";
        }
        if (aiStatusState === "error") {
          aiKeyStatus.classList.add("error");
        } else {
          aiKeyStatus.classList.remove("error");
        }
        aiKeyStatus.textContent = text;
        clearAiKey.disabled = isBusy || !aiConfigured;
        refreshAiButton.disabled =
          isBusy || !selectionReady || !aiConfigured || aiStatusState === "missing-key" || aiStatusState === "fetching";
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

      targetSelect.addEventListener("change", () => {
        updateGenerateState();
        if (!isBusy && selectionReady) {
          statusMessage.textContent = "Ready to generate variants.";
        }
      });

      safeAreaSlider.addEventListener("input", () => {
        updateSafeAreaValue();
        if (!isBusy) {
          statusMessage.textContent = "Ready to generate variants.";
        }
      });

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
          layoutStatus.textContent = "Add an OpenAI API key to receive AI layout advice.";
        } else if (aiStatusState === "fetching") {
          layoutStatus.textContent = "Fetching AI layout patterns…";
        } else if (aiStatusState === "error") {
          layoutStatus.textContent = aiErrorMessage || "AI request failed. Using auto layout.";
        } else if (!hasAdvice) {
          layoutStatus.textContent = "Run AI analysis to populate layout patterns.";
        } else {
          layoutStatus.textContent = "AI-suggested patterns per target.";
        }

        if (!hasAdvice) {
          layoutSelections = {};
          layoutContainer.innerHTML = "";
          return;
        }

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

        if (!aiConfigured) {
          aiEmpty.textContent = "Add an OpenAI API key and run analysis to see AI signals.";
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
        const hasQa = aiSignals && Array.isArray(aiSignals.qa) && aiSignals.qa.length > 0;

        if (!aiSignals || (!hasRoles && !hasQa)) {
          aiEmpty.textContent = "Run AI analysis to populate signals for this frame.";
          return;
        }

        aiEmpty.hidden = true;

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
          aiSignals.qa.forEach((qa) => {
            const item = document.createElement("div");
            item.className = "ai-qa-item";
            const confidence =
              qa.confidence !== undefined ? " (" + Math.round(qa.confidence * 100) + "%)" : "";
            item.textContent = qa.code.toLowerCase() + confidence;
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

      function applySampleSignals() {
        if (!selectionReady) {
          statusMessage.textContent = "Select a frame before applying AI signals.";
          return;
        }
        const sample = {
          roles: [
            { nodeId: "role-logo", role: "logo", confidence: 0.82 },
            { nodeId: "role-title", role: "title", confidence: 0.77 },
            { nodeId: "role-body", role: "body", confidence: 0.64 },
            { nodeId: "role-cta", role: "cta", confidence: 0.7 }
          ],
          focalPoints: [
            { nodeId: "role-hero", x: 0.52, y: 0.38, confidence: 0.78 }
          ],
          qa: [
            { code: "LOW_CONTRAST", severity: "warn", message: "Foreground contrast may be low.", confidence: 0.86 },
            { code: "LOGO_TOO_SMALL", severity: "info", message: "Logo visibility could be improved.", confidence: 0.62 }
          ]
        };

        parent.postMessage(
          {
            pluginMessage: {
              type: "set-ai-signals",
              payload: { signals: sample }
            }
          },
          "*"
        );
      }

      function applySampleLayoutAdvice() {
        if (!selectionReady) {
          statusMessage.textContent = "Select a frame before applying layout advice.";
          return;
        }
        const sample = {
          entries: [
            {
              targetId: "figma-cover",
              selectedId: "hero-left",
              options: [
                { id: "hero-left", label: "Hero left, text right", description: "Hero anchored left, copy on right", score: 0.82 },
                { id: "stacked", label: "Stacked", description: "Hero on top, text and CTA below", score: 0.71 }
              ]
            },
            {
              targetId: "tiktok-vertical",
              selectedId: "stacked",
              options: [
                { id: "stacked", label: "Stacked", description: "Hero top, text bottom", score: 0.77 },
                { id: "hero-top", label: "Hero top-heavy", description: "Large hero on top, small footer CTA", score: 0.62 }
              ]
            }
          ]
        };

        parent.postMessage(
          {
            pluginMessage: {
              type: "set-layout-advice",
              payload: { advice: sample }
            }
          },
          "*"
        );
      }

      function saveAiKeyValue() {
        const trimmed = aiKeyInput.value.trim();
        parent.postMessage(
          {
            pluginMessage: {
              type: "set-api-key",
              payload: { key: trimmed }
            }
          },
          "*"
        );
        aiKeyInput.value = "";
        statusMessage.textContent = trimmed ? "Saving OpenAI key…" : "Clearing OpenAI key…";
      }

      function clearAiKeyValue() {
        aiKeyInput.value = "";
        parent.postMessage(
          {
            pluginMessage: {
              type: "set-api-key",
              payload: { key: "" }
            }
          },
          "*"
        );
        statusMessage.textContent = "Clearing OpenAI key…";
      }

      function requestAiRefresh() {
        if (!selectionReady) {
          statusMessage.textContent = "Select a frame before running AI analysis.";
          return;
        }
        if (!aiConfigured) {
          statusMessage.textContent = "Add an OpenAI API key before running AI analysis.";
          return;
        }
        parent.postMessage({ pluginMessage: { type: "refresh-ai" } }, "*");
        statusMessage.textContent = "Requesting AI insights…";
      }

      if (applySampleAi instanceof HTMLButtonElement) {
        applySampleAi.addEventListener("click", applySampleSignals);
      }
      if (applySampleLayout instanceof HTMLButtonElement) {
        applySampleLayout.addEventListener("click", applySampleLayoutAdvice);
      }
      saveAiKey.addEventListener("click", saveAiKeyValue);
      clearAiKey.addEventListener("click", clearAiKeyValue);
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
