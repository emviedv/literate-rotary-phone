import type { AiSignals } from "../types/ai-signals.js";
import type { VariantWarning } from "../types/messages.js";
import type { VariantTarget } from "../types/targets.js";
import { deriveWarningsFromAiSignals, readAiSignals } from "./ai-signals.js";
import { hasOverlayRole, hasHeroBleedRole } from "./node-roles.js";
import { resolveSafeAreaInsets } from "./safe-area.js";

const IGNORED_ROLES = new Set(["subject", "environment", "container"]);

type ContentMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Surface QA warnings for a frame based on safe area, alignment, and AI QA signals.
 * Behavior matches legacy logic to keep UI messages stable across refactors.
 */
export function collectWarnings(frame: FrameNode, target: VariantTarget, safeAreaRatio: number): VariantWarning[] {
  const warnings: VariantWarning[] = [];
  const insets = resolveSafeAreaInsets(target, safeAreaRatio);
  const safeWidth = target.width - insets.left - insets.right;
  const safeHeight = target.height - insets.top - insets.bottom;

  const bounds = frame.absoluteBoundingBox;
  if (!bounds) {
    return warnings;
  }

  const safeArea = {
    x: bounds.x + insets.left,
    y: bounds.y + insets.top,
    width: safeWidth,
    height: safeHeight
  };

  const contentBounds = combineChildBounds(frame);

  if (contentBounds && !isWithinSafeArea(contentBounds, safeArea)) {
    // Debug: log the actual bounds comparison
    console.log("[ScaleResizer][warnings] OUTSIDE_SAFE_AREA detected", {
      frameId: frame.id,
      frameName: frame.name,
      contentBounds: {
        left: contentBounds.x - bounds.x,
        top: contentBounds.y - bounds.y,
        right: (contentBounds.x + contentBounds.width) - bounds.x,
        bottom: (contentBounds.y + contentBounds.height) - bounds.y,
        width: contentBounds.width,
        height: contentBounds.height
      },
      safeArea: {
        left: insets.left,
        top: insets.top,
        right: target.width - insets.right,
        bottom: target.height - insets.bottom,
        width: safeWidth,
        height: safeHeight
      },
      overflow: {
        left: insets.left - (contentBounds.x - bounds.x),
        top: insets.top - (contentBounds.y - bounds.y),
        right: (contentBounds.x + contentBounds.width - bounds.x) - (target.width - insets.right),
        bottom: (contentBounds.y + contentBounds.height - bounds.y) - (target.height - insets.bottom)
      }
    });
    warnings.push({
      code: "OUTSIDE_SAFE_AREA",
      severity: "warn",
      message: "Some layers extend outside the safe area."
    });
  }

  if (contentBounds) {
    const contentCenterX = contentBounds.x + contentBounds.width / 2;
    const frameCenterX = bounds.x + bounds.width / 2;
    const delta = Math.abs(contentCenterX - frameCenterX);
    if (delta > 32) {
      warnings.push({
        code: "MISALIGNED",
        severity: "info",
        message: "Primary content is offset; consider centering horizontally."
      });
    }
  }

  const aiSignals = readAiSignals(frame);
  if (aiSignals) {
    const aiWarnings = deriveWarningsFromAiSignals(aiSignals);
    if (aiWarnings.length > 0) {
      warnings.push(...aiWarnings);
    }
  }

  return warnings;
}

/**
 * Calculates the whitespace around visible content (excluding overlays/backgrounds).
 * Used when scaling layouts so padding and interior spacing respond to real content.
 */
export function measureContentMargins(frame: FrameNode): ContentMargins | null {
  const frameBounds = frame.absoluteBoundingBox;
  if (!frameBounds) {
    return null;
  }

  const aiSignals = readAiSignals(frame);
  const contentBounds = combineChildBounds(frame, aiSignals || undefined);
  if (!contentBounds) {
    return null;
  }

  const left = Math.max(contentBounds.x - frameBounds.x, 0);
  const top = Math.max(contentBounds.y - frameBounds.y, 0);
  const right = Math.max(frameBounds.x + frameBounds.width - (contentBounds.x + contentBounds.width), 0);
  const bottom = Math.max(frameBounds.y + frameBounds.height - (contentBounds.y + contentBounds.height), 0);

  return { left, right, top, bottom };
}

export function combineChildBounds(
  frame: FrameNode,
  aiSignals?: AiSignals
): { x: number; y: number; width: number; height: number } | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) {
      continue;
    }

    if (isBackgroundOrIgnored(node, frame, aiSignals)) {
      continue;
    }

    if ("children" in node) {
      queue.push(...node.children);
    }

    if (!("absoluteBoundingBox" in node)) {
      continue;
    }

    const bbox = node.absoluteBoundingBox;
    if (!bbox) {
      continue;
    }

    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function isBackgroundOrIgnored(node: SceneNode, rootFrame: FrameNode, aiSignals?: AiSignals): boolean {
  if (hasOverlayRole(node)) {
    return true;
  }

  // Check for hero_bleed role via plugin data
  if (hasHeroBleedRole(node)) {
    return true;
  }

  if (aiSignals?.roles) {
    const roleEntry = aiSignals.roles.find((role) => role.nodeId === node.id);
    if (roleEntry && IGNORED_ROLES.has(roleEntry.role)) {
      return true;
    }
  }

  if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
    const nodeArea = node.width * node.height;
    const rootArea = rootFrame.width * rootFrame.height;
    if (rootArea > 0 && nodeArea >= rootArea * 0.95) {
      return true;
    }
  }

  return false;
}

function isWithinSafeArea(
  bounds: { x: number; y: number; width: number; height: number },
  safe: { x: number; y: number; width: number; height: number }
): boolean {
  const tolerance = 2;
  return (
    bounds.x >= safe.x - tolerance &&
    bounds.y >= safe.y - tolerance &&
    bounds.x + bounds.width <= safe.x + safe.width + tolerance &&
    bounds.y + bounds.height <= safe.y + safe.height + tolerance
  );
}
