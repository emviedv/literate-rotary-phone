import { VARIANT_TARGETS } from "../types/targets.js";
import type { ToCoreMessage, ToUIMessage } from "../types/messages.js";
import { UI_TEMPLATE } from "../ui/template.js";
import { trackEvent } from "./telemetry.js";
import { debugFixLog, setLogHandler, isDebugFixEnabled } from "./debug.js";
import { ensureAiKeyLoaded, getCachedAiApiKey, persistApiKey } from "./ai-state.js";
import { createSelectionState, getSelectionFrame } from "./selection.js";

import { executeDesignFlow, validateSourceFrame } from "./design-orchestration.js";
import type { DesignStatus } from "../types/design-types.js";

declare const __BUILD_TIMESTAMP__: string;

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
      // Generate variants feature removed - use Design for TikTok instead
      postToUI({ type: "error", payload: { message: "Generate variants feature has been removed. Use 'Design for TikTok' instead." } });
      break;
    case "set-ai-signals":
      // AI signals feature removed - use Design for TikTok instead
      postToUI({ type: "error", payload: { message: "AI signals feature has been removed." } });
      break;
    case "set-layout-advice":
      // Layout advice feature removed - use Design for TikTok instead
      postToUI({ type: "error", payload: { message: "Layout advice feature has been removed." } });
      break;
    case "set-api-key":
      await handleSetApiKey(rawMessage.payload.key);
      break;
    case "refresh-ai":
      // AI analysis feature removed - use Design for TikTok instead
      postToUI({ type: "error", payload: { message: "AI analysis feature has been removed. Use 'Design for TikTok' instead." } });
      break;
    case "design-for-tiktok":
      await handleDesignForTikTok();
      break;
    default:
      debugFixLog("Unhandled message", { message: rawMessage });
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

  const payload = {
    ...selectionState,
    targets: VARIANT_TARGETS,
    lastRun: undefined, // Generate feature removed
    debugEnabled: isDebugFixEnabled(),
    buildTimestamp: typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : "unknown"
  };

  debugFixLog("initializing UI with targets", {
    targetIds: VARIANT_TARGETS.map((target) => target.id),
    targetCount: VARIANT_TARGETS.length
  });

  postToUI({ type: "init", payload });
}

// handleGenerateRequest removed - generate variants feature disabled
// Use Design for TikTok flow instead

function postToUI(message: ToUIMessage): void {
  figma.ui.postMessage(message);
}

setLogHandler((message: string) => {
  postToUI({ type: "debug-log", payload: { message } });
});


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

async function handleDesignForTikTok(): Promise<void> {
  debugFixLog("handleDesignForTikTok invoked");

  await ensureAiKeyLoaded();
  const frame = getSelectionFrame();

  if (!frame) {
    postToUI({ type: "design-error", payload: { message: "Select a single frame to design for TikTok." } });
    return;
  }

  const apiKey = getCachedAiApiKey();
  if (!apiKey) {
    postToUI({ type: "design-error", payload: { message: "AI key is not configured. Contact an admin." } });
    return;
  }

  // Validate the source frame
  const validation = validateSourceFrame(frame);
  if (!validation.valid) {
    postToUI({ type: "design-error", payload: { message: validation.error || "Invalid source frame." } });
    return;
  }

  // Send initial status
  postToUI({
    type: "design-status",
    payload: { stage: "analyzing", message: "Starting TikTok design..." }
  });

  try {
    trackEvent("DESIGN_FOR_TIKTOK_STARTED", {
      frameId: frame.id,
      frameName: frame.name,
      frameDimensions: `${frame.width}x${frame.height}`
    });

    const result = await executeDesignFlow(frame, {
      apiKey,
      runEvaluation: true, // Enable Stage 3 evaluation to catch positioning issues
      onStatus: (status: DesignStatus) => {
        postToUI({
          type: "design-status",
          payload: { stage: status.stage as "analyzing" | "planning" | "specifying" | "executing" | "evaluating", message: status.message }
        });
      }
    });

    if (!result.success) {
      postToUI({ type: "design-error", payload: { message: result.error || "Design generation failed." } });
      trackEvent("DESIGN_FOR_TIKTOK_FAILED", {
        frameId: frame.id,
        error: result.error
      });
      return;
    }

    if (!result.variant || !result.page) {
      postToUI({ type: "design-error", payload: { message: "Failed to create variant." } });
      return;
    }

    // Send completion message
    postToUI({
      type: "design-complete",
      payload: {
        pageId: result.page.id,
        nodeId: result.variant.id,
        variantName: result.variant.name
      }
    });

    figma.notify(`TikTok design created: ${result.variant.name}`);

    trackEvent("DESIGN_FOR_TIKTOK_COMPLETED", {
      frameId: frame.id,
      variantId: result.variant.id,
      totalDurationMs: result.totalDurationMs,
      stage1DurationMs: result.stageDurations?.stage1,
      stage2DurationMs: result.stageDurations?.stage2,
      executionDurationMs: result.stageDurations?.execution,
      confidence: result.specs?.confidence
    });

    debugFixLog("Design for TikTok complete", {
      variantId: result.variant.id,
      pageId: result.page.id,
      totalDurationMs: result.totalDurationMs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error during design generation.";
    debugFixLog("Design for TikTok failed", { error: String(error) });
    postToUI({ type: "design-error", payload: { message } });
    trackEvent("DESIGN_FOR_TIKTOK_FAILED", {
      frameId: frame.id,
      error: message
    });
  }
}

