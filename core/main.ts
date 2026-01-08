import { VARIANT_TARGETS, getTargetById, type VariantTarget } from "../types/targets.js";
import type { ToCoreMessage, ToUIMessage, VariantResult } from "../types/messages.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import type { AiSignals } from "../types/ai-signals.js";
import { UI_TEMPLATE } from "../ui/template.js";
import { configureQaOverlay, createQaOverlay } from "./qa-overlay.js";
import { resolveLayoutProfile } from "./layout-profile.js";
import { createLayoutAdaptationPlan, applyLayoutAdaptation, adaptNestedFrames } from "./auto-layout-adapter.js";
import { readAiSignals, resolvePrimaryFocalPoint } from "./ai-signals.js";
import { autoSelectLayoutPattern, normalizeLayoutAdvice, readLayoutAdvice, resolvePatternLabel } from "./layout-advice.js";
import { requestAiInsights } from "./ai-service.js";
import { trackEvent } from "./telemetry.js";
import { debugFixLog, setLogHandler, isDebugFixEnabled } from "./debug.js";
import { ensureAiKeyLoaded, getAiState, getCachedAiApiKey, persistApiKey, resetAiStatus, setAiStatus } from "./ai-state.js";
import { createSelectionState, getSelectionFrame } from "./selection.js";
import { ensureStagingPage, createRunContainer, exposeRun, layoutVariants, finalizeOverlays, promoteVariantsToPage } from "./run-ops.js";
import { readLastRun, writeLastRun } from "./run-store.js";
import {
  AI_SIGNALS_KEY,
  LAYOUT_ADVICE_KEY,
  LAYOUT_PATTERN_KEY,
  PLUGIN_NAME,
  RUN_ID_KEY,
  TARGET_ID_KEY
} from "./plugin-constants.js";
import { collectWarnings } from "./warnings.js";
import {
  prepareCloneForLayout,
  restoreAutoLayoutSettings,
  scaleNodeTree,
  type AutoLayoutSnapshot
} from "./variant-scaling.js";
import { captureLayoutSnapshot } from "./layout-snapshot.js";

export { collectWarnings, combineChildBounds } from "./warnings.js";

declare const __BUILD_TIMESTAMP__: string;

const MAX_SAFE_AREA_RATIO = 0.25;
const MIN_PATTERN_CONFIDENCE = 0.65;

let aiRequestToken = 0;

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
    lastRun: lastRunSummary ?? undefined,
    debugEnabled: isDebugFixEnabled(),
    buildTimestamp: typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : "unknown"
  };

  debugFixLog("initializing UI with targets", {
    targetIds: VARIANT_TARGETS.map((target) => target.id),
    targetCount: VARIANT_TARGETS.length
  });

  postToUI({ type: "init", payload });
}

