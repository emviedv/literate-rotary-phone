type OverlayNode = Pick<FrameNode, "x" | "y"> &
  Partial<Pick<FrameNode, "layoutPositioning" | "constraints" | "locked">>;

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
