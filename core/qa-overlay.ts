import { ROLE_KEY } from "./plugin-constants.js";
import type { VariantTarget } from "../types/targets.js";
import type { SafeAreaInsets } from "./safe-area.js";
import { resolveSafeAreaInsets } from "./safe-area.js";
import { debugFixLog } from "./debug.js";
import { resolveTargetConfig } from "./target-config.js";

/**
 * Platform-specific UI chrome explanations for safe area specs.
 * Describes what each margin is avoiding.
 */
const PLATFORM_CHROME_NOTES: Record<string, {
  top: string;
  bottom: string;
  left: string;
  right: string;
  source?: string;
}> = {
  "tiktok-vertical": {
    top: "Username, follow button, For You/Following tabs",
    bottom: "Caption, @username, music attribution, tab bar",
    left: "Edge breathing room",
    right: "Like, comment, bookmark, share buttons + creator avatar",
    source: "TikTok UI measurement, Jan 2025"
  },
  "youtube-shorts": {
    top: "Channel name, subscribe button, Shorts branding",
    bottom: "Title, like/dislike/comment/share row, nav bar",
    left: "Edge breathing room",
    right: "Action buttons, channel avatar, overflow menu",
    source: "YouTube Shorts UI measurement, Jan 2025"
  },
  "instagram-reels": {
    top: "Reels header, camera icon",
    bottom: "Username, caption, audio attribution, tab bar",
    left: "Caption text start edge",
    right: "Like, comment, share, bookmark, audio disc",
    source: "Instagram Reels UI measurement, Jan 2025"
  },
  "youtube-cover": {
    top: "Responsive crop zone (varies by device)",
    bottom: "Responsive crop zone (varies by device)",
    left: "Mobile crop zone",
    right: "Mobile crop zone",
    source: "YouTube channel art guidelines"
  }
};

/**
 * Generates a human-readable spec description for the safe area overlay.
 * This appears in Figma's Design panel when the layer is selected.
 */
function generateSafeAreaSpec(
  target: VariantTarget,
  insets: SafeAreaInsets,
  safeWidth: number,
  safeHeight: number
): string {
  const { width, height } = target;
  const chromeNotes = PLATFORM_CHROME_NOTES[target.id];

  const pct = (value: number, total: number) => ((value / total) * 100).toFixed(1);

  let spec = `SAFE AREA SPEC: ${target.label}\n`;
  spec += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  spec += `Frame: ${width} × ${height}px\n`;
  spec += `Safe zone: ${safeWidth} × ${safeHeight}px\n\n`;

  spec += `MARGINS:\n`;
  spec += `┌─ Top: ${insets.top}px (${pct(insets.top, height)}%)\n`;
  spec += `│  └ ${chromeNotes?.top ?? "Platform UI elements"}\n`;
  spec += `├─ Bottom: ${insets.bottom}px (${pct(insets.bottom, height)}%)\n`;
  spec += `│  └ ${chromeNotes?.bottom ?? "Platform UI elements"}\n`;
  spec += `├─ Left: ${insets.left}px (${pct(insets.left, width)}%)\n`;
  spec += `│  └ ${chromeNotes?.left ?? "Edge clearance"}\n`;
  spec += `└─ Right: ${insets.right}px (${pct(insets.right, width)}%)\n`;
  spec += `   └ ${chromeNotes?.right ?? "Platform UI elements"}\n\n`;

  if (insets.left !== insets.right) {
    spec += `NOTE: Asymmetric L/R margins\n`;
    spec += `Right edge needs more clearance for action buttons.\n\n`;
  }

  if (chromeNotes?.source) {
    spec += `Source: ${chromeNotes.source}\n`;
  }

  return spec;
}

/**
 * Generates a compact spec for the safe rect layer name suffix.
 */
function generateCompactSpec(insets: SafeAreaInsets): string {
  return `[T:${insets.top} B:${insets.bottom} L:${insets.left} R:${insets.right}]`;
}

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

  // Generate and apply spec description to overlay frame
  // Note: 'description' is available in Figma API but may not be settable in all contexts
  const specDescription = generateSafeAreaSpec(effectiveTarget, insets, safeWidth, safeHeight);
  try {
    (overlay as unknown as { description: string }).description = specDescription;
  } catch {
    // description property may not be available or extensible in some Figma versions
  }

  appendSafeRect(
    overlay,
    insets.left,
    insets.top,
    safeWidth,
    safeHeight,
    label,
    insets,
    effectiveTarget,
    undefined,
    constraints
  );

  return overlay;
}

function appendSafeRect(
  parent: FrameNode,
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  insets: SafeAreaInsets,
  target: VariantTarget,
  color: RGB = { r: 0.92, g: 0.4, b: 0.36 },
  constraints: FrameNode["constraints"] = { horizontal: "SCALE", vertical: "SCALE" }
): void {
  const safeRect = figma.createRectangle();

  // Include compact specs in layer name for quick reference
  const compactSpec = generateCompactSpec(insets);
  safeRect.name = `${name} ${compactSpec}`;

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

  // Add detailed spec description visible in Figma's Design panel
  // Note: 'description' is available in Figma API but may not be settable in all contexts
  try {
    (safeRect as unknown as { description: string }).description = generateSafeAreaSpec(target, insets, width, height);
  } catch {
    // description property may not be available or extensible in some Figma versions
  }

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
    name: safeRect.name
  });
}
