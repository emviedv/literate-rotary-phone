import type { VariantTarget } from "../types/targets.js";
import { analyzeContent, calculateOptimalScale } from "./content-analyzer.js";
import { planAutoLayoutExpansion, type AxisExpansionPlan } from "./layout-expansion.js";
import type { AxisGaps } from "./padding-distribution.js";
import { planAbsoluteChildPositions } from "./absolute-layout.js";
import {
  computeVerticalSpacing,
  resolveVerticalAlignItems,
  resolveVerticalLayoutWrap,
  shouldAdoptVerticalFlow,
  shouldExpandAbsoluteChildren,
  type AutoLayoutSummary,
  type LayoutProfile
} from "./layout-profile.js";
import { resolveSafeAreaInsets } from "./safe-area.js";
import { debugFixLog } from "./debug.js";
import { measureContentMargins } from "./warnings.js";
import { resolvePrimaryFocalPoint } from "./ai-signals.js";
import { SAFE_AREA_KEY, FOCAL_POINT_KEY } from "./plugin-constants.js";
import { hasOverlayRole } from "./node-roles.js";

type Mutable<T> = T extends ReadonlyArray<infer U>
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

export type AutoLayoutSnapshot = {
  layoutMode: FrameNode["layoutMode"];
  width: number;
  height: number;
  primaryAxisSizingMode: FrameNode["primaryAxisSizingMode"];
  counterAxisSizingMode: FrameNode["counterAxisSizingMode"];
  layoutWrap: FrameNode["layoutWrap"];
  primaryAxisAlignItems: FrameNode["primaryAxisAlignItems"];
  counterAxisAlignItems: FrameNode["counterAxisAlignItems"];
  itemSpacing: number;
  counterAxisSpacing: number | null;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  clipsContent: boolean;
  flowChildCount: number;
  absoluteChildCount: number;
};

export type SafeAreaMetrics = {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  safeInsetX: number;
  safeInsetY: number;
  targetWidth: number;
  targetHeight: number;
  horizontal: AxisExpansionPlan;
  vertical: AxisExpansionPlan;
  profile: LayoutProfile;
  adoptVerticalVariant: boolean;
};

declare const figma: PluginAPI;

export async function prepareCloneForLayout(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>
): Promise<void> {
  const snapshot = captureAutoLayoutSnapshot(frame);
  if (snapshot) {
    autoLayoutSnapshots.set(frame.id, snapshot);
    frame.layoutMode = "NONE";
  }
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.itemSpacing = 0;
  if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
    frame.counterAxisSpacing = 0;
  }
  frame.clipsContent = true;
}

export function captureAutoLayoutSnapshot(frame: FrameNode): AutoLayoutSnapshot | null {
  if (frame.layoutMode === "NONE") {
    return null;
  }

  let counterAxisSpacing: number | null = null;
  if ("counterAxisSpacing" in frame && typeof frame.counterAxisSpacing === "number") {
    counterAxisSpacing = frame.counterAxisSpacing;
  }

  let flowChildCount = 0;
  let absoluteChildCount = 0;
  for (const child of frame.children) {
    if ("layoutPositioning" in child && child.layoutPositioning === "ABSOLUTE") {
      absoluteChildCount += 1;
    } else {
      flowChildCount += 1;
    }
  }

  return {
    layoutMode: frame.layoutMode,
    width: frame.width,
    height: frame.height,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    layoutWrap: frame.layoutWrap,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    itemSpacing: frame.itemSpacing,
    counterAxisSpacing,
    paddingLeft: frame.paddingLeft,
    paddingRight: frame.paddingRight,
    paddingTop: frame.paddingTop,
    paddingBottom: frame.paddingBottom,
    clipsContent: frame.clipsContent,
    flowChildCount,
    absoluteChildCount
  };
}