async function handleGenerateRequest(
  targetIds: readonly string[],
  rawSafeAreaRatio: number,
  layoutPatterns: Record<string, string | undefined>
): Promise<void> {
  debugFixLog("`handleGenerateRequest` entered", { targetIds, rawSafeAreaRatio });
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
      variantNode.setPluginData(TARGET_ID_KEY, target.id);
      variantNode.setPluginData(RUN_ID_KEY, runId);

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
            const adviceEntry = layoutAdvice?.entries.find((entry) => entry.targetId === target.id);
            const layoutAdaptationPlan = createLayoutAdaptationPlan(
              variantNode,
              target,
              layoutProfile,
              safeAreaMetrics.scale,
              {
                sourceLayoutMode:
                  rootSnapshot?.layoutMode && rootSnapshot.layoutMode !== "GRID" ? rootSnapshot.layoutMode : "NONE",
                sourceSize:
                  rootSnapshot && Number.isFinite(rootSnapshot.width) && Number.isFinite(rootSnapshot.height)
                    ? { width: rootSnapshot.width, height: rootSnapshot.height }
                    : undefined,
                sourceFlowChildCount: rootSnapshot?.flowChildCount ?? undefined,
                sourceItemSpacing: rootSnapshot?.itemSpacing ?? null,
                adoptVerticalVariant: safeAreaMetrics.adoptVerticalVariant,
                layoutAdvice: adviceEntry,
                safeAreaRatio
              }
            );
      
            debugFixLog("Layout adaptation plan created", {
              targetId: target.id,
              originalMode: rootSnapshot?.layoutMode ?? "NONE",
              newMode: layoutAdaptationPlan.layoutMode,
              profile: layoutProfile
            });
      
                  // Apply the adaptation plan for intelligent layout restructuring
                  applyLayoutAdaptation(variantNode, layoutAdaptationPlan);
                  
                  // Recursively adapt nested structural containers
                  adaptNestedFrames(variantNode, target, layoutProfile, safeAreaMetrics.scale);
            
                  // Then apply any additional auto layout settings that weren't covered
      restoreAutoLayoutSettings(variantNode, autoLayoutSnapshots, safeAreaMetrics);
            // Use target dimensions for the overlay to ensure it matches the viewport,
            // even if the variant content has expanded (e.g. scrolling vertical).
            const overlay = createQaOverlay(target, safeAreaRatio, target.width, target.height);
            variantNode.appendChild(overlay);
            
            // TikTok vertical uses special constraints (pins to top for scrolling content)
            // All other targets use default STRETCH/STRETCH
            const overlayConstraints: FrameNode["constraints"] | undefined =
              target.id === "tiktok-vertical"
                ? { horizontal: "STRETCH", vertical: "MIN" }
                : undefined;

            const overlayConfig = configureQaOverlay(overlay, {
              parentLayoutMode: variantNode.layoutMode,
              constraints: overlayConstraints
            });
            overlaysToLock.push(overlay);
            debugFixLog("qa overlay configured", {
              overlayId: overlay.id,
              variantId: variantNode.id,
              positioningUpdated: overlayConfig.positioningUpdated,
              layoutPositioning: "layoutPositioning" in overlay ? overlay.layoutPositioning : undefined,
              constraints: "constraints" in overlay ? overlay.constraints : undefined,
              locked: overlay.locked,
              willLockAfterFlush: false
            });
      
            const patternSelection = autoSelectLayoutPattern(layoutAdvice, target.id, MIN_PATTERN_CONFIDENCE);
            const userSelection = layoutPatterns[target.id];
            
            const chosenPatternId =
              userSelection ??
              (patternSelection && !patternSelection.fallback
                ? patternSelection.patternId ?? adviceEntry?.selectedId
                : undefined);      const layoutFallback = !userSelection && (patternSelection?.fallback ?? false);
      const patternConfidence =
        chosenPatternId && patternSelection?.patternId === chosenPatternId && !layoutFallback
          ? patternSelection.confidence
          : undefined;
      const layoutSnapshot = captureLayoutSnapshot(variantNode);

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

      debugFixLog("layout output ready", {
        targetId: target.id,
        variantId: variantNode.id,
        dimensions: `${variantNode.width}x${variantNode.height}`,
        profile: layoutProfile,
        safeAreaScale: safeAreaMetrics.scale,
        adoptVerticalVariant: safeAreaMetrics.adoptVerticalVariant,
        patternId: chosenPatternId ?? null,
        patternConfidence,
        fallback: layoutFallback,
        layout: layoutSnapshot
      });

      const warnings = collectWarnings(variantNode, target, safeAreaRatio);
      if (layoutFallback) {
        warnings.push({
          code: "AI_LAYOUT_FALLBACK",
          severity: "info",
          message: "AI confidence was low, so a deterministic layout was used."
        });
      }
      
      warnings.forEach(w => {
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
        layoutPatternLabel:
          resolvePatternLabel(layoutAdvice, target.id, chosenPatternId) ?? patternSelection?.patternLabel,
        layoutPatternConfidence: patternConfidence,
        layoutPatternFallback: layoutFallback
      });
    }

    await finalizeOverlays(overlaysToLock);
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

