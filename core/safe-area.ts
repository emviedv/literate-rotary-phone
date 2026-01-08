import type { VariantTarget } from "../types/targets.js";
import { resolveTargetConfig } from "./target-config.js";

export type SafeAreaInsets = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

function clampToNonNegative(value: number): number {
  return Math.max(0, value);
}

/**
 * Resolves per-side safe area insets for a target. Uses target-specific
 * overrides when available (e.g., TikTok and YouTube), falling back to a
 * symmetric ratio otherwise so layout, overlays, and warnings all agree.
 */
export function resolveSafeAreaInsets(target: VariantTarget, safeAreaRatio: number): SafeAreaInsets {
  const config = resolveTargetConfig(target);

  if (config.safeAreaInsets) {
    return config.safeAreaInsets;
  }

  // Use ratio-based calculation for all targets without explicit insets
  // (Previously YouTube had hardcoded 1546x423 which was too restrictive)
  const insetX = clampToNonNegative(target.width * safeAreaRatio);
  const insetY = clampToNonNegative(target.height * safeAreaRatio);
  return {
    left: insetX,
    right: insetX,
    top: insetY,
    bottom: insetY
  };
}
