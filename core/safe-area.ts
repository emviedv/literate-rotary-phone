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

/**
 * Enforces safe area constraints on a set of bounds.
 * Useful for strictly keeping absolute content within permitted zones.
 */
export function enforceTargetSafeArea(
  bounds: { x: number; y: number; width: number; height: number },
  safeArea: SafeAreaInsets,
  containerSize: { width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const minX = safeArea.left;
  const maxX = containerSize.width - safeArea.right;
  const minY = safeArea.top;
  const maxY = containerSize.height - safeArea.bottom;

  const width = Math.min(bounds.width, maxX - minX);
  const height = Math.min(bounds.height, maxY - minY);

  const x = Math.max(minX, Math.min(bounds.x, maxX - width));
  const y = Math.max(minY, Math.min(bounds.y, maxY - height));

  return { x, y, width, height };
}
