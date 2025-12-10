import { ROLE_KEY } from "./plugin-constants.js";
import type { VariantTarget } from "../types/targets.js";

type OverlayNode = Pick<FrameNode, "x" | "y"> &
  Partial<Pick<FrameNode, "layoutPositioning" | "constraints" | "locked">>;

declare const figma: PluginAPI;

/**
 * Applies the default placement for the QA overlay after it has been appended.
 * Ensures the overlay detaches from auto layout flow and stretches with the parent frame.
 */
export interface QaOverlayOptions {
  readonly parentLayoutMode?: FrameNode["layoutMode"];
}

export function configureQaOverlay(
  overlay: OverlayNode,
  options?: QaOverlayOptions
): { positioningUpdated: boolean } {
  const hadLocked = typeof overlay.locked === "boolean";
  const wasLocked = hadLocked ? overlay.locked : undefined;
  if (wasLocked) {
    overlay.locked = false;
  }

  overlay.x = 0;
  overlay.y = 0;

  let positioningUpdated = false;

  const parentLayoutMode = options?.parentLayoutMode;
  const parentSupportsAbsolute = typeof parentLayoutMode === "undefined" || parentLayoutMode !== "NONE";

  if (parentSupportsAbsolute && typeof overlay.layoutPositioning !== "undefined") {
    if (overlay.layoutPositioning !== "ABSOLUTE") {
      overlay.layoutPositioning = "ABSOLUTE";
      positioningUpdated = true;
    }
  }

  if (!parentSupportsAbsolute && typeof overlay.layoutPositioning !== "undefined") {
    if (overlay.layoutPositioning === "ABSOLUTE") {
      overlay.layoutPositioning = "AUTO";
      positioningUpdated = true;
    }
  }

  if (parentSupportsAbsolute && typeof overlay.constraints !== "undefined") {
    const nextConstraints: FrameNode["constraints"] = {
      horizontal: "STRETCH",
      vertical: "STRETCH"
    };
    if (
      overlay.constraints?.horizontal !== nextConstraints.horizontal ||
      overlay.constraints?.vertical !== nextConstraints.vertical
    ) {
      overlay.constraints = nextConstraints;
      positioningUpdated = true;
    }
  }

  if (hadLocked && typeof wasLocked === "boolean") {
    overlay.locked = wasLocked;
  }

  return { positioningUpdated };
}

export function createQaOverlay(target: VariantTarget, safeAreaRatio: number): FrameNode {
  const overlay = figma.createFrame();
  overlay.name = "QA Overlay";
  overlay.layoutMode = "NONE";
  overlay.opacity = 1;
  overlay.fills = [];
  overlay.strokes = [];
  overlay.resizeWithoutConstraints(target.width, target.height);
  overlay.clipsContent = false;
  overlay.setPluginData(ROLE_KEY, "overlay");

  if (target.id === "youtube-cover") {
    // YouTube Mobile/Desktop Safe Area (1546x423 centered)
    const safeWidth = 1546;
    const safeHeight = 423;
    const insetX = (target.width - safeWidth) / 2;
    const insetY = (target.height - safeHeight) / 2;
    
    appendSafeRect(overlay, insetX, insetY, safeWidth, safeHeight, "Text & Logo Safe Area");
    
    // Optional: Tablet Safe Area (1855x423)
    // appendSafeRect(overlay, (target.width - 1855) / 2, insetY, 1855, safeHeight, "Tablet Safe Area", { r: 0.4, g: 0.4, b: 0.9 });
    
  } else if (target.id === "tiktok-vertical") {
    // TikTok Safe Area approx
    // Top: ~108px (system bar + tabs)
    // Bottom: ~320px (caption + nav)
    // Right: ~120px (actions)
    // Left: ~44px
    const top = 108;
    const bottom = 320;
    const left = 44;
    const right = 120;
    const safeWidth = target.width - left - right;
    const safeHeight = target.height - top - bottom;
    
    appendSafeRect(overlay, left, top, safeWidth, safeHeight, "Content Safe Zone");
    
  } else {
    // Standard percentage-based safe area
    const insetX = target.width * safeAreaRatio;
    const insetY = target.height * safeAreaRatio;
    const safeWidth = target.width - insetX * 2;
    const safeHeight = target.height - insetY * 2;
    
    appendSafeRect(overlay, insetX, insetY, safeWidth, safeHeight, "Safe Area");
  }

  return overlay;
}

function appendSafeRect(
  parent: FrameNode, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  name: string,
  color: RGB = { r: 0.92, g: 0.4, b: 0.36 }
): void {
  const safeRect = figma.createRectangle();
  safeRect.name = name;
  safeRect.x = x;
  safeRect.y = y;
  safeRect.resizeWithoutConstraints(width, height);
  safeRect.fills = [];
  safeRect.strokes = [
    {
      type: "SOLID",
      color
    }
  ];
  safeRect.dashPattern = [8, 12];
  safeRect.strokeWeight = 3;
  safeRect.locked = true;
  safeRect.setPluginData(ROLE_KEY, "overlay");
  parent.appendChild(safeRect);
}
