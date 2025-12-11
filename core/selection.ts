import type { SelectionState } from "../types/messages.js";
import { readAiSignals } from "./ai-signals.js";
import { getAiState } from "./ai-state.js";
import { readLayoutAdvice } from "./layout-advice.js";

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
    const aiSignals = readAiSignals(frame);
    const layoutAdvice = readLayoutAdvice(frame);
    return {
      selectionOk: true,
      selectionName: frame.name,
      selectionWidth: frame.width,
      selectionHeight: frame.height,
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