async function handleSetAiSignals(signals: AiSignals): Promise<void> {
  const frame = getSelectionFrame();
  if (!frame) {
    postToUI({ type: "error", payload: { message: "Select a single frame before applying AI signals." } });
    return;
  }

  try {
    const serialized = JSON.stringify(signals);
    frame.setPluginData(AI_SIGNALS_KEY, serialized);
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

function postToUI(message: ToUIMessage): void {
  figma.ui.postMessage(message);
}

setLogHandler((message: string) => {
  postToUI({ type: "debug-log", payload: { message } });
});

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

async function handleSetApiKey(key: string): Promise<void> {
  const snapshot = await persistApiKey(key);
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    figma.notify(snapshot.aiUsingDefaultKey ? "OpenAI key cleared. Using workspace default key." : "OpenAI key cleared.");
  } else {
    figma.notify(
      snapshot.aiUsingDefaultKey ? "OpenAI key saved. Matching workspace default key." : "OpenAI key saved locally."
    );
  }
  const frame = getSelectionFrame();
  const selectionState = createSelectionState(frame);
  postToUI({ type: "selection-update", payload: selectionState });
}

async function handleRefreshAiRequest(): Promise<void> {
  await ensureAiKeyLoaded();
  const frame = getSelectionFrame();
  if (!frame) {
    figma.notify("Select a single frame to analyze with AI.");
    postToUI({ type: "selection-update", payload: createSelectionState(null) });
    return;
  }
  if (!getCachedAiApiKey()) {
    setAiStatus("missing-key", null);
    figma.notify("AI key is missing in this build. Contact an admin.");
    postToUI({ type: "selection-update", payload: createSelectionState(frame) });
    return;
  }
  await maybeRequestAiForFrame(frame, { force: true });
}

function resolveLiveFrame(frameId: string): FrameNode | null {
  try {
    const node = figma.getNodeById(frameId);
    if (node && node.type === "FRAME" && !(node as FrameNode).removed) {
      return node as FrameNode;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugFixLog("failed to resolve frame after ai request", {
      frameId,
      errorMessage: message
    });
  }
  return null;
}

async function maybeRequestAiForFrame(frame: FrameNode, options?: { readonly force?: boolean }): Promise<void> {
  const cachedKey = getCachedAiApiKey();
  if (!cachedKey) {
    setAiStatus("missing-key", null);
    const current = getSelectionFrame();
    postToUI({ type: "selection-update", payload: createSelectionState(current) });
    return;
  }

  if (frame.removed) {
    debugFixLog("skipping ai request because frame was removed before fetch", { frameId: frame.id });
    return;
  }

  const existingSignals = readAiSignals(frame);
  const existingAdvice = readLayoutAdvice(frame);
  if (!options?.force && existingSignals && existingAdvice) {
    return;
  }

  const requestId = ++aiRequestToken;
  setAiStatus("fetching", null);
  const currentSelection = getSelectionFrame();
  if (currentSelection && currentSelection.id === frame.id) {
    postToUI({ type: "selection-update", payload: createSelectionState(frame) });
  }

  let encounteredError = false;

  try {
    debugFixLog("requesting ai insights", { frameId: frame.id, nodeName: frame.name });
    trackEvent("AI_ANALYSIS_REQUESTED", { frameId: frame.id, requestId });
    const result = await requestAiInsights(frame, cachedKey);
    if (!result) {
      encounteredError = true;
      setAiStatus("error", "AI response missing structured layout data.");
      trackEvent("AI_ANALYSIS_FAILED", { frameId: frame.id, reason: getAiState().aiStatusDetail });
      return;
    }

    const targetFrame = resolveLiveFrame(frame.id);
    if (!targetFrame) {
      debugFixLog("ai insights skipped because frame no longer exists", { frameId: frame.id });
      return;
    }

    if (result.signals) {
      targetFrame.setPluginData(AI_SIGNALS_KEY, JSON.stringify(result.signals));
    } else {
      targetFrame.setPluginData(AI_SIGNALS_KEY, "");
    }
    if (result.layoutAdvice) {
      targetFrame.setPluginData(LAYOUT_ADVICE_KEY, JSON.stringify(result.layoutAdvice));
    } else {
      targetFrame.setPluginData(LAYOUT_ADVICE_KEY, "");
    }
    debugFixLog("ai insights stored on frame", {
      frameId: targetFrame.id,
      roles: result.signals?.roles.length ?? 0,
      layoutEntries: result.layoutAdvice?.entries.length ?? 0
    });
    trackEvent("AI_ANALYSIS_COMPLETED", {
      frameId: targetFrame.id,
      roleCount: result.signals?.roles.length ?? 0,
      qaCount: result.signals?.qa.length ?? 0,
      layoutEntries: result.layoutAdvice?.entries.length ?? 0
    });
  } catch (error) {
    encounteredError = true;
    const detail = error instanceof Error ? error.message : String(error);
    setAiStatus("error", detail);
    console.error(`${PLUGIN_NAME} AI request failed`, error);
    trackEvent("AI_ANALYSIS_FAILED", { frameId: frame.id, reason: detail });
  } finally {
    if (!encounteredError) {
      resetAiStatus();
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
    frame.setPluginData(LAYOUT_ADVICE_KEY, serialized);
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
