import { LEGACY_ROLE_KEY, ROLE_KEY } from "./plugin-constants.js";

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
