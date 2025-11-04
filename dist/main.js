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
          desc.textContent = \`\${target.width} \xD7 \${target.height} \xB7 \${target.description}\`;

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

// core/main.ts
var STAGING_PAGE_NAME = "Biblio Assets Variants";
var LAST_RUN_KEY = "biblio-assets:last-run";
var MAX_SAFE_AREA_RATIO = 0.25;
var RUN_GAP = 160;
var RUN_MARGIN = 48;
var MAX_ROW_WIDTH = 3200;
var _a;
var DEBUG_FIX_ENABLED = typeof process !== "undefined" && ((_a = process == null ? void 0 : process.env) == null ? void 0 : _a.DEBUG_FIX) === "1" || figma.root.getPluginData("biblio-assets:debug") === "1" || typeof globalThis !== "undefined" && globalThis.DEBUG_FIX === "1";
function debugFixLog(message, context) {
  if (!DEBUG_FIX_ENABLED) {
    return;
  }
  if (context) {
    console.log("[BiblioAssets][frame-detach]", message, context);
    return;
  }
  console.log("[BiblioAssets][frame-detach]", message);
}
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
    targets: VARIANT_TARGETS,
    lastRun: lastRunSummary != null ? lastRunSummary : void 0
  };
  postToUI({ type: "init", payload });
}
async function handleGenerateRequest(targetIds, rawSafeAreaRatio) {
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
  const safeAreaRatio = clamp(rawSafeAreaRatio, 0, MAX_SAFE_AREA_RATIO);
  postToUI({ type: "status", payload: { status: "running" } });
  try {
    const stagingPage = ensureStagingPage();
    const runId = `run-${Date.now()}`;
    const runContainer = createRunContainer(stagingPage, runId, selectionFrame.name);
    const results = [];
    const variantNodes = [];
    const fontCache = /* @__PURE__ */ new Set();
    await loadFontsForNode(selectionFrame, fontCache);
    for (const target of targets) {
      const variantNode = selectionFrame.clone();
      variantNode.name = `${selectionFrame.name} \u2192 ${target.label}`;
      variantNode.setPluginData("biblio-assets:targetId", target.id);
      variantNode.setPluginData("biblio-assets:runId", runId);
      runContainer.appendChild(variantNode);
      const autoLayoutSnapshots = /* @__PURE__ */ new Map();
      await prepareCloneForLayout(variantNode, autoLayoutSnapshots);
      const safeAreaMetrics = await scaleNodeTree(variantNode, target, safeAreaRatio, fontCache);
      restoreAutoLayoutSettings(variantNode, autoLayoutSnapshots, safeAreaMetrics);
      const overlay = createQaOverlay(target, safeAreaRatio);
      variantNode.appendChild(overlay);
      overlay.locked = true;
      overlay.x = 0;
      overlay.y = 0;
      const warnings = collectWarnings(variantNode, target, safeAreaRatio);
      variantNodes.push(variantNode);
      results.push({
        targetId: target.id,
        nodeId: variantNode.id,
        warnings
      });
    }
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
    return {
      selectionOk: true,
      selectionName: frame.name
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
  return {
    layoutMode: frame.layoutMode,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    layoutWrap: frame.layoutWrap,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing,
    paddingLeft: frame.paddingLeft,
    paddingRight: frame.paddingRight,
    paddingTop: frame.paddingTop,
    paddingBottom: frame.paddingBottom,
    clipsContent: frame.clipsContent
  };
}
function restoreAutoLayoutSettings(frame, autoLayoutSnapshots, metrics) {
  const snapshot = autoLayoutSnapshots.get(frame.id);
  if (!snapshot) {
    return;
  }
  frame.layoutMode = snapshot.layoutMode;
  frame.primaryAxisSizingMode = snapshot.primaryAxisSizingMode;
  frame.counterAxisSizingMode = snapshot.counterAxisSizingMode;
  frame.layoutWrap = snapshot.layoutWrap;
  frame.clipsContent = snapshot.clipsContent;
  if (snapshot.layoutMode === "NONE") {
    return;
  }
  const basePaddingLeft = scaleAutoLayoutMetric(snapshot.paddingLeft, metrics.scale);
  const basePaddingRight = scaleAutoLayoutMetric(snapshot.paddingRight, metrics.scale);
  const basePaddingTop = scaleAutoLayoutMetric(snapshot.paddingTop, metrics.scale);
  const basePaddingBottom = scaleAutoLayoutMetric(snapshot.paddingBottom, metrics.scale);
  const baseItemSpacing = scaleAutoLayoutMetric(snapshot.itemSpacing, metrics.scale);
  const extraLeft = Math.max(metrics.offsetX, 0);
  const extraTop = Math.max(metrics.offsetY, 0);
  const extraRight = Math.max(metrics.targetWidth - metrics.scaledWidth - metrics.offsetX, 0);
  const extraBottom = Math.max(metrics.targetHeight - metrics.scaledHeight - metrics.offsetY, 0);
  const round = (value) => Math.round(value * 100) / 100;
  frame.paddingLeft = round(basePaddingLeft + extraLeft);
  frame.paddingRight = round(basePaddingRight + extraRight);
  frame.paddingTop = round(basePaddingTop + extraTop);
  frame.paddingBottom = round(basePaddingBottom + extraBottom);
  frame.itemSpacing = baseItemSpacing;
  if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
    const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
    frame.counterAxisSpacing = round(baseCounterSpacing);
  }
}
function scaleAutoLayoutMetric(value, scale) {
  const scaled = value * scale;
  return Math.round(scaled * 100) / 100;
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
async function scaleNodeTree(frame, target, safeAreaRatio, fontCache) {
  const sourceWidth = frame.width;
  const sourceHeight = frame.height;
  const safeInsetX = target.width * safeAreaRatio;
  const safeInsetY = target.height * safeAreaRatio;
  const availableWidth = Math.max(target.width - safeInsetX * 2, 1);
  const availableHeight = Math.max(target.height - safeInsetY * 2, 1);
  const widthScale = availableWidth / sourceWidth;
  const heightScale = availableHeight / sourceHeight;
  const scale = Math.min(widthScale, heightScale);
  await scaleNodeRecursive(frame, scale, fontCache);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = safeInsetX + Math.max((availableWidth - scaledWidth) / 2, 0);
  const offsetY = safeInsetY + Math.max((availableHeight - scaledHeight) / 2, 0);
  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY);
  frame.setPluginData(
    "biblio-assets:safeArea",
    JSON.stringify({ insetX: safeInsetX, insetY: safeInsetY, width: target.width, height: target.height })
  );
  return {
    scale,
    offsetX,
    offsetY,
    scaledWidth,
    scaledHeight,
    safeInsetX,
    safeInsetY,
    targetWidth: target.width,
    targetHeight: target.height
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
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    node.cornerRadius *= scale;
  }
  if ("topLeftRadius" in node && typeof node.topLeftRadius === "number") {
    node.topLeftRadius *= scale;
  }
  if ("topRightRadius" in node && typeof node.topRightRadius === "number") {
    node.topRightRadius *= scale;
  }
  if ("bottomLeftRadius" in node && typeof node.bottomLeftRadius === "number") {
    node.bottomLeftRadius *= scale;
  }
  if ("bottomRightRadius" in node && typeof node.bottomRightRadius === "number") {
    node.bottomRightRadius *= scale;
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
  if (clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") {
    clone.radius *= scale;
    clone.offset.x *= scale;
    clone.offset.y *= scale;
  }
  if (clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") {
    clone.radius *= scale;
  }
  return clone;
}
function scalePaint(paint, scale) {
  var _a2;
  const clone = cloneValue(paint);
  if (clone.type === "IMAGE" && clone.scaling === "TILE") {
    clone.scalingFactor = ((_a2 = clone.scalingFactor) != null ? _a2 : 1) * scale;
  }
  if (clone.type === "GRADIENT_LINEAR" || clone.type === "GRADIENT_RADIAL" || clone.type === "GRADIENT_ANGULAR") {
    if (Array.isArray(clone.gradientHandlePositions)) {
      clone.gradientHandlePositions = clone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }
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
  var _a2;
  const parent = container.parent;
  if (!parent || parent.type !== "PAGE") {
    debugFixLog("skipped promotion because container parent is not a page", {
      parentType: (_a2 = parent == null ? void 0 : parent.type) != null ? _a2 : "none"
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
  return warnings;
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
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}
//# sourceMappingURL=main.js.map
