import { VARIANT_TARGETS, getTargetById, type VariantTarget } from "../types/targets";
import type {
  AiStatus,
  ToCoreMessage,
  ToUIMessage,
  VariantWarning,
  VariantResult,
  LastRunSummary,
  SelectionState
} from "../types/messages";
import type { LayoutAdvice } from "../types/layout-advice.js";
import type { AiSignals } from "../types/ai-signals.js";
import { UI_TEMPLATE } from "../ui/template";
import { computeVariantLayout } from "./layout-positions";
import { planAutoLayoutExpansion, type AxisExpansionPlan } from "./layout-expansion";
import type { AxisGaps } from "./padding-distribution";
import { planAbsoluteChildPositions } from "./absolute-layout";
import { configureQaOverlay } from "./qa-overlay";
import {
  resolveLayoutProfile,
  shouldAdoptVerticalFlow,
  shouldExpandAbsoluteChildren,
  type LayoutProfile,
  type AutoLayoutSummary
} from "./layout-profile";
import { analyzeContent, calculateOptimalScale } from "./content-analyzer";
import { createLayoutAdaptationPlan, applyLayoutAdaptation } from "./auto-layout-adapter";
import { deriveWarningsFromAiSignals, readAiSignals, resolvePrimaryFocalPoint } from "./ai-signals.js";
import { autoSelectLayoutPattern, normalizeLayoutAdvice, readLayoutAdvice, resolvePatternLabel } from "./layout-advice.js";
import { requestAiInsights } from "./ai-service.js";
import { debugFixLog } from "./debug.js";
import { DEFAULT_AI_API_KEY } from "./build-env.js";

const STAGING_PAGE_NAME = "Biblio Assets Variants";
const LAST_RUN_KEY = "biblio-assets:last-run";
const MAX_SAFE_AREA_RATIO = 0.25;
const RUN_GAP = 160;
const RUN_MARGIN = 48;
const MAX_ROW_WIDTH = 3200;
const MIN_PATTERN_CONFIDENCE = 0.65;
const AI_KEY_STORAGE_KEY = "biblio-assets:openai-key";
const HAS_DEFAULT_AI_KEY = DEFAULT_AI_API_KEY.length > 0;

let cachedAiApiKey: string | null = null;
let aiKeyLoaded = false;
let aiStatus: AiStatus = "missing-key";
let aiStatusDetail: string | null = null;
let aiRequestToken = 0;
let aiUsingDefaultKey = false;

type Mutable<T> = T extends ReadonlyArray<infer U>
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

type AutoLayoutSnapshot = {
  layoutMode: FrameNode["layoutMode"];
  primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  layoutWrap: FrameNode["layoutWrap"];
  primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
  counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
  itemSpacing: number;
  counterAxisSpacing: number | null;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  clipsContent: boolean;
  flowChildCount: number;
  absoluteChildCount: number;
};

