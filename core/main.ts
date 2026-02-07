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

console.log("[main] Plugin starting...");

// Show the plugin UI
figma.showUI(getUIHtml(), {
  width: 280,
  height: 400,
  themeColors: true,
});
console.log("[main] UI shown");

// Send initial state to UI
notifySelectionChange();
notifyApiKeyStatus();

// Listen for selection changes
figma.on("selectionchange", () => {
  console.log("[main] Selection changed");
  notifySelectionChange();
});

// Handle messages from UI
figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  console.log("[main] Received UI message:", msg.type);

  switch (msg.type) {
    case "GENERATE_TIKTOK":
      await handleGenerate();
      break;

    case "SET_API_KEY":
      console.log("[main] Setting API key (length:", msg.apiKey.length, ")");
      setApiKey(msg.apiKey);
      notifyApiKeyStatus();
      break;

    case "CANCEL":
      console.log("[main] Cancel requested");
      break;
  }
};

/**
 * Send selection status to UI.
 */
function notifySelectionChange(): void {
  const frame = getSelectedFrame();
  console.log("[main] notifySelectionChange - valid:", frame !== null, "name:", frame?.name);
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
  const hasKey = hasApiKey();
  console.log("[main] notifyApiKeyStatus - hasKey:", hasKey);
  sendToUI({
    type: "API_KEY_STATUS",
    hasKey,
  });
}

/**
 * Handle the generate TikTok variant request.
 */
async function handleGenerate(): Promise<void> {
  console.log("[main] handleGenerate started");

  const frame = getSelectedFrame();

  if (!frame) {
    console.log("[main] ERROR: No valid frame selected");
    sendToUI({
      type: "GENERATION_ERROR",
      error: "Please select a single frame",
    });
    return;
  }

  if (!hasApiKey()) {
    console.log("[main] ERROR: No API key configured");
    sendToUI({
      type: "GENERATION_ERROR",
      error: "Please configure your OpenAI API key",
    });
    return;
  }

  try {
    sendToUI({ type: "GENERATION_STARTED" });
    console.log("[main] Generation started for frame:", frame.name, "id:", frame.id);
    console.log("[main] Frame dimensions:", frame.width, "x", frame.height);

    // Step 1: Export frame as image
    console.log("[main] Step 1: Exporting frame as image...");
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Exporting frame...",
      detail: "Creating image for AI analysis",
    });
    const imageBase64 = await exportFrameAsBase64(frame);
    console.log("[main] Image exported, base64 length:", imageBase64.length);

    // Step 2: Build node tree
    console.log("[main] Step 2: Building node tree...");
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Analyzing structure...",
      detail: "Building node tree",
    });
    const nodeTree = buildNodeTree(frame);
    console.log("[main] Node tree built, root:", nodeTree.name, "children:", nodeTree.children?.length ?? 0);

    // Step 3: Call AI to get layout spec
    console.log("[main] Step 3: Calling AI for layout spec...");
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
    console.log("[main] Layout spec received, nodes:", layoutSpec.nodes.length);
    console.log("[main] Layout spec reasoning:", layoutSpec.reasoning);

    // Step 4: Apply the layout spec
    console.log("[main] Step 4: Applying layout spec...");
    sendToUI({
      type: "GENERATION_PROGRESS",
      stage: "Creating variant...",
      detail: "Applying layout to TikTok format",
    });
    const variant = await applyLayoutSpec(frame, layoutSpec);
    console.log("[main] Variant created:", variant.name, "id:", variant.id);

    // Select the new variant
    figma.currentPage.selection = [variant];
    figma.viewport.scrollAndZoomIntoView([variant]);
    console.log("[main] Variant selected and scrolled into view");

    sendToUI({
      type: "GENERATION_COMPLETE",
      variantId: variant.id,
      variantName: variant.name,
    });
    console.log("[main] Generation complete!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[main] ERROR:", errorMessage);
    console.error("[main] Full error:", error);
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
  console.log("[main] Sending to UI:", message.type);
  figma.ui.postMessage(message);
}
