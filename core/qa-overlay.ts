import { ROLE_KEY } from "./plugin-constants.js";
import type { VariantTarget } from "../types/targets.js";
import { resolveSafeAreaInsets } from "./safe-area.js";
import { debugFixLog } from "./debug.js";
import { resolveTargetConfig } from "./target-config.js";

type OverlayNode = Pick<FrameNode, "x" | "y"> &
  Partial<Pick<FrameNode, "layoutPositioning" | "constraints" | "locked">>;

declare const figma: PluginAPI;

/**
 * Applies the default placement for the QA overlay after it has been appended.
 * Ensures the overlay detaches from auto layout flow and stretches with the parent frame.
 */
export interface QaOverlayOptions {
  readonly parentLayoutMode?: FrameNode["layoutMode"];
  readonly constraints?: FrameNode["constraints"];
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

  if (typeof overlay.constraints !== "undefined") {
    const nextConstraints: FrameNode["constraints"] = options?.constraints ?? {
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

  // Set coordinates AFTER ensuring absolute positioning.
  // In Figma, setting x/y on an AUTO (in-flow) node is often ignored or overridden.
  // By moving it here, we ensure it snaps to 0,0 relative to the parent frame
  // once it is definitely absolute.
  overlay.x = 0;
  overlay.y = 0;

  if (hadLocked && typeof wasLocked === "boolean") {
    overlay.locked = wasLocked;
  }

  return { positioningUpdated };
}

export function createQaOverlay(
  target: VariantTarget,
  safeAreaRatio: number,
  overrideWidth?: number,
  overrideHeight?: number
): FrameNode {
  const overlay = figma.createFrame();
  overlay.name = "QA Overlay";
  overlay.layoutMode = "NONE";
  overlay.opacity = 1;
  overlay.fills = [];
  overlay.strokes = [];

  const effectiveWidth = overrideWidth ?? target.width;
  const effectiveHeight = overrideHeight ?? target.height;
  const effectiveTarget = { ...target, width: effectiveWidth, height: effectiveHeight };

  overlay.resizeWithoutConstraints(effectiveWidth, effectiveHeight);
  overlay.clipsContent = false;
  overlay.setPluginData(ROLE_KEY, "overlay");

  const insets = resolveSafeAreaInsets(effectiveTarget, safeAreaRatio);
  const safeWidth = effectiveWidth - insets.left - insets.right;
  const safeHeight = effectiveHeight - insets.top - insets.bottom;

  const config = resolveTargetConfig(target);
  const label = config.overlayLabel;
  const constraints = config.overlayConstraints;

  appendSafeRect(overlay, insets.left, insets.top, safeWidth, safeHeight, label, undefined, constraints);

  return overlay;
}

function appendSafeRect(
  parent: FrameNode,
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  color: RGB = { r: 0.92, g: 0.4, b: 0.36 },
  constraints: FrameNode["constraints"] = { horizontal: "SCALE", vertical: "SCALE" }
): void {
  const safeRect = figma.createRectangle();
  safeRect.name = name;
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
  safeRect.setPluginData(ROLE_KEY, "overlay");
  safeRect.constraints = constraints;

  // Append first to establish parent context, then set parent-relative coordinates
  parent.appendChild(safeRect);
  safeRect.x = x;
  safeRect.y = y;

  debugFixLog("safe rect positioned in overlay", {
    parentId: parent.id,
    expectedX: x,
    expectedY: y,
    actualX: safeRect.x,
    actualY: safeRect.y,
    width,
    height,
    name
  });
}