export async function scaleNodeTree(
  frame: FrameNode,
  target: VariantTarget,
  safeAreaRatio: number,
  fontCache: Set<string>,
  rootSnapshot: AutoLayoutSnapshot | null,
  profile: LayoutProfile,
  primaryFocal: ReturnType<typeof resolvePrimaryFocalPoint> = null
): Promise<SafeAreaMetrics> {
  const contentAnalysis = analyzeContent(frame);

  debugFixLog("Content analysis complete", {
    frameId: frame.id,
    frameName: frame.name,
    effectiveDimensions: `${contentAnalysis.effectiveWidth}×${contentAnalysis.effectiveHeight}`,
    strategy: contentAnalysis.recommendedStrategy,
    contentDensity: contentAnalysis.contentDensity,
    hasText: contentAnalysis.hasText,
    hasImages: contentAnalysis.hasImages,
    actualBounds: contentAnalysis.actualContentBounds
  });

  const contentMargins = measureContentMargins(frame);

  const sourceWidth = Math.max(contentAnalysis.effectiveWidth, 1);
  const sourceHeight = Math.max(contentAnalysis.effectiveHeight, 1);

  const safeInsets = resolveSafeAreaInsets(target, safeAreaRatio);
  const safeInsetX = safeInsets.left;
  const safeInsetY = safeInsets.top;

  debugFixLog("safe area insets resolved", {
    targetId: target.id,
    ratio: safeAreaRatio,
    insets: safeInsets
  });

  const rawScale = calculateOptimalScale(contentAnalysis, target, { x: safeInsetX, y: safeInsetY }, profile);

  const frameMaxScale = Math.min(
    target.width / Math.max(sourceWidth, 1),
    target.height / Math.max(sourceHeight, 1)
  );
  const scale =
    Number.isFinite(frameMaxScale) && frameMaxScale > 0 ? Math.min(rawScale, frameMaxScale) : rawScale;

  debugFixLog("Optimal scale calculated", {
    scale,
    rawScale,
    frameMaxScale,
    sourceEffective: `${sourceWidth}×${sourceHeight}`,
    target: `${target.width}×${target.height}`,
    profile,
    strategy: contentAnalysis.recommendedStrategy
  });

  await scaleNodeRecursive(frame, scale, fontCache);

  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const extraWidth = Math.max(target.width - scaledWidth, 0);
  const extraHeight = Math.max(target.height - scaledHeight, 0);

  const horizontalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.left, end: contentMargins.right } : null;
  const verticalGaps: AxisGaps | null =
    contentMargins != null ? { start: contentMargins.top, end: contentMargins.bottom } : null;

  const absoluteChildCount = countAbsoluteChildren(frame);
  const verticalSummary: AutoLayoutSummary | null = rootSnapshot
    ? {
        layoutMode: rootSnapshot.layoutMode as AutoLayoutSummary["layoutMode"],
        flowChildCount: rootSnapshot.flowChildCount
      }
    : null;
  const adoptVerticalVariant = shouldAdoptVerticalFlow(profile, verticalSummary);
  const horizontalPlan = planAutoLayoutExpansion({
    totalExtra: extraWidth,
    safeInset: { start: safeInsets.left, end: safeInsets.right },
    gaps: horizontalGaps,
    flowChildCount:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" ? rootSnapshot.flowChildCount : absoluteChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion:
      (rootSnapshot && rootSnapshot.layoutMode === "HORIZONTAL" && rootSnapshot.flowChildCount >= 2) ||
      (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false),
    focalRatio: primaryFocal?.x ?? null
  });
  const verticalFlowChildCount =
    rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
      ? rootSnapshot.flowChildCount
      : adoptVerticalVariant
        ? rootSnapshot?.flowChildCount ?? absoluteChildCount
        : absoluteChildCount;
  const verticalAllowInterior =
    adoptVerticalVariant ||
    (rootSnapshot && rootSnapshot.layoutMode === "VERTICAL" && rootSnapshot.flowChildCount >= 2) ||
    (rootSnapshot?.layoutWrap === "WRAP" && rootSnapshot.flowChildCount >= 2) ||
    (!rootSnapshot || rootSnapshot.layoutMode === "NONE" ? absoluteChildCount >= 2 : false);
  const verticalPlan = planAutoLayoutExpansion({
    totalExtra: extraHeight,
    safeInset: { start: safeInsets.top, end: safeInsets.bottom },
    gaps: verticalGaps,
    flowChildCount: verticalFlowChildCount,
    baseItemSpacing:
      rootSnapshot && rootSnapshot.layoutMode === "VERTICAL"
        ? scaleAutoLayoutMetric(rootSnapshot.itemSpacing, scale)
        : 0,
    allowInteriorExpansion: verticalAllowInterior,
    focalRatio: primaryFocal?.y ?? null
  });

  const offsetX = horizontalPlan.start;
  const offsetY = verticalPlan.start;

  frame.resizeWithoutConstraints(target.width, target.height);
  repositionChildren(frame, offsetX, offsetY);

  if (shouldExpandAbsoluteChildren(rootSnapshot?.layoutMode, adoptVerticalVariant, profile)) {
    expandAbsoluteChildren(frame, horizontalPlan, verticalPlan, profile);
  }

  frame.setPluginData(
    SAFE_AREA_KEY,
    JSON.stringify({
      insetX: safeInsetX,
      insetY: safeInsetY,
      left: safeInsets.left,
      right: safeInsets.right,
      top: safeInsets.top,
      bottom: safeInsets.bottom,
      width: target.width,
      height: target.height
    })
  );
  if (primaryFocal) {
    frame.setPluginData(FOCAL_POINT_KEY, JSON.stringify(primaryFocal));
  }

  debugFixLog("axis expansion planned", {
    nodeId: frame.id,
    layoutMode: rootSnapshot?.layoutMode ?? "NONE",
    flowChildCount: rootSnapshot?.flowChildCount ?? 0,
    absoluteChildCount,
    verticalFlowChildCount,
    verticalAllowInterior,
    extraWidth,
    extraHeight,
    horizontalPlan,
    verticalPlan,
    profile,
    adoptVerticalVariant,
    focal: primaryFocal ? { x: primaryFocal.x, y: primaryFocal.y, confidence: primaryFocal.confidence } : null
  });

  return {
    scale,
    scaledWidth,
    scaledHeight,
    safeInsetX,
    safeInsetY,
    targetWidth: target.width,
    targetHeight: target.height,
    horizontal: horizontalPlan,
    vertical: verticalPlan,
    profile,
    adoptVerticalVariant
  };
}