type SafeAreaMetrics = {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  targetWidth: number;
  targetHeight: number;
  horizontal: AxisExpansionPlan;
  vertical: AxisExpansionPlan;
  profile: LayoutProfile;
  adoptVerticalVariant: boolean;
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
      await handleGenerateRequest(
        rawMessage.payload.targetIds,
        rawMessage.payload.safeAreaRatio,
        rawMessage.payload.layoutPatterns ?? {}
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

async function handleSelectionChange(): Promise<void> {
  await ensureAiKeyLoaded();
  const frame = getSelectionFrame();
  const selectionState = createSelectionState(frame);
  postToUI({ type: "selection-update", payload: selectionState });
  if (frame) {
    void maybeRequestAiForFrame(frame);
  }
}

async function postInitialState(): Promise<void> {
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
    lastRun: lastRunSummary ?? undefined
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

async function handleGenerateRequest(
  targetIds: readonly string[],
  rawSafeAreaRatio: number,
  layoutPatterns: Record<string, string | undefined>
): Promise<void> {
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
    const overlaysToLock: FrameNode[] = [];

    const fontCache = new Set<string>();
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
      variantNode.name = `${selectionFrame.name} → ${target.label}`;
      variantNode.setPluginData("biblio-assets:targetId", target.id);
      variantNode.setPluginData("biblio-assets:runId", runId);

      runContainer.appendChild(variantNode);
      const autoLayoutSnapshots = new Map<string, AutoLayoutSnapshot>();
      await prepareCloneForLayout(variantNode, autoLayoutSnapshots);
      const rootSnapshot = autoLayoutSnapshots.get(variantNode.id) ?? null;
      const safeAreaMetrics = await scaleNodeTree(
        variantNode,
        target,
        safeAreaRatio,
        fontCache,
        rootSnapshot,
        layoutProfile,
        primaryFocal
      );

      // Create and apply intelligent layout adaptation instead of just restoring
      const layoutAdaptationPlan = createLayoutAdaptationPlan(
        variantNode,
        target,
        layoutProfile,
        safeAreaMetrics.scale
      );

      debugFixLog("Layout adaptation plan created", {
        targetId: target.id,
        originalMode: rootSnapshot?.layoutMode ?? "NONE",
        newMode: layoutAdaptationPlan.layoutMode,
        profile: layoutProfile
      });

      // Apply the adaptation plan for intelligent layout restructuring
      applyLayoutAdaptation(variantNode, layoutAdaptationPlan);

      // Then apply any additional auto layout settings that weren't covered
      restoreAutoLayoutSettings(variantNode, autoLayoutSnapshots, safeAreaMetrics);
      const overlay = createQaOverlay(target, safeAreaRatio);
      variantNode.appendChild(overlay);
      const overlayConfig = configureQaOverlay(overlay, { parentLayoutMode: variantNode.layoutMode });
      overlaysToLock.push(overlay);
      debugFixLog("qa overlay configured", {
        overlayId: overlay.id,
        variantId: variantNode.id,
        positioningUpdated: overlayConfig.positioningUpdated,
        layoutPositioning: "layoutPositioning" in overlay ? overlay.layoutPositioning : undefined,
        constraints: "constraints" in overlay ? overlay.constraints : undefined,
        locked: overlay.locked,
        willLockAfterFlush: true
      });

      const patternSelection = autoSelectLayoutPattern(layoutAdvice, target.id, MIN_PATTERN_CONFIDENCE);
      const userSelection = layoutPatterns[target.id];
      const adviceEntry = layoutAdvice?.entries.find((entry) => entry.targetId === target.id);
      const chosenPatternId =
        userSelection ??
        (patternSelection && !patternSelection.fallback
          ? patternSelection.patternId ?? adviceEntry?.selectedId
          : undefined);
      const layoutFallback = !userSelection && (patternSelection?.fallback ?? false);
      const patternConfidence =
        chosenPatternId && patternSelection?.patternId === chosenPatternId && !layoutFallback
          ? patternSelection.confidence
          : undefined;

      if (chosenPatternId) {
        variantNode.setPluginData("biblio-assets:layoutPattern", chosenPatternId);
        debugFixLog("layout pattern tagged on variant", {
          targetId: target.id,
          patternId: chosenPatternId,
          confidence: patternConfidence
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
      variantNodes.push(variantNode);
      results.push({
        targetId: target.id,
        nodeId: variantNode.id,
        warnings,
        layoutPatternId: chosenPatternId,
        layoutPatternLabel:
          resolvePatternLabel(layoutAdvice, target.id, chosenPatternId) ?? patternSelection?.patternLabel,
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
    figma.notify(`Biblio Assets: Generated ${targets.length} variant${targets.length === 1 ? "" : "s"}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while generating variants.";
    console.error("Biblio Assets generation failed", error);
    postToUI({ type: "error", payload: { message } });
    postToUI({ type: "status", payload: { status: "idle" } });
  }
}

async function handleSetAiSignals(signals: AiSignals): Promise<void> {
  const frame = getSelectionFrame();
  if (!frame) {
    postToUI({ type: "error", payload: { message: "Select a single frame before applying AI signals." } });
    return;
  }

  try {
    const serialized = JSON.stringify(signals);
    frame.setPluginData("biblio-assets:ai-signals", serialized);
    debugFixLog("ai signals stored on selection", {
      roleCount: signals.roles?.length ?? 0,
      qaCount: signals.qa?.length ?? 0
    });
    figma.notify("AI signals applied to selection.");
    const selectionState = createSelectionState(frame);
    postToUI({ type: "selection-update", payload: selectionState });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply AI signals.";
    postToUI({ type: "error", payload: { message } });
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
    const aiSignals = readAiSignals(frame);
    const layoutAdvice = readLayoutAdvice(frame);
    return {
      selectionOk: true,
      selectionName: frame.name,
      aiSignals: aiSignals ?? undefined,
      layoutAdvice: layoutAdvice ?? undefined,
      aiConfigured: Boolean(cachedAiApiKey),
      aiStatus,
      aiError: aiStatus === "error" ? aiStatusDetail ?? "AI request failed." : undefined,
      aiUsingDefaultKey: aiUsingDefaultKey || undefined
    };
  }
  return {
    selectionOk: false,
    error: "Select a single frame to begin.",
    aiConfigured: Boolean(cachedAiApiKey),
    aiStatus,
    aiError: aiStatus === "error" ? aiStatusDetail ?? "AI request failed." : undefined,
    aiUsingDefaultKey: aiUsingDefaultKey || undefined
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
  container.paddingLeft = RUN_MARGIN;
  container.paddingRight = RUN_MARGIN;
  container.paddingTop = RUN_MARGIN;
  container.paddingBottom = RUN_MARGIN;
  container.itemSpacing = RUN_GAP;
  container.clipsContent = false;
  container.setPluginData("biblio-assets:runId", runId);

  page.appendChild(container);

  const bottom = page.children.reduce<number>((accumulator, child) => {
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

function restoreAutoLayoutSettings(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>,
  metrics: SafeAreaMetrics
): void {
  const snapshot = autoLayoutSnapshots.get(frame.id);
  if (!snapshot) {
    return;
  }

  // Only restore clipsContent as the layout adapter handles everything else
  frame.clipsContent = snapshot.clipsContent;

  // Skip if no auto layout or if adapter already set the layout
  if (frame.layoutMode === "NONE") {
    return;
  }

  // Only apply fine-tuning to spacing if not already handled by adapter
  // The adapter sets these, so we'll just do additional adjustments if needed

  const basePaddingLeft = scaleAutoLayoutMetric(snapshot.paddingLeft, metrics.scale);
  const basePaddingRight = scaleAutoLayoutMetric(snapshot.paddingRight, metrics.scale);
  const basePaddingTop = scaleAutoLayoutMetric(snapshot.paddingTop, metrics.scale);
  const basePaddingBottom = scaleAutoLayoutMetric(snapshot.paddingBottom, metrics.scale);
  const baseItemSpacing = scaleAutoLayoutMetric(snapshot.itemSpacing, metrics.scale);
  const horizontalPlan = metrics.horizontal;
  const verticalPlan = metrics.vertical;

  const round = (value: number): number => Math.round(value * 100) / 100;

  frame.paddingLeft = round(basePaddingLeft + horizontalPlan.start);
  frame.paddingRight = round(basePaddingRight + horizontalPlan.end);
  frame.paddingTop = round(basePaddingTop + verticalPlan.start);
  frame.paddingBottom = round(basePaddingBottom + verticalPlan.end);

  let nextItemSpacing = baseItemSpacing;
  if (snapshot.layoutMode === "HORIZONTAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = horizontalPlan.interior / gaps;
    nextItemSpacing = round(baseItemSpacing + perGap);
  } else if (snapshot.layoutMode === "VERTICAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = verticalPlan.interior / gaps;
    nextItemSpacing = round(baseItemSpacing + perGap);
  }
  frame.itemSpacing = nextItemSpacing;

  if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
    const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
    frame.counterAxisSpacing = round(baseCounterSpacing);
  }

  debugFixLog("auto layout fine-tuned", {
    nodeId: frame.id,
    layoutMode: frame.layoutMode
  });
}

function scaleAutoLayoutMetric(value: number, scale: number): number {
  const scaled = value * scale;
  return Math.round(scaled * 100) / 100;
}

function expandAbsoluteChildren(
  frame: FrameNode,
  horizontal: AxisExpansionPlan,
  vertical: AxisExpansionPlan,
  profile: LayoutProfile
): void {
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

  const childSnapshots = absoluteChildren
    .filter((child): child is SceneNode & { x: number; y: number; width: number; height: number } => {
      return (
        typeof (child as SceneNode & { x: unknown }).x === "number" &&
        typeof (child as SceneNode & { y: unknown }).y === "number" &&
        typeof (child as SceneNode & { width: unknown }).width === "number" &&
        typeof (child as SceneNode & { height: unknown }).height === "number"
      );
    })
    .map((child) => ({
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

  const lookup = new Map(planned.map((plan) => [plan.id, plan] as const));

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
  fontCache: Set<string>,
  rootSnapshot: AutoLayoutSnapshot | null,
  profile: LayoutProfile,
  primaryFocal: ReturnType<typeof resolvePrimaryFocalPoint> = null
): Promise<SafeAreaMetrics> {
  // Analyze the content to understand what we're working with
  const contentAnalysis = analyzeContent(frame);

  debugFixLog("Content analysis complete", {
    frameId: frame.id,
    frameName: frame.name,
    effectiveDimensions: `${contentAnalysis.effectiveWidth}×${contentAnalysis.effectiveHeight}`,
    strategy: contentAnalysis.recommendedStrategy,
    contentDensity: contentAnalysis.contentDensity,
    hasText: contentAnalysis.hasText,
    hasImages: contentAnalysis.hasImages,
    actualBounds: contentAnalysis.actualContentBounds
  });

  const contentMargins = measureContentMargins(frame);

  // Use effective dimensions from content analysis
  const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
  const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);

  const safeInsetX = target.width * safeAreaRatio;
  const safeInsetY = target.height * safeAreaRatio;

  // Calculate optimal scale using intelligent content analysis
  const scale = calculateOptimalScale(
    contentAnalysis,
    target,
    { x: safeInsetX, y: safeInsetY },
    profile
  );

  debugFixLog("Optimal scale calculated", {
    scale,
    sourceEffective: `${sourceWidth}×${sourceHeight}`,
    target: `${target.width}×${target.height}`,
    profile,
    strategy: contentAnalysis.recommendedStrategy
  });

  await scaleNodeRecursive(frame, scale, fontCache);

  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const extraWidth = Math.max(target.width - scaledWidth, 0);
  const extraHeight = Math.max(target.height - scaledHeight, 0);

  const horizontalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.left, end: contentMargins.right } : null;
  const verticalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.top, end: contentMargins.bottom } : null;

  const absoluteChildCount = countAbsoluteChildren(frame);
  const verticalSummary: AutoLayoutSummary | null = rootSnapshot
    ? {
        layoutMode: rootSnapshot.layoutMode as AutoLayoutSummary["layoutMode"],
        flowChildCount: rootSnapshot.flowChildCount
      }
    : null;
  const adoptVerticalVariant = shouldAdoptVerticalFlow(profile, verticalSummary);
  const horizontalPlan = planAutoLayoutExpansion({
    totalExtra: extraWidth,
    safeInset: safeInsetX,
    gaps: horizontalGaps,
    flowChildCount:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" ? rootSnapshot.flowChildCount : absoluteChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion:
      (rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" && rootSnapshot.flowChildCount >= 2) ||
      (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false),
    focalRatio: primaryFocal?.x ?? null
  });
  const verticalFlowChildCount =
    rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
      ? rootSnapshot.flowChildCount
      : adoptVerticalVariant
        ? rootSnapshot?.flowChildCount ?? absoluteChildCount
        : absoluteChildCount;
  const verticalAllowInterior =
    adoptVerticalVariant ||
    (rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" && rootSnapshot.flowChildCount >= 2) ||
    (rootSnapshot?.layoutWrap === "WRAP" && rootSnapshot.flowChildCount >= 2) ||
    (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false);
  const verticalPlan = planAutoLayoutExpansion({
    totalExtra: extraHeight,
    safeInset: safeInsetY,
    gaps: verticalGaps,
    flowChildCount: verticalFlowChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion: verticalAllowInterior,
    focalRatio: primaryFocal?.y ?? null
  });

  const offsetX = horizontalPlan.start;
  const offsetY = verticalPlan.start;

  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY);

  if (shouldExpandAbsoluteChildren(rootSnapshot?.layoutMode, adoptVerticalVariant)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile);
  }

  frame.setPluginData(
    "biblio-assets:safeArea",
    JSON.stringify({ insetX: safeInsetX, insetY: safeInsetY, width: target.width, height: target.height })
  );
  if (primaryFocal) {
    frame.setPluginData("biblio-assets:focalPoint", JSON.stringify(primaryFocal));
  }

  debugFixLog("axis expansion planned", {
    nodeId: frame.id,
    layoutMode: rootSnapshot?.layoutMode ?? "NONE",
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

  if ("cornerRadius" in node) {
    const withCornerRadius = node as SceneNode & { cornerRadius?: number | typeof figma.mixed };
    if (withCornerRadius.cornerRadius !== figma.mixed && typeof withCornerRadius.cornerRadius === "number") {
      withCornerRadius.cornerRadius *= scale;
    }
  }
  const rectangleCorners = node as SceneNode & {
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
  };
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
  if ((clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") && typeof clone.radius === "number") {
    clone.radius *= scale;
    clone.offset = { x: clone.offset.x * scale, y: clone.offset.y * scale };
  }
  if ((clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") && typeof clone.radius === "number") {
    clone.radius *= scale;
  }
  return clone as Effect;
}

function scalePaint(paint: Paint, scale: number): Paint {
  const clone = cloneValue(paint);
  if ((clone.type === "IMAGE" || clone.type === "VIDEO") && clone.scaleMode === "TILE") {
    clone.scalingFactor = (clone.scalingFactor ?? 1) * scale;
  }

  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR" ||
    clone.type === "GRADIENT_DIAMOND"
  ) {
    const gradientClone = clone as typeof clone & { gradientHandlePositions?: Vector[] };
    if (Array.isArray(gradientClone.gradientHandlePositions)) {
      gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }

    gradientClone.gradientTransform = gradientClone.gradientTransform.map((row) =>
      row.map((value, index) => (index === 2 ? value : value * scale))
    ) as Transform;
  }

  return clone as Paint;
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

function countAbsoluteChildren(frame: FrameNode): number {
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

async function lockOverlays(overlays: readonly FrameNode[]): Promise<void> {
  if (overlays.length === 0) {
    return;
  }

  const flushAsync = (figma as { flushAsync?: (() => Promise<void>) | undefined }).flushAsync;
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

function layoutVariants(container: FrameNode, variants: readonly FrameNode[]): void {
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

/**
 * Re-parents generated variant frames onto the staging page so each target sits
 * in its own top-level frame, then removes the temporary container shell.
 */
function promoteVariantsToPage(page: PageNode, container: FrameNode, variants: readonly FrameNode[]): void {
  const parent = container.parent;
  if (!parent || parent.type !== "PAGE") {
    debugFixLog("skipped promotion because container parent is not a page", {
      parentType: parent?.type ?? "none"
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

function exposeRun(page: PageNode, variants: readonly FrameNode[]): void {
  if (variants.length === 0) {
    return;
  }
  figma.currentPage = page;
  figma.viewport.scrollAndZoomIntoView([...variants]);
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

  const aiSignals = readAiSignals(frame);
  if (aiSignals) {
    const aiWarnings = deriveWarningsFromAiSignals(aiSignals);
    if (aiWarnings.length > 0) {
      warnings.push(...aiWarnings);
    }
  }

  return warnings;
}

type ContentMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function measureContentMargins(frame: FrameNode): ContentMargins | null {
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

function cloneValue<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}

async function ensureAiKeyLoaded(): Promise<void> {
  if (aiKeyLoaded) {
    return;
  }
  const stored = await figma.clientStorage.getAsync(AI_KEY_STORAGE_KEY);
  const trimmed = typeof stored === "string" ? stored.trim() : "";
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
}

async function handleSetApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    await figma.clientStorage.deleteAsync(AI_KEY_STORAGE_KEY);
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

async function handleRefreshAiRequest(): Promise<void> {
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

async function maybeRequestAiForFrame(frame: FrameNode, options?: { readonly force?: boolean }): Promise<void> {
  if (!cachedAiApiKey) {
    aiStatus = "missing-key";
    aiStatusDetail = null;
    const current = getSelectionFrame();
    postToUI({ type: "selection-update", payload: createSelectionState(current) });
    return;
  }

  const existingSignals = readAiSignals(frame);
  const existingAdvice = readLayoutAdvice(frame);
  if (!options?.force && existingSignals && existingAdvice) {
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
    const result = await requestAiInsights(frame, cachedAiApiKey);
    if (!result) {
      encounteredError = true;
      aiStatus = "error";
      aiStatusDetail = "AI response missing structured layout data.";
      return;
    }
    if (result.signals) {
      frame.setPluginData("biblio-assets:ai-signals", JSON.stringify(result.signals));
    } else {
      frame.setPluginData("biblio-assets:ai-signals", "");
    }
    if (result.layoutAdvice) {
      frame.setPluginData("biblio-assets:layout-advice", JSON.stringify(result.layoutAdvice));
    } else {
      frame.setPluginData("biblio-assets:layout-advice", "");
    }
    debugFixLog("ai insights stored on frame", {
      frameId: frame.id,
      roles: result.signals?.roles.length ?? 0,
      layoutEntries: result.layoutAdvice?.entries.length ?? 0
    });
  } catch (error) {
    encounteredError = true;
    aiStatus = "error";
    aiStatusDetail = error instanceof Error ? error.message : String(error);
    console.error("Biblio Assets AI request failed", error);
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

async function handleSetLayoutAdvice(advice: LayoutAdvice): Promise<void> {
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
    frame.setPluginData("biblio-assets:layout-advice", serialized);
    debugFixLog("layout advice stored on selection", {
      entries: normalized.entries?.length ?? 0
    });
    figma.notify("Layout advice applied to selection.");
    const selectionState = createSelectionState(frame);
    postToUI({ type: "selection-update", payload: selectionState });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply layout advice.";
    postToUI({ type: "error", payload: { message } });
  }
}
