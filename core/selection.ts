import type { SelectionState } from "../types/messages.js";
import { getAiState } from "./ai-state.js";

declare const figma: PluginAPI;

export function getSelectionFrame(): FrameNode | null {
  if (figma.currentPage.selection.length !== 1) {
    return null;
  }
  const [node] = figma.currentPage.selection;
  if (node.type !== "FRAME") {
    return null;
  }
  return node;
}

export function createSelectionState(frame: FrameNode | null): SelectionState {
  const { cachedAiApiKey, aiStatus, aiStatusDetail, aiUsingDefaultKey } = getAiState();

  if (frame) {
    return {
      selectionOk: true,
      selectionName: frame.name,
      selectionWidth: frame.width,
      selectionHeight: frame.height,
      // AI signals and layout advice removed - use Design for TikTok
      aiSignals: undefined,
      layoutAdvice: undefined,
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