export async function restoreAutoLayoutSettings(
  frame: FrameNode,
  autoLayoutSnapshots: Map<string, AutoLayoutSnapshot>,
  metrics: SafeAreaMetrics
): Promise<void> {
  const snapshot = autoLayoutSnapshots.get(frame.id);
  if (!snapshot) {
    return;
  }

  frame.clipsContent = snapshot.clipsContent;

  if (frame.layoutMode === "NONE") {
    return;
  }

  const basePaddingLeft = scaleAutoLayoutMetric(snapshot.paddingLeft, metrics.scale);
  const basePaddingRight = scaleAutoLayoutMetric(snapshot.paddingRight, metrics.scale);
  const basePaddingTop = scaleAutoLayoutMetric(snapshot.paddingTop, metrics.scale);
  const basePaddingBottom = scaleAutoLayoutMetric(snapshot.paddingBottom, metrics.scale);
  const baseItemSpacing = scaleAutoLayoutMetric(snapshot.itemSpacing, metrics.scale);
  const horizontalPlan = metrics.horizontal;
  const verticalPlan = metrics.vertical;

  const round = (value: number): number => Math.round(value * 100) / 100;

  frame.paddingLeft = round(basePaddingLeft + horizontalPlan.start);
  frame.paddingRight = round(basePaddingRight + horizontalPlan.end);
  frame.paddingTop = round(basePaddingTop + verticalPlan.start);
  frame.paddingBottom = round(basePaddingBottom + verticalPlan.end);

  let nextItemSpacing = baseItemSpacing;
  if (frame.layoutMode === "HORIZONTAL" && snapshot.flowChildCount >= 2) {
    const gaps = Math.max(snapshot.flowChildCount - 1, 1);
    const perGap = horizontalPlan.interior / gaps;
    nextItemSpacing = round(baseItemSpacing + perGap);
  } else if (frame.layoutMode === "VERTICAL" && snapshot.flowChildCount >= 2) {
    nextItemSpacing = computeVerticalSpacing({
      baseSpacing: baseItemSpacing,
      interior: verticalPlan.interior,
      flowChildCount: snapshot.flowChildCount
    });
  }
  frame.itemSpacing = nextItemSpacing;

  if (snapshot.layoutWrap === "WRAP" && snapshot.counterAxisSpacing != null && "counterAxisSpacing" in frame) {
    const baseCounterSpacing = scaleAutoLayoutMetric(snapshot.counterAxisSpacing, metrics.scale);
    frame.counterAxisSpacing = round(baseCounterSpacing);
  }

  if (metrics.profile === "vertical" && frame.layoutMode === "VERTICAL") {
    frame.primaryAxisAlignItems = resolveVerticalAlignItems(snapshot.primaryAxisAlignItems, {
      interior: metrics.vertical.interior
    });
    frame.layoutWrap = resolveVerticalLayoutWrap(frame.layoutWrap);
  }

  debugFixLog("auto layout fine-tuned", {
    nodeId: frame.id,
    layoutMode: frame.layoutMode
  });
}

function scaleAutoLayoutMetric(value: number, scale: number): number {
  const scaled = value * scale;
  return Math.round(scaled * 100) / 100;
}

