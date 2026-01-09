import type { AiSignals } from "../types/ai-signals.js";
import { LEGACY_ROLE_KEY, ROLE_KEY } from "./plugin-constants.js";
import { debugFixLog } from "./debug.js";

declare const figma: PluginAPI;

/**
 * Propagates AI-detected roles to individual nodes as plugin data.
 * This ensures roles survive cloning since plugin data is copied to clones.
 * Only sets roles with confidence above the threshold.
 */
export function propagateRolesToNodes(signals: AiSignals | null | undefined, minConfidence = 0.35): number {
  if (!signals?.roles?.length) {
    return 0;
  }

  let propagated = 0;

  for (const roleEntry of signals.roles) {
    if ((roleEntry.confidence ?? 0) < minConfidence) {
      continue;
    }

    try {
      const node = figma.getNodeById(roleEntry.nodeId);
      if (node && "setPluginData" in node && typeof node.setPluginData === "function") {
        node.setPluginData(ROLE_KEY, roleEntry.role);
        propagated++;
      }
    } catch {
      // Node may have been deleted or is inaccessible
    }
  }

  debugFixLog("propagated roles to nodes", { total: signals.roles.length, propagated });
  return propagated;
}

/**
 * Returns true when a node is tagged as an overlay via plugin data.
 * Defensive against missing plugin data accessors so it can be used in tests.
 */
export function hasOverlayRole(node: { getPluginData?: (key: string) => string }): boolean {
  if (!("getPluginData" in node) || typeof node.getPluginData !== "function") {
    return false;
  }
  try {
    return node.getPluginData(ROLE_KEY) === "overlay" || node.getPluginData(LEGACY_ROLE_KEY) === "overlay";
  } catch {
    return false;
  }
}

/**
 * Returns true when a node is tagged as a hero_bleed element.
 * Hero bleed elements intentionally extend beyond frame bounds
 * (e.g., device mockups, cropped portraits, bleeding photos).
 */
export function hasHeroBleedRole(node: { getPluginData?: (key: string) => string }): boolean {
  if (!("getPluginData" in node) || typeof node.getPluginData !== "function") {
    return false;
  }
  try {
    return node.getPluginData(ROLE_KEY) === "hero_bleed" || node.getPluginData(LEGACY_ROLE_KEY) === "hero_bleed";
  } catch {
    return false;
  }
}

/**
 * Roles that should be excluded from safe area constraint checks.
 * These elements are allowed to extend beyond frame bounds.
 */
export const SAFE_AREA_EXEMPT_ROLES = ["overlay", "hero_bleed", "background"] as const;
