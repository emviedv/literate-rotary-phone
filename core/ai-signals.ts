import type { VariantWarning } from "../types/messages.js";
import type { AiSignals, AiQaSignal } from "../types/ai-signals.js";
import { debugFixLog } from "./debug.js";

const MIN_CONFIDENCE = 0.35;

type PluginDataReader = Pick<FrameNode, "getPluginData">;

export function readAiSignals(node: PluginDataReader, key: string = "biblio-assets:ai-signals"): AiSignals | null {
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
    const parsed = JSON.parse(raw) as AiSignals;
    debugFixLog("ai signals parsed", { hasRoles: parsed?.roles?.length > 0, qa: parsed?.qa?.length ?? 0 });
    return parsed;
  } catch (error) {
    debugFixLog("ai signals parse failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export function deriveWarningsFromAiSignals(signals: AiSignals | null | undefined): VariantWarning[] {
  if (!signals || !signals.qa?.length) {
    return [];
  }

  const warnings: VariantWarning[] = [];

  for (const qa of signals.qa) {
    if (qa.confidence !== undefined && qa.confidence < MIN_CONFIDENCE) {
      continue;
    }

    const warning = mapQaToWarning(qa);
    if (warning) {
      warnings.push(warning);
    }
  }

  debugFixLog("ai warnings derived", { count: warnings.length });
  return warnings;
}

function mapQaToWarning(qa: AiQaSignal): VariantWarning | null {
  const severity: VariantWarning["severity"] = qa.severity === "info" ? "info" : "warn";
  switch (qa.code) {
    case "LOW_CONTRAST":
      return {
        code: "AI_LOW_CONTRAST",
        severity,
        message: qa.message ?? "AI flagged low contrast between foreground and background."
      };
    case "LOGO_TOO_SMALL":
      return {
        code: "AI_LOGO_VISIBILITY",
        severity,
        message: qa.message ?? "Logo may be too small or obscured."
      };
    case "TEXT_OVERLAP":
      return {
        code: "AI_TEXT_OVERLAP",
        severity,
        message: qa.message ?? "Text elements may be overlapping or crowded."
      };
    case "UNCERTAIN_ROLES":
      return {
        code: "AI_ROLE_UNCERTAIN",
        severity,
        message: qa.message ?? "AI could not confidently identify some elements."
      };
    case "SALIENCE_MISALIGNED":
      return {
        code: "AI_SALIENCE_MISALIGNED",
        severity,
        message: qa.message ?? "Key visual focus may be misaligned with the frame."
      };
    case "SAFE_AREA_RISK":
      return {
        code: "AI_SAFE_AREA_RISK",
        severity,
        message: qa.message ?? "Important content may sit near or outside the safe area."
      };
    case "GENERIC":
      return {
        code: "AI_GENERIC",
        severity,
        message: qa.message ?? "AI surfaced a potential composition issue."
      };
    default:
      return null;
  }
}
