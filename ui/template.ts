export const UI_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Biblio Assets Resizer</title>
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
      gap: 6px;
    }
    label.target-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s ease-in-out;
    }
    label.target-row:hover {
      background: var(--figma-color-bg-tertiary, rgba(16, 24, 40, 0.06));
    }
    .target-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .target-meta span {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
    }
    input[type="checkbox"] {
      margin-top: 2px;
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
    .status {
      font-size: 12px;
      color: var(--figma-color-text-secondary, #475467);
      min-height: 18px;
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
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Biblio Assets Resizer</h1>
      <p id="selectionLabel" class="status">Select a single frame to begin.</p>
    </header>

    <section class="section">
      <h2>Targets</h2>
      <div id="targetList" class="targets" role="group" aria-labelledby="targetSection"></div>
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
      const targetList = document.getElementById("targetList");
      const safeAreaSlider = document.getElementById("safeAreaSlider");
      const safeAreaValue = document.getElementById("safeAreaValue");
      const generateButton = document.getElementById("generateButton");
      const statusMessage = document.getElementById("statusMessage");
      const lastRunSection = document.getElementById("lastRunSection");
      const lastRunContent = document.getElementById("lastRunContent");
      const resultsSection = document.getElementById("resultsSection");
      const resultsContainer = document.getElementById("resultsContainer");

      let availableTargets = [];
      let selectionReady = false;
      let isBusy = false;

      function renderTargets(targets) {
        availableTargets = targets;
        targetList.innerHTML = "";
        targets.forEach((target) => {
          const label = document.createElement("label");
          label.className = "target-row";
          label.setAttribute("for", target.id);

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = target.id;
          checkbox.id = target.id;
          checkbox.checked = true;
          checkbox.className = "target-checkbox";
          checkbox.addEventListener("change", updateGenerateState);

          const meta = document.createElement("div");
          meta.className = "target-meta";
          const title = document.createElement("strong");
          title.textContent = target.label;
          const desc = document.createElement("span");
          desc.textContent = \`\${target.width} × \${target.height} · \${target.description}\`;

          meta.appendChild(title);
          meta.appendChild(desc);
          label.appendChild(checkbox);
          label.appendChild(meta);
          targetList.appendChild(label);
        });
        updateGenerateState();
      }

      function updateSafeAreaValue() {
        const percent = Math.round(Number(safeAreaSlider.value) * 100);
        safeAreaValue.textContent = \`\${percent}%\`;
      }

      function getSelectedTargetIds() {
        const inputs = Array.from(targetList.querySelectorAll("input[type='checkbox']"));
        return inputs.filter((input) => input.checked).map((input) => input.value);
      }

      function updateGenerateState() {
        const selectedTargets = getSelectedTargetIds();
        generateButton.disabled = isBusy || !selectionReady || selectedTargets.length === 0;
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
        updateGenerateState();
      }

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
                safeAreaRatio: Number(safeAreaSlider.value)
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

      function renderResults(results) {
        resultsContainer.innerHTML = "";
        results.forEach((result) => {
          const target = availableTargets.find((item) => item.id === result.targetId);
          const tile = document.createElement("div");
          tile.className = "result-item";
          const heading = document.createElement("strong");
          heading.textContent = target ? target.label : result.targetId;
          tile.appendChild(heading);

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
              error: message.payload.error
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
      parent.postMessage({ pluginMessage: { type: "request-initial-state" } }, "*");
    })();
  </script>
</body>
</html>`;
