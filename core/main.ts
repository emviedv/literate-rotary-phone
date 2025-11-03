import type { SceneNode, FrameNode, PageNode, TextNode, Effect, Paint, ComponentNode } from "@figma/plugin-typings";
import { VARIANT_TARGETS, getTargetById, type VariantTarget } from "../types/targets";
import type {
  ToCoreMessage,
  ToUIMessage,
  VariantWarning,
  VariantResult,
  LastRunSummary,
  SelectionState
} from "../types/messages";
import { UI_TEMPLATE } from "../ui/template";

const STAGING_PAGE_NAME = "Biblio Assets Variants";
const LAST_RUN_KEY = "biblio-assets:last-run";
const MAX_SAFE_AREA_RATIO = 0.25;
const RUN_GAP = 160;
const MAX_ROW_WIDTH = 3200;

type AutoLayoutSnapshot = {
  layoutMode: FrameNode["layoutMode"];
  primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  layoutWrap: FrameNode["layoutWrap"];
  itemSpacing: number;
  counterAxisSpacing: number | null;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  clipsContent: boolean;
};

type SafeAreaMetrics = {
  scale: number;
  offsetX: number;
  offsetY: number;
  scaledWidth: number;
  scaledHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  targetWidth: number;
  targetHeight: number;
};

declare const figma: PluginAPI;

figma.showUI(UI_TEMPLATE, {
  width: 360,
  height: 540,
  themeColors: true
});

