import type { VariantWarning } from "../types/messages.js";
import type { AiSignals, AiQaSignal } from "../types/ai-signals.js";
import { debugFixLog } from "./debug.js";
import { AI_SIGNALS_KEY, LEGACY_AI_SIGNALS_KEY } from "./plugin-constants.js";

const MIN_CONFIDENCE = 0.35;
const MIN_FOCAL_CONFIDENCE = 0.55;

type PluginDataReader = Pick<FrameNode, "getPluginData">;

export function readAiSignals(node: PluginDataReader, key: string = AI_SIGNALS_KEY): AiSignals | null {
  const candidateKeys = key === AI_SIGNALS_KEY ? [AI_SIGNALS_KEY, LEGACY_AI_SIGNALS_KEY] : [key];

  for (const candidate of candidateKeys) {
    let raw: string | null = null;
    try {
      raw = node.getPluginData(candidate);
    } catch {
      continue;
    }

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as AiSignals;
      debugFixLog("ai signals parsed", { hasRoles: parsed?.roles?.length > 0, qa: parsed?.qa?.length ?? 0 });
      return parsed;
    } catch (error) {
      debugFixLog("ai signals parse failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return null;
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

/**
 * Finds the role assigned to a specific node by AI analysis.
 * Returns the role with highest confidence if found, otherwise null.
 */
export function findNodeRole(
  signals: AiSignals | null | undefined,
  nodeId: string
): { readonly role: string; readonly confidence: number } | null {
  if (!signals?.roles?.length) {
    return null;
  }

  const matches = signals.roles.filter((r) => r.nodeId === nodeId);
  if (matches.length === 0) {
    return null;
  }

  // Return the highest confidence role for this node
  const sorted = [...matches].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const best = sorted[0];

  if (!best || (best.confidence ?? 0) < MIN_CONFIDENCE) {
    return null;
  }

  return { role: best.role, confidence: best.confidence ?? 0 };
}

/**
 * Checks if a node has the hero_bleed role (intentionally bleeds beyond frame bounds).
 */
export function isHeroBleedNode(signals: AiSignals | null | undefined, nodeId: string): boolean {
  const roleInfo = findNodeRole(signals, nodeId);
  return roleInfo?.role === "hero_bleed";
}

/**
 * Gets all nodes with a specific role from AI signals.
 */
export function getNodesByRole(
  signals: AiSignals | null | undefined,
  role: string
): readonly { readonly nodeId: string; readonly confidence: number }[] {
  if (!signals?.roles?.length) {
    return [];
  }

  return signals.roles
    .filter((r) => r.role === role && (r.confidence ?? 0) >= MIN_CONFIDENCE)
    .map((r) => ({ nodeId: r.nodeId, confidence: r.confidence ?? 0 }));
}

export function resolvePrimaryFocalPoint(
  signals: AiSignals | null | undefined
): { readonly x: number; readonly y: number; readonly confidence: number } | null {
  if (!signals?.focalPoints?.length) {
    return null;
  }

  const sorted = [...signals.focalPoints].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const [primary] = sorted;
  const confidence = primary?.confidence ?? 0;

  if (!primary || confidence < MIN_FOCAL_CONFIDENCE) {
    debugFixLog("focal point discarded due to low confidence", { confidence });
    return null;
  }

  const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);
  const focalPoint = {
    x: clamp(primary.x),
    y: clamp(primary.y),
    confidence
  };

  debugFixLog("primary focal point resolved", focalPoint);
  return focalPoint;
}
