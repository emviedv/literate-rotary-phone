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
