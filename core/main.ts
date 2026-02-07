/**
 * ScaleResizer Plugin - Main Entry Point
 *
 * A Figma plugin that transforms marketing frames into TikTok vertical format
 * using AI-driven layout analysis.
 *
 * Flow:
 * 1. User selects a frame → Plugin exports image + node tree
 * 2. Single AI call → Returns layout spec for each node
 * 3. Plugin creates 1080×1920 variant → Applies spec using Figma's native layout
 */

import type { UIToPluginMessage, PluginToUIMessage } from "../types/messages";
import { getUIHtml } from "../ui/template";
import { getSelectedFrame, buildNodeTree } from "./selection";
import { exportFrameAsBase64 } from "./image-export";
import { generateLayoutSpec, setApiKey, hasApiKey } from "./ai-service";
import { applyLayoutSpec } from "./spec-applicator";

// Show the plugin UI
figma.showUI(getUIHtml(), {
  width: 280,
  height: 400,
  themeColors: true,
});

// Send initial state to UI
notifySelectionChange();
notifyApiKeyStatus();

// Listen for selection changes
figma.on("selectionchange", () => {
  notifySelectionChange();
});

// Handle messages from UI
figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  switch (msg.type) {
    case "GENERATE_TIKTOK":
      await handleGenerate();
      break;

    case "SET_API_KEY":
      setApiKey(msg.apiKey);
      notifyApiKeyStatus();
      break;

    case "CANCEL":
      // Future: implement cancellation
      break;
  }
};

/**
 * Send selection status to UI.
 */
function notifySelectionChange(): void {
  const frame = getSelectedFrame();
  sendToUI({
    type: "SELECTION_CHANGED",
    hasValidSelection: frame !== null,
    frameName: frame?.name,
  });
}

/**
 * Send API key status to UI.
 */
function notifyApiKeyStatus(): void {
  sendToUI({
    type: "API_KEY_STATUS",
    hasKey: hasApiKey(),
  });
}

/**
 * Handle the generate TikTok variant request.
 */
async function handleGenerate(): Promise<void> {
  const frame = getSelectedFrame();

  if (!frame) {
    sendToUI({
      type: "GENERATION_ERROR",
      error: "Please select a single frame",
    });
    return;
  }

  if (!hasApiKey()) {
    sendToUI({
      type: "GENERATION_ERROR",
      error: "Please configure your OpenAI API key",
    });
    return;
  }

  try {
    sendToUI({ type: "GENERATION_STARTED" });

    // Step 1: Export frame as image
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Exporting frame...",
      detail: "Creating image for AI analysis",
    });
    const imageBase64 = await exportFrameAsBase64(frame);

    // Step 2: Build node tree
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Analyzing structure...",
      detail: "Building node tree",
    });
    const nodeTree = buildNodeTree(frame);

    // Step 3: Call AI to get layout spec
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "AI analyzing...",
      detail: "Generating TikTok layout specification",
    });
    const layoutSpec = await generateLayoutSpec(
      imageBase64,
      nodeTree,
      frame.width,
      frame.height
    );

    // Step 4: Apply the layout spec
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Creating variant...",
      detail: "Applying layout to TikTok format",
    });
    const variant = await applyLayoutSpec(frame, layoutSpec);

    // Select the new variant
    figma.currentPage.selection = [variant];
    figma.viewport.scrollAndZoomIntoView([variant]);

    sendToUI({
      type: "GENERATION_COMPLETE",
      variantId: variant.id,
      variantName: variant.name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendToUI({
      type: "GENERATION_ERROR",
      error: errorMessage,
    });
  }
}

/**
 * Type-safe wrapper for sending messages to UI.
 */
function sendToUI(message: PluginToUIMessage): void {
  figma.ui.postMessage(message);
}