figma.ui.onmessage = async (rawMessage: ToCoreMessage) => {
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

async function postInitialState(): Promise<void> {
  const selectionFrame = getSelectionFrame();
  const selectionState = createSelectionState(selectionFrame);
  const lastRunSummary = readLastRun();

  const payload = {
    selectionOk: selectionState.selectionOk,
    selectionName: selectionState.selectionName,
    error: selectionState.error,
    targets: VARIANT_TARGETS,
    lastRun: lastRunSummary ?? undefined
  };

  postToUI({ type: "init", payload });
}

async function handleGenerateRequest(targetIds: readonly string[], rawSafeAreaRatio: number): Promise<void> {
  const selectionFrame = getSelectionFrame();
  if (!selectionFrame) {
    postToUI({ type: "error", payload: { message: "Select exactly one frame before generating variants." } });
    return;
  }

  const targets = targetIds
    .map((id) => getTargetById(id))
    .filter((target): target is VariantTarget => Boolean(target));

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

    const results: VariantResult[] = [];
    const variantNodes: FrameNode[] = [];

    const fontCache = new Set<string>();
    await loadFontsForNode(selectionFrame, fontCache);

    for (const target of targets) {
      const variantNode = selectionFrame.clone();
      variantNode.name = `${selectionFrame.name} → ${target.label}`;
      variantNode.setPluginData("biblio-assets:targetId", target.id);
      variantNode.setPluginData("biblio-assets:runId", runId);

      runContainer.appendChild(variantNode);
      const autoLayoutSnapshots = new Map<string, AutoLayoutSnapshot>();
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
    exposeRun(stagingPage, runContainer, variantNodes);
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

function getSelectionFrame(): FrameNode | null {
  if (figma.currentPage.selection.length !== 1) {
    return null;
  }
  const [node] = figma.currentPage.selection;
  if (node.type !== "FRAME") {
    return null;
  }
  return node;
}

function createSelectionState(frame: FrameNode | null): SelectionState {
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

function postToUI(message: ToUIMessage): void {
  figma.ui.postMessage(message);
}

function ensureStagingPage(): PageNode {
  const existing = figma.root.children.find(
    (child): child is PageNode => child.type === "PAGE" && child.name === STAGING_PAGE_NAME
  );

  if (existing) {
    return existing;
  }

  const page = figma.createPage();
  page.name = STAGING_PAGE_NAME;
  figma.root.appendChild(page);
  return page;
}

function createRunContainer(page: PageNode, runId: string, sourceName: string): FrameNode {
  figma.currentPage = page;

  const container = figma.createFrame();
  container.name = `Run ${formatTimestamp(new Date())} · ${sourceName}`;
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
  container.paddingLeft = 48;
  container.paddingRight = 48;
  container.paddingTop = 48;
  container.paddingBottom = 48;
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

async function prepareCloneForLayout(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>
): Promise<void> {
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

function captureAutoLayoutSnapshot(frame: FrameNode): AutoLayoutSnapshot | null {
  if (frame.layoutMode === "NONE") {
    return null;
  }

  let counterAxisSpacing: number | null = null;
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

function restoreAutoLayoutSettings(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>,
  metrics: SafeAreaMetrics
): void {
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

  const round = (value: number): number => Math.round(value * 100) / 100;

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

function scaleAutoLayoutMetric(value: number, scale: number): number {
  const scaled = value * scale;
  return Math.round(scaled * 100) / 100;
}

function adjustAutoLayoutProperties(node: SceneNode, scale: number): void {
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

async function scaleNodeTree(
  frame: FrameNode,
  target: VariantTarget,
  safeAreaRatio: number,
  fontCache: Set<string>
): Promise<SafeAreaMetrics> {
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

async function scaleNodeRecursive(node: SceneNode, scale: number, fontCache: Set<string>): Promise<void> {
  if ("children" in node) {
    for (const child of node.children) {
      adjustNodePosition(child as SceneNode, scale);
      await scaleNodeRecursive(child as SceneNode, scale, fontCache);
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
    node.effects = (node.effects as readonly Effect[]).map((effect) => scaleEffect(effect, scale));
  }

  if ("fills" in node && Array.isArray(node.fills)) {
    node.fills = (node.fills as readonly Paint[]).map((paint) => scalePaint(paint, scale));
  }

  adjustAutoLayoutProperties(node, scale);
}

function adjustNodePosition(node: SceneNode, scale: number): void {
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

async function scaleTextNode(node: TextNode, scale: number, fontCache: Set<string>): Promise<void> {
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

function scaleEffect(effect: Effect, scale: number): Effect {
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

function scalePaint(paint: Paint, scale: number): Paint {
  const clone = cloneValue(paint);
  if (clone.type === "IMAGE" && clone.scaling === "TILE") {
    clone.scalingFactor = (clone.scalingFactor ?? 1) * scale;
  }
  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR"
  ) {
    if (Array.isArray(clone.gradientHandlePositions)) {
      clone.gradientHandlePositions = clone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }
  }
  return clone;
}

function repositionChildren(parent: FrameNode, offsetX: number, offsetY: number): void {
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

function layoutVariants(container: FrameNode, variants: readonly FrameNode[]): void {
  let cursorX = 48;
  let cursorY = 48;
  let rowHeight = 0;

  let containerWidth = container.width;
  let containerHeight = container.height;

  for (const variant of variants) {
    const requiredWidth = cursorX + variant.width;
    if (requiredWidth > MAX_ROW_WIDTH && cursorX > 48) {
      cursorX = 48;
      cursorY += rowHeight + RUN_GAP;
      rowHeight = 0;
    }

    variant.x = cursorX;
    variant.y = cursorY;
    cursorX += variant.width + RUN_GAP;
    rowHeight = Math.max(rowHeight, variant.height);
    containerWidth = Math.max(containerWidth, variant.x + variant.width + 48);
    containerHeight = Math.max(containerHeight, variant.y + variant.height + 48);
  }

  container.resizeWithoutConstraints(containerWidth, containerHeight);
}

function exposeRun(page: PageNode, container: FrameNode, variants: readonly FrameNode[]): void {
  figma.currentPage = page;
  figma.viewport.scrollAndZoomIntoView([container, ...variants]);
}

function collectWarnings(frame: FrameNode, target: VariantTarget, safeAreaRatio: number): VariantWarning[] {
  const warnings: VariantWarning[] = [];
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

function combineChildBounds(frame: FrameNode): { x: number; y: number; width: number; height: number } | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const queue: SceneNode[] = [...frame.children];

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

function isWithinSafeArea(bounds: { x: number; y: number; width: number; height: number }, safe: { x: number; y: number; width: number; height: number }): boolean {
  const tolerance = 2;
  return (
    bounds.x >= safe.x - tolerance &&
    bounds.y >= safe.y - tolerance &&
    bounds.x + bounds.width <= safe.x + safe.width + tolerance &&
    bounds.y + bounds.height <= safe.y + safe.height + tolerance
  );
}

function createQaOverlay(target: VariantTarget, safeAreaRatio: number): FrameNode {
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

function formatTimestamp(date: Date): string {
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function writeLastRun(summary: LastRunSummary): void {
  const encoded = JSON.stringify(summary);
  figma.root.setPluginData(LAST_RUN_KEY, encoded);
}

function readLastRun(): LastRunSummary | null {
  const raw = figma.root.getPluginData(LAST_RUN_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LastRunSummary;
    if (!parsed || typeof parsed.runId !== "string") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse Biblio Assets last run plugin data", error);
    return null;
  }
}

async function loadFontsForNode(node: SceneNode, cache: Set<string>): Promise<void> {
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
      await loadFontsForNode(child as SceneNode, cache);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
