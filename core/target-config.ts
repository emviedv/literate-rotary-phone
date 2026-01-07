import type { VariantTarget } from "../types/targets.js";
import { ASPECT_RATIOS } from "./layout-constants.js";

export interface TargetConfig {
  readonly safeAreaInsets?: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };
  readonly overlayLabel: string;
  readonly overlayConstraints: FrameNode["constraints"];
}

const SPECIFIC_CONFIGS: Record<string, Partial<TargetConfig>> = {
  "tiktok-vertical": {
     safeAreaInsets: { top: 108, bottom: 320, left: 44, right: 120 },
     overlayLabel: "Content Safe Zone",
     overlayConstraints: { horizontal: "STRETCH", vertical: "STRETCH" }
  },
  "youtube-cover": {
      overlayLabel: "Text & Logo Safe Area",
      overlayConstraints: { horizontal: "CENTER", vertical: "CENTER" }
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
