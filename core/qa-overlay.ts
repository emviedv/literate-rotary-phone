import { ROLE_KEY } from "./plugin-constants.js";
import type { VariantTarget } from "../types/targets.js";
import { resolveSafeAreaInsets } from "./safe-area.js";

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

  const insets = resolveSafeAreaInsets(target, safeAreaRatio);
  const safeWidth = target.width - insets.left - insets.right;
  const safeHeight = target.height - insets.top - insets.bottom;

  const label =
    target.id === "youtube-cover"
      ? "Text & Logo Safe Area"
      : target.id === "tiktok-vertical"
        ? "Content Safe Zone"
        : "Safe Area";

  appendSafeRect(overlay, insets.left, insets.top, safeWidth, safeHeight, label);

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
