import { hasOverlayRole } from "./node-roles.js";

type LayoutChildSnapshot = {
  readonly id: string;
  readonly name: string;
  readonly layoutGrow?: number;
  readonly layoutAlign?: string;
  readonly width?: number;
  readonly height?: number;
};

export type LayoutSnapshot = {
  readonly layoutMode: FrameNode["layoutMode"];
  readonly layoutWrap: FrameNode["layoutWrap"];
  readonly primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
  readonly counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
  readonly primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  readonly counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  readonly itemSpacing: FrameNode["itemSpacing"];
  readonly counterAxisSpacing?: FrameNode["counterAxisSpacing"];
  readonly padding: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly flowChildCount: number;
  readonly absoluteChildCount: number;
  readonly flowChildren: readonly LayoutChildSnapshot[];
};

/**
 * Captures the current auto-layout metadata for a frame for later telemetry/debugging.
 * Overlays are skipped to avoid polluting flow counts.
 */
export function captureLayoutSnapshot(frame: FrameNode): LayoutSnapshot {
  const flowChildren: LayoutChildSnapshot[] = [];
  let absoluteChildCount = 0;

  for (const child of frame.children) {
    if (hasOverlayRole(child)) {
      continue;
    }

    const positioning = "layoutPositioning" in child ? child.layoutPositioning : null;
    const participatesInFlow = frame.layoutMode !== "NONE" && positioning !== "ABSOLUTE";

    if (participatesInFlow) {
      flowChildren.push({
        id: child.id,
        name: child.name,
        layoutGrow: "layoutGrow" in child ? child.layoutGrow : undefined,
        layoutAlign: "layoutAlign" in child ? child.layoutAlign : undefined,
        width: "width" in child ? child.width : undefined,
        height: "height" in child ? child.height : undefined
      });
    } else {
      absoluteChildCount += 1;
    }
  }

  return {
    layoutMode: frame.layoutMode,
    layoutWrap: frame.layoutWrap,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing: frame.layoutWrap === "WRAP" ? frame.counterAxisSpacing : undefined,
    padding: {
      left: frame.paddingLeft,
      right: frame.paddingRight,
      top: frame.paddingTop,
      bottom: frame.paddingBottom
    },
    flowChildCount: flowChildren.length,
    absoluteChildCount,
    flowChildren
  };
}
