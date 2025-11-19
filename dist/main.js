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
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Product Landing</h1>
      <p id="selectionLabel" class="status">Select a single frame to begin.</p>
    </header>

    <section class="section" id="aiSection" hidden>
      <h2>AI signals</h2>
      <div id="aiEmpty" class="status">No AI signals found on selection.</div>
      <div id="aiRoles" class="ai-row" role="list"></div>
      <div id="aiQa" class="ai-qa" role="list"></div>
      <button id="applySampleAi" style="align-self: flex-start;">Apply sample AI signals</button>
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
      const lastRunSection = document.getElementById("lastRunSection");
      const lastRunContent = document.getElementById("lastRunContent");
      const resultsSection = document.getElementById("resultsSection");
      const resultsContainer = document.getElementById("resultsContainer");
      const aiSection = document.getElementById("aiSection");
      const aiEmpty = document.getElementById("aiEmpty");
      const aiRoles = document.getElementById("aiRoles");
      const aiQa = document.getElementById("aiQa");
      const applySampleAi = document.getElementById("applySampleAi");

      let availableTargets = [];
      let selectionReady = false;
      let isBusy = false;

      if (!(targetSelect instanceof HTMLSelectElement)) {
        throw new Error("Target select element missing.");
      }
      if (!(targetSummary instanceof HTMLElement)) {
        throw new Error("Target summary element missing.");
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
          option.textContent = \`\${target.label} (\${target.width} \xD7 \${target.height})\`;
          option.title = \`\${target.description} \xB7 \${target.width} \xD7 \${target.height}\`;
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
        renderAiSignals(state.aiSignals);
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
        setBusy(true, "Generating variants\u2026");
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
          generateButton.textContent = "Generating\u2026";
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
        return \`\${formatted} \u2014 \${lastRun.sourceNodeName} (\${lastRun.targetIds.length} targets)\`;
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

      function renderAiSignals(aiSignals) {
        if (!selectionReady) {
          aiSection.hidden = true;
          return;
        }
        aiSection.hidden = false;
        aiRoles.innerHTML = "";
        aiQa.innerHTML = "";

        const hasRoles = aiSignals && Array.isArray(aiSignals.roles) && aiSignals.roles.length > 0;
        const hasQa = aiSignals && Array.isArray(aiSignals.qa) && aiSignals.qa.length > 0;

        if (!aiSignals || (!hasRoles && !hasQa)) {
          aiEmpty.textContent = "No AI signals found on selection.";
          aiEmpty.hidden = false;
          return;
        }

        aiEmpty.hidden = true;

        if (hasRoles) {
          aiSignals.roles.slice(0, 8).forEach((role) => {
            const chip = document.createElement("span");
            chip.className = "ai-chip";
            const confidence = Math.round((role.confidence ?? 0) * 100);
            chip.textContent = role.role.replace("_", " ") + " \xB7 " + confidence + "%";
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

      if (applySampleAi instanceof HTMLButtonElement) {
        applySampleAi.addEventListener("click", applySampleSignals);
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
              error: message.payload.error,
              aiSignals: message.payload.aiSignals
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
  return {
    start: insetPerSide + remaining * startShare,
    end: insetPerSide + remaining * (1 - startShare)
  };
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
    gaps: gaps != null ? gaps : null
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
    const horizontalSpan = contentBounds.width;
    const verticalSpan = contentBounds.height;
    const layoutIsPredominantlyHorizontal = horizontalSpan > verticalSpan * 1.1;
    if (layoutIsPredominantlyHorizontal) {
      return planVerticalStack(input.children, safeBounds);
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
    if ("getPluginData" in node && node.getPluginData("biblio-assets:role") === "overlay") {
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
    if ("getPluginData" in child && child.getPluginData("biblio-assets:role") === "overlay") {
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
  const MAX_SCALE = 10;
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
      if (figma.root.getPluginData("biblio-assets:debug") === "1") {
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
  log("[BiblioAssets][frame-detach]", message, context);
}
function debugAutoLayoutLog(message, context) {
  log("[BiblioAssets][auto-layout]", message, context);
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
  if (targetProfile.type === "vertical" && targetProfile.aspectRatio < 0.6) {
    if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount >= 2) {
      return "VERTICAL";
    }
    return sourceLayout.mode === "VERTICAL" ? "VERTICAL" : "VERTICAL";
  }
  if (targetProfile.type === "horizontal" && targetProfile.aspectRatio > 2.4) {
    if (sourceLayout.mode === "VERTICAL" && sourceLayout.childCount >= 2) {
      return "HORIZONTAL";
    }
    return sourceLayout.mode === "HORIZONTAL" ? "HORIZONTAL" : "HORIZONTAL";
  }
  if (targetProfile.type === "vertical") {
    if (sourceLayout.childCount > 3) {
      return "VERTICAL";
    }
    if (sourceLayout.mode === "HORIZONTAL" && sourceLayout.childCount <= 3 && sourceLayout.hasText) {
      return sourceLayout.childCount === 2 ? "VERTICAL" : "HORIZONTAL";
    }
    return "VERTICAL";
  }
  if (targetProfile.type === "horizontal") {
    if (sourceLayout.childCount > 3 && sourceLayout.mode === "VERTICAL") {
      return "HORIZONTAL";
    }
    return sourceLayout.mode === "VERTICAL" && sourceLayout.childCount <= 2 ? "HORIZONTAL" : sourceLayout.mode;
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
function readAiSignals(node, key = "biblio-assets:ai-signals") {
  var _a, _b, _c;
  let raw = null;
  try {
    raw = node.getPluginData(key);
  } catch (e) {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    debugFixLog("ai signals parsed", { hasRoles: ((_a = parsed == null ? void 0 : parsed.roles) == null ? void 0 : _a.length) > 0, qa: (_c = (_b = parsed == null ? void 0 : parsed.qa) == null ? void 0 : _b.length) != null ? _c : 0 });
    return parsed;
  } catch (error) {
    debugFixLog("ai signals parse failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
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

// core/main.ts
var STAGING_PAGE_NAME = "Biblio Assets Variants";
var LAST_RUN_KEY = "biblio-assets:last-run";
var MAX_SAFE_AREA_RATIO = 0.25;
var RUN_GAP = 160;
var RUN_MARGIN = 48;
var MAX_ROW_WIDTH = 3200;
figma.showUI(UI_TEMPLATE, {
  width: 360,
  height: 540,
  themeColors: true
});
figma.ui.onmessage = async (rawMessage) => {
  switch (rawMessage.type) {
    case "request-initial-state":
      await postInitialState();
      break;
    case "generate-variants":
      await handleGenerateRequest(rawMessage.payload.targetIds, rawMessage.payload.safeAreaRatio);
      break;
    case "set-ai-signals":
      await handleSetAiSignals(rawMessage.payload.signals);
      break;
    default:
      console.warn("Unhandled message", rawMessage);
  }
};
figma.on("selectionchange", () => {
  const frame = getSelectionFrame();
  const selectionState = createSelectionState(frame);
  postToUI({ type: "selection-update", payload: selectionState });
});
async function postInitialState() {
  const selectionFrame = getSelectionFrame();
  const selectionState = createSelectionState(selectionFrame);
  const lastRunSummary = readLastRun();
  const payload = {
    selectionOk: selectionState.selectionOk,
    selectionName: selectionState.selectionName,
    error: selectionState.error,
    aiSignals: selectionState.aiSignals,
    targets: VARIANT_TARGETS,
    lastRun: lastRunSummary != null ? lastRunSummary : void 0
  };
  debugFixLog("initializing UI with targets", {
    targetIds: VARIANT_TARGETS.map((target) => target.id),
    targetCount: VARIANT_TARGETS.length
  });
  postToUI({ type: "init", payload });
}
async function handleGenerateRequest(targetIds, rawSafeAreaRatio) {
  var _a, _b;
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
      variantNode.setPluginData("biblio-assets:targetId", target.id);
      variantNode.setPluginData("biblio-assets:runId", runId);
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
        layoutProfile
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
      const warnings = collectWarnings(variantNode, target, safeAreaRatio);
      variantNodes.push(variantNode);
      results.push({
        targetId: target.id,
        nodeId: variantNode.id,
        warnings
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
    figma.notify(`Biblio Assets: Generated ${targets.length} variant${targets.length === 1 ? "" : "s"}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while generating variants.";
    console.error("Biblio Assets generation failed", error);
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
    frame.setPluginData("biblio-assets:ai-signals", serialized);
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
    return {
      selectionOk: true,
      selectionName: frame.name,
      aiSignals: aiSignals != null ? aiSignals : void 0
    };
  }
  return {
    selectionOk: false,
    error: "Select a single frame to begin."
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
  container.setPluginData("biblio-assets:runId", runId);
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
  const round3 = (value) => Math.round(value * 100) / 100;
  frame.paddingLeft = round3(basePaddingLeft + horizontalPlan.start);
  frame.paddingRight = round3(basePaddingRight + horizontalPlan.end);
  frame.paddingTop = round3(basePaddingTop + verticalPlan.start);
  frame.paddingBottom = round3(basePaddingBottom + verticalPlan.end);
  let nextItemSpacing = baseItemSpacing;
  if (snapshot.layoutMode === "HORIZONTAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = horizontalPlan.interior / gaps;
    nextItemSpacing = round3(baseItemSpacing + perGap);
  } else if (snapshot.layoutMode === "VERTICAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = verticalPlan.interior / gaps;
    nextItemSpacing = round3(baseItemSpacing + perGap);
  }
  frame.itemSpacing = nextItemSpacing;
  if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
    const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
    frame.counterAxisSpacing = round3(baseCounterSpacing);
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
    if ("getPluginData" in child && child.getPluginData("biblio-assets:role") === "overlay") {
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
async function scaleNodeTree(frame, target, safeAreaRatio, fontCache, rootSnapshot, profile) {
  var _a, _b;
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
    allowInteriorExpansion: rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" && rootSnapshot.flowChildCount >= 2 || (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false)
  });
  const verticalFlowChildCount = rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" ? rootSnapshot.flowChildCount : adoptVerticalVariant ? (_a = rootSnapshot == null ? void 0 : rootSnapshot.flowChildCount) != null ? _a : absoluteChildCount : absoluteChildCount;
  const verticalAllowInterior = adoptVerticalVariant || rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" && rootSnapshot.flowChildCount >= 2 || (rootSnapshot == null ? void 0 : rootSnapshot.layoutWrap) === "WRAP" && rootSnapshot.flowChildCount >= 2 || (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false);
  const verticalPlan = planAutoLayoutExpansion({
    totalExtra: extraHeight,
    safeInset: safeInsetY,
    gaps: verticalGaps,
    flowChildCount: verticalFlowChildCount,
    baseItemSpacing: rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale) : 0,
    allowInteriorExpansion: verticalAllowInterior
  });
  const offsetX = horizontalPlan.start;
  const offsetY = verticalPlan.start;
  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY);
  if (shouldExpandAbsoluteChildren(rootSnapshot == null ? void 0 : rootSnapshot.layoutMode, adoptVerticalVariant)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile);
  }
  frame.setPluginData(
    "biblio-assets:safeArea",
    JSON.stringify({ insetX: safeInsetX, insetY: safeInsetY, width: target.width, height: target.height })
  );
  debugFixLog("axis expansion planned", {
    nodeId: frame.id,
    layoutMode: (_b = rootSnapshot == null ? void 0 : rootSnapshot.layoutMode) != null ? _b : "NONE",
    extraWidth,
    extraHeight,
    horizontalPlan,
    verticalPlan,
    profile,
    adoptVerticalVariant
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
    if ("getPluginData" in child && child.getPluginData("biblio-assets:role") === "overlay") {
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
  const contentBounds = combineChildBounds(frame);
  if (!contentBounds) {
    return null;
  }
  const left = Math.max(contentBounds.x - frameBounds.x, 0);
  const top = Math.max(contentBounds.y - frameBounds.y, 0);
  const right = Math.max(frameBounds.x + frameBounds.width - (contentBounds.x + contentBounds.width), 0);
  const bottom = Math.max(frameBounds.y + frameBounds.height - (contentBounds.y + contentBounds.height), 0);
  return { left, right, top, bottom };
}
function combineChildBounds(frame) {
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
    if ("getPluginData" in node && node.getPluginData("biblio-assets:role") === "overlay") {
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
function createQaOverlay(target, safeAreaRatio) {
  const overlay = figma.createFrame();
  overlay.name = "QA Overlay";
  overlay.layoutMode = "NONE";
  overlay.opacity = 1;
  overlay.fills = [];
  overlay.strokes = [];
  overlay.resizeWithoutConstraints(target.width, target.height);
  overlay.clipsContent = false;
  overlay.setPluginData("biblio-assets:role", "overlay");
  const insetX = target.width * safeAreaRatio;
  const insetY = target.height * safeAreaRatio;
  const safeRect = figma.createRectangle();
  safeRect.name = "Safe Area";
  safeRect.x = insetX;
  safeRect.y = insetY;
  safeRect.resizeWithoutConstraints(target.width - insetX * 2, target.height - insetY * 2);
  safeRect.fills = [];
  safeRect.strokes = [
    {
      type: "SOLID",
      color: { r: 0.92, g: 0.4, b: 0.36 }
    }
  ];
  safeRect.dashPattern = [8, 12];
  safeRect.strokeWeight = 3;
  safeRect.locked = true;
  safeRect.setPluginData("biblio-assets:role", "overlay");
  overlay.appendChild(safeRect);
  return overlay;
}
function formatTimestamp(date) {
  return `${date.toLocaleDateString()} \xB7 ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function writeLastRun(summary) {
  const encoded = JSON.stringify(summary);
  figma.root.setPluginData(LAST_RUN_KEY, encoded);
}
function readLastRun() {
  const raw = figma.root.getPluginData(LAST_RUN_KEY);
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
    console.warn("Failed to parse Biblio Assets last run plugin data", error);
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
//# sourceMappingURL=main.js.map
