import type { LastRunSummary } from "../types/messages.js";
import { LAST_RUN_KEY, LEGACY_LAST_RUN_KEY, PLUGIN_NAME } from "./plugin-constants.js";

declare const figma: PluginAPI;

export function writeLastRun(summary: LastRunSummary): void {
  const encoded = JSON.stringify(summary);
  figma.root.setPluginData(LAST_RUN_KEY, encoded);
}

export function readLastRun(): LastRunSummary | null {
  const raw = figma.root.getPluginData(LAST_RUN_KEY) || figma.root.getPluginData(LEGACY_LAST_RUN_KEY);
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
    console.warn(`Failed to parse ${PLUGIN_NAME} last run plugin data`, error);
    return null;
  }
}
