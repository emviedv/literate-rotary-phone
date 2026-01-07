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

  if (target.id === "youtube-cover") {
    // 1546x423 centered safe region on 2560x1440
    const leftRight = (target.width - 1546) / 2;
    const topBottom = (target.height - 423) / 2;
    return {
      left: leftRight,
      right: leftRight,
      top: topBottom,
      bottom: topBottom
    };
  }

  const insetX = clampToNonNegative(target.width * safeAreaRatio);
  const insetY = clampToNonNegative(target.height * safeAreaRatio);
  return {
    left: insetX,
    right: insetX,
    top: insetY,
    bottom: insetY
  };
}
