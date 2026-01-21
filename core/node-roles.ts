import type { AiRole, AiSignals } from "../types/ai-signals.js";
import { LEGACY_ROLE_KEY, ROLE_KEY } from "./plugin-constants.js";
import { debugFixLog } from "./debug.js";
import { resolveRole, isSafeAreaExempt, type RoleResolvableNode } from "./role-resolver.js";

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
 * Returns true when a node is tagged as a hero/subject element that may bleed.
 * Hero bleed elements intentionally extend beyond frame bounds
 * (e.g., device mockups, cropped portraits, bleeding photos).
 *
 * Uses the unified role resolver to check both legacy and new taxonomy names.
 */
export function hasHeroBleedRole(node: { getPluginData?: (key: string) => string }): boolean {
  if (!("getPluginData" in node) || typeof node.getPluginData !== "function") {
    return false;
  }
  try {
    const role = node.getPluginData(ROLE_KEY) || node.getPluginData(LEGACY_ROLE_KEY);
    // Support both legacy hero_bleed and new subject role
    return role === "hero_bleed" || role === "subject";
  } catch {
    return false;
  }
}

/**
 * Returns the resolved role for a node using the unified role resolver.
 * This is the primary API for role resolution - prefer this over direct plugin data access.
 *
 * @param node - Node to resolve role for
 * @param aiRoleOverride - Optional AI-assigned role from cached signals
 */
export function getNodeRole(node: RoleResolvableNode, aiRoleOverride?: AiRole): AiRole {
  return resolveRole(node, aiRoleOverride).role;
}

/**
 * Checks if a node's role makes it exempt from safe area constraints.
 * Uses the unified role resolver for consistent classification.
 */
export function isNodeSafeAreaExempt(node: RoleResolvableNode, aiRoleOverride?: AiRole): boolean {
  const resolved = resolveRole(node, aiRoleOverride);
  // Overlay is a special case - always exempt
  if (hasOverlayRole(node as { getPluginData?: (key: string) => string })) {
    return true;
  }
  return isSafeAreaExempt(resolved.role);
}

/**
 * Roles that should be excluded from safe area constraint checks.
 * These elements are allowed to extend beyond frame bounds.
 *
 * @deprecated Use isNodeSafeAreaExempt() or isSafeAreaExempt() from role-resolver.ts instead
 */
export const SAFE_AREA_EXEMPT_ROLES = [
  "overlay",
  // Legacy names
  "hero_bleed",
  "background",
  // New taxonomy names
  "subject",
  "environment"
] as const;