function expandAbsoluteChildren(
  frame: FrameNode,
  horizontal: AxisExpansionPlan,
  vertical: AxisExpansionPlan,
  profile: LayoutProfile
): void {
  const safeWidth = frame.width - horizontal.start - horizontal.end;
  const safeHeight = frame.height - vertical.start - vertical.end;
  if (safeWidth <= 0 || safeHeight <= 0) {
    return;
  }

  const safeBounds = {
    x: horizontal.start,
    y: vertical.start,
    width: safeWidth,
    height: safeHeight
  };

  const absoluteChildren = frame.children.filter((child) => {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
      return false;
    }
    return true;
  });

  if (absoluteChildren.length === 0) {
    return;
  }

  const childSnapshots = absoluteChildren
    .filter((child): child is SceneNode & { x: number; y: number; width: number; height: number } => {
      return (
        typeof (child as SceneNode & { x: unknown }).x === "number" &&
        typeof (child as SceneNode & { y: unknown }).y === "number" &&
        typeof (child as SceneNode & { width: unknown }).width === "number" &&
        typeof (child as SceneNode & { height: unknown }).height === "number"
      );
    })
    .map((child) => ({
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height
    }));

  if (childSnapshots.length === 0) {
    return;
  }

  const planned = planAbsoluteChildPositions({
    profile,
    safeBounds,
    targetAspectRatio: frame.height > 0 ? frame.width / frame.height : safeBounds.width / Math.max(safeBounds.height, 1),
    children: childSnapshots
  });

  const lookup = new Map(planned.map((plan) => [plan.id, plan] as const));

  for (const child of absoluteChildren) {
    const plan = lookup.get(child.id);
    if (!plan) {
      continue;
    }
    if (Number.isFinite(plan.x)) {
      child.x = plan.x;
    }
    if (Number.isFinite(plan.y)) {
      child.y = plan.y;
    }
  }

  debugFixLog("absolute children expanded", {
    nodeId: frame.id,
    safeBounds,
    childCount: absoluteChildren.length,
    profile,
    appliedPlans: planned
  });
}

async function scaleNodeRecursive(node: SceneNode, scale: number, fontCache: Set<string>): Promise<void> {
  if ("children" in node) {
    for (const child of node.children) {
      adjustNodePosition(child as SceneNode, scale);
      await scaleNodeRecursive(child as SceneNode, scale, fontCache);
    }
  }

  if (node.type === "TEXT") {
    await scaleTextNode(node, scale, fontCache);
    return;
  }

  if ("width" in node && "height" in node && typeof node.width === "number" && typeof node.height === "number") {
    const newWidth = node.width * scale;
    const newHeight = node.height * scale;
    if ("resizeWithoutConstraints" in node && typeof node.resizeWithoutConstraints === "function") {
      node.resizeWithoutConstraints(newWidth, newHeight);
    } else if ("resize" in node && typeof node.resize === "function") {
      node.resize(newWidth, newHeight);
    }
  }

  if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
    node.strokeWeight *= scale;
  }

  if ("cornerRadius" in node) {
    const withCornerRadius = node as SceneNode & { cornerRadius?: number | typeof figma.mixed };
    if (withCornerRadius.cornerRadius !== figma.mixed && typeof withCornerRadius.cornerRadius === "number") {
      withCornerRadius.cornerRadius *= scale;
    }
  }
  const rectangleCorners = node as SceneNode & {
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
  };
  if (typeof rectangleCorners.topLeftRadius === "number") {
    rectangleCorners.topLeftRadius *= scale;
  }
  if (typeof rectangleCorners.topRightRadius === "number") {
    rectangleCorners.topRightRadius *= scale;
  }
  if (typeof rectangleCorners.bottomLeftRadius === "number") {
    rectangleCorners.bottomLeftRadius *= scale;
  }
  if (typeof rectangleCorners.bottomRightRadius === "number") {
    rectangleCorners.bottomRightRadius *= scale;
  }

  if ("effects" in node && Array.isArray(node.effects)) {
    node.effects = (node.effects as readonly Effect[]).map((effect) => scaleEffect(effect, scale));
  }

  if ("fills" in node && Array.isArray(node.fills)) {
    node.fills = (node.fills as readonly Paint[]).map((paint) => scalePaint(paint, scale));
  }

  adjustAutoLayoutProperties(node, scale);
}

function adjustNodePosition(node: SceneNode, scale: number): void {
  if ("layoutPositioning" in node) {
    if (node.layoutPositioning === "ABSOLUTE") {
      node.x *= scale;
      node.y *= scale;
    }
    return;
  }

  if ("x" in node && typeof node.x === "number" && "y" in node && typeof node.y === "number") {
    node.x *= scale;
    node.y *= scale;
  }
}

