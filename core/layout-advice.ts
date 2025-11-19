import type { LayoutAdvice } from "../types/layout-advice.js";
import { debugFixLog } from "./debug.js";

type PluginDataNode = Pick<FrameNode, "getPluginData">;

const LAYOUT_KEY = "biblio-assets:layout-advice";

export function readLayoutAdvice(node: PluginDataNode, key: string = LAYOUT_KEY): LayoutAdvice | null {
  let raw: string | null = null;
  try {
    raw = node.getPluginData(key);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LayoutAdvice;
    debugFixLog("layout advice parsed", {
      entries: parsed?.entries?.length ?? 0
    });
    return parsed;
  } catch (error) {
    debugFixLog("layout advice parse failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export function resolvePatternLabel(
  advice: LayoutAdvice | null,
  targetId: string,
  patternId: string | undefined
): string | undefined {
  if (!advice || !patternId) {
    return undefined;
  }
  const entry = advice.entries.find((item) => item.targetId === targetId);
  const match = entry?.options.find((option) => option.id === patternId);
  return match?.label;
}
