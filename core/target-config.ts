import type { VariantTarget } from "../types/targets.js";
import type { TargetQaThresholds } from "../types/ai-signals.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

export interface TargetConfig {
  readonly safeAreaInsets?: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };
  readonly overlayLabel: string;
  readonly overlayConstraints: FrameNode["constraints"];
}

const SPECIFIC_CONFIGS: Record<string, Partial<TargetConfig>> = {
  "tiktok-vertical": {
     safeAreaInsets: { top: 150, bottom: 400, left: 90, right: 120 },
     overlayLabel: "Content Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },
  "youtube-shorts": {
     safeAreaInsets: { top: 200, bottom: 280, left: 60, right: 120 },
     overlayLabel: "Shorts Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },
  "instagram-reels": {
     safeAreaInsets: { top: 108, bottom: 340, left: 60, right: 120 },
     overlayLabel: "Reels Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "MIN" }
  },
  "youtube-cover": {
      overlayLabel: "Text & Logo Safe Area",
      overlayConstraints: { horizontal: "CENTER", vertical: "CENTER" }
  }
};

/**
 * Target-specific QA thresholds for validating content fit.
 * Used by AI to generate target-aware warnings.
 */
export const TARGET_QA_THRESHOLDS: Record<string, TargetQaThresholds> = {
  "figma-cover": {
    targetId: "figma-cover",
    minFontSize: 14,
    maxTextLength: 200,
    minCtaSize: { width: 120, height: 40 },
    safeAreaCritical: false
  },
  "figma-gallery": {
    targetId: "figma-gallery",
    minFontSize: 14,
    maxTextLength: 180,
    minCtaSize: { width: 100, height: 36 },
    safeAreaCritical: false
  },
  "figma-thumbnail": {
    targetId: "figma-thumbnail",
    minFontSize: 9,
    maxTextLength: 80,
    minCtaSize: { width: 40, height: 20 },
    safeAreaCritical: false
  },
  "web-hero": {
    targetId: "web-hero",
    minFontSize: 16,
    maxTextLength: 150,
    minCtaSize: { width: 140, height: 44 },
    safeAreaCritical: false
  },
  "social-carousel": {
    targetId: "social-carousel",
    minFontSize: 14,
    maxTextLength: 120,
    minCtaSize: { width: 100, height: 40 },
    safeAreaCritical: false
  },
  "youtube-cover": {
    targetId: "youtube-cover",
    minFontSize: 18,
    maxTextLength: 150,
    minCtaSize: { width: 100, height: 36 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 1200, width: 2560, height: 240, description: "Bottom subscribe area" }
    ]
  },
  "tiktok-vertical": {
    targetId: "tiktok-vertical",
    minFontSize: 24,
    maxTextLength: 120,
    minCtaSize: { width: 200, height: 48 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 150, description: "Username & sound" },
      { x: 0, y: 1520, width: 1080, height: 400, description: "Caption & actions" }
    ]
  },
  "youtube-shorts": {
    targetId: "youtube-shorts",
    minFontSize: 24,
    maxTextLength: 100,
    minCtaSize: { width: 180, height: 44 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 200, description: "Channel & comments" },
      { x: 0, y: 1640, width: 1080, height: 280, description: "Subscribe & UI" }
    ]
  },
  "instagram-reels": {
    targetId: "instagram-reels",
    minFontSize: 22,
    maxTextLength: 110,
    minCtaSize: { width: 180, height: 44 },
    safeAreaCritical: true,
    overlayZones: [
      { x: 0, y: 0, width: 1080, height: 108, description: "Username area" },
      { x: 0, y: 1580, width: 1080, height: 340, description: "Caption & actions" }
    ]
  },
  "gumroad-cover": {
    targetId: "gumroad-cover",
    minFontSize: 14,
    maxTextLength: 180,
    minCtaSize: { width: 120, height: 40 },
    safeAreaCritical: false
  },
  "gumroad-thumbnail": {
    targetId: "gumroad-thumbnail",
    minFontSize: 12,
    maxTextLength: 60,
    minCtaSize: { width: 60, height: 28 },
    safeAreaCritical: false
  }
};

export function resolveTargetConfig(target: VariantTarget): TargetConfig {
  const specific = SPECIFIC_CONFIGS[target.id];
  
  const aspectRatio = target.width / Math.max(target.height, 1);
  const isVerticalVideo = aspectRatio < ASPECT_RATIOS.VERTICAL_VIDEO;

  const baseConfig: TargetConfig = {
      overlayLabel: isVerticalVideo ? "Content Safe Zone" : "Safe Area",
      overlayConstraints: isVerticalVideo 
        ? { horizontal: "STRETCH", vertical: "STRETCH" }
        : { horizontal: "SCALE", vertical: "SCALE" }
  };
  
  return { ...baseConfig, ...specific };
}