async function scaleTextNode(node: TextNode, scale: number, fontCache: Set<string>): Promise<void> {
  const characters = node.characters;
  if (characters.length === 0) {
    if (node.fontSize !== figma.mixed && typeof node.fontSize === "number") {
      node.fontSize = node.fontSize * scale;
    }
    return;
  }

  const fontNames = await node.getRangeAllFontNames(0, characters.length);
  for (const font of fontNames) {
    const cacheKey = `${font.family}__${font.style}`;
    if (!fontCache.has(cacheKey)) {
      await figma.loadFontAsync(font);
      fontCache.add(cacheKey);
    }
  }

  for (let i = 0; i < characters.length; i += 1) {
    const nextIndex = i + 1;

    const fontSize = node.getRangeFontSize(i, nextIndex);
    if (fontSize !== figma.mixed && typeof fontSize === "number") {
      node.setRangeFontSize(i, nextIndex, fontSize * scale);
    }

    const lineHeight = node.getRangeLineHeight(i, nextIndex);
    if (lineHeight !== figma.mixed && lineHeight.unit === "PIXELS") {
      node.setRangeLineHeight(i, nextIndex, {
        unit: "PIXELS",
        value: lineHeight.value * scale
      });
    }

    const letterSpacing = node.getRangeLetterSpacing(i, nextIndex);
    if (letterSpacing !== figma.mixed && letterSpacing.unit === "PIXELS") {
      node.setRangeLetterSpacing(i, nextIndex, {
        unit: "PIXELS",
        value: letterSpacing.value * scale
      });
    }
  }
}

function scaleEffect(effect: Effect, scale: number): Effect {
  const clone = cloneValue(effect);
  if ((clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") && typeof clone.radius === "number") {
    clone.radius *= scale;
    clone.offset = { x: clone.offset.x * scale, y: clone.offset.y * scale };
  }
  if ((clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") && typeof clone.radius === "number") {
    clone.radius *= scale;
  }
  return clone as Effect;
}

function scalePaint(paint: Paint, scale: number): Paint {
  const clone = cloneValue(paint);
  if ((clone.type === "IMAGE" || clone.type === "VIDEO") && clone.scaleMode === "TILE") {
    clone.scalingFactor = (clone.scalingFactor ?? 1) * scale;
  }

  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR" ||
    clone.type === "GRADIENT_DIAMOND"
  ) {
    const gradientClone = clone as typeof clone & { gradientHandlePositions?: Vector[] };
    if (Array.isArray(gradientClone.gradientHandlePositions)) {
      gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((position) => ({
        x: position.x * scale,
        y: position.y * scale
      }));
    }

    gradientClone.gradientTransform = gradientClone.gradientTransform.map((row: readonly number[]) =>
      row.map((value: number, index: number) => (index === 2 ? value : value * scale))
    ) as Transform;
  }

  return clone as Paint;
}

function repositionChildren(parent: FrameNode, offsetX: number, offsetY: number): void {
  if (!("children" in parent)) {
    return;
  }
  for (const child of parent.children) {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE") {
      continue;
    }
    if ("x" in child && typeof child.x === "number") {
      child.x += offsetX;
    }
    if ("y" in child && typeof child.y === "number") {
      child.y += offsetY;
    }
  }
}

function countAbsoluteChildren(frame: FrameNode): number {
  if (!("children" in frame)) {
    return 0;
  }
  let count = 0;
  for (const child of frame.children) {
    if (hasOverlayRole(child)) {
      continue;
    }
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frame.layoutMode !== "NONE") {
      continue;
    }
    count += 1;
  }
  return count;
}

function adjustAutoLayoutProperties(node: SceneNode, scale: number): void {
  if (node.type !== "FRAME" && node.type !== "COMPONENT") {
    return;
  }
  if (node.layoutMode === "NONE") {
    return;
  }

  node.paddingLeft = scaleAutoLayoutMetric(node.paddingLeft, scale);
  node.paddingRight = scaleAutoLayoutMetric(node.paddingRight, scale);
  node.paddingTop = scaleAutoLayoutMetric(node.paddingTop, scale);
  node.paddingBottom = scaleAutoLayoutMetric(node.paddingBottom, scale);
  node.itemSpacing = scaleAutoLayoutMetric(node.itemSpacing, scale);

  if (node.layoutWrap === "WRAP" && typeof node.counterAxisSpacing === "number") {
    node.counterAxisSpacing = scaleAutoLayoutMetric(node.counterAxisSpacing, scale);
  }
}

function cloneValue<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}
