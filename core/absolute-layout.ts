import { scaleCenterToRange } from "./absolute-geometry.js";
import { debugFixLog } from "./debug.js";
import type { LayoutProfile } from "./layout-profile.js";
import { ASPECT_RATIOS } from "./layout-constants.js";
import { detectElementGroups, optimizeGroupSizes, type ElementGroup } from "./element-groups.js";

export interface AbsoluteChildSnapshot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly nodeType: string;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface AbsolutePlan {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface PlanAbsoluteChildPositionsInput {
  readonly profile: LayoutProfile;
  readonly safeBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly targetAspectRatio?: number;
  readonly children: ReadonlyArray<AbsoluteChildSnapshot>;
}

type Bounds = { x: number; y: number; width: number; height: number };

export function planAbsoluteChildPositions(input: {
  readonly profile: LayoutProfile;
  readonly safeBounds: Bounds;
  readonly targetAspectRatio?: number;
  readonly children: ReadonlyArray<AbsoluteChildSnapshot>;
}): AbsolutePlan[] {
  const { safeBounds } = input;

  // First, try group-aware positioning if we have multiple elements
  if (input.children.length >= 2) {
    return planGroupAwarePositions(input);
  }

  // Fallback to existing logic for single elements
  const contentBounds = measureBounds(input.children);

  if (boundsContain(safeBounds, contentBounds)) {
    return input.children.map((child) => ({ id: child.id, x: round(child.x), y: round(child.y) }));
  }

  const sourceAspectRatio = contentBounds.width / Math.max(contentBounds.height, 1);
  const targetAspectRatio = safeBounds.width / Math.max(safeBounds.height, 1);
  const aspectRatioChange = targetAspectRatio / Math.max(sourceAspectRatio, 0.001);

  return projectChildrenToBounds(
    input.children,
    contentBounds,
    safeBounds,
    input.profile,
    aspectRatioChange
  );
}


/**
 * Plans absolute positioning using element grouping to maintain relationships.
 */
function planGroupAwarePositions(input: {
  readonly profile: LayoutProfile;
  readonly safeBounds: Bounds;
  readonly targetAspectRatio?: number;
  readonly children: ReadonlyArray<AbsoluteChildSnapshot>;
}): AbsolutePlan[] {
  const { safeBounds, profile } = input;

  // For horizontal profiles, preserve existing layout if it fits within safe bounds
  if (profile === "horizontal") {
    const contentBounds = measureBounds(input.children);
    if (boundsContain(safeBounds, contentBounds)) {
      return input.children.map((child) => ({ id: child.id, x: round(child.x), y: round(child.y) }));
    }
  }

  // Detect element groups based on proximity and type
  const elementGroups = optimizeGroupSizes(detectElementGroups(input.children));

  debugFixLog("Element groups detected", {
    totalElements: input.children.length,
    groupCount: elementGroups.length,
    groups: elementGroups.map(group => ({
      type: group.groupType,
      elementCount: group.elements.length,
      elements: group.elements.map(e => ({ id: e.id, type: e.nodeType }))
    }))
  });

  // Check if we should use vertical stacking for extreme vertical targets
  if (profile === "vertical" && elementGroups.length >= 2) {
    const safeAspectRatio = safeBounds.height > 0 ? safeBounds.width / safeBounds.height : 1;
    const targetAspectRatio =
      typeof input.targetAspectRatio === "number" && Number.isFinite(input.targetAspectRatio)
        ? Math.max(0, input.targetAspectRatio)
        : safeAspectRatio;
    const extremeVertical = Math.min(safeAspectRatio, targetAspectRatio) < ASPECT_RATIOS.EXTREME_VERTICAL;

    if (extremeVertical) {
      return planGroupVerticalStack(elementGroups, safeBounds);
    }
  }

  // Use group-aware positioning for other layouts
  return planGroupPositioning(elementGroups, safeBounds, profile, input.targetAspectRatio);
}

/**
 * Stacks element groups vertically while maintaining internal group spacing.
 */
function planGroupVerticalStack(groups: ReadonlyArray<ElementGroup>, safeBounds: Bounds): AbsolutePlan[] {
  const plans: AbsolutePlan[] = [];

  // Calculate total height needed for all groups
  const totalGroupHeight = groups.reduce((sum, group) => sum + group.bounds.height, 0);
  const gapCount = Math.max(groups.length - 1, 0);
  const availableForGaps = Math.max(safeBounds.height - totalGroupHeight, 0);
  const gapSize = gapCount > 0 ? availableForGaps / gapCount : 0;

  let cursorY = safeBounds.y;

  for (const group of groups) {
    // Calculate target position for the group
    const groupTargetY = clamp(cursorY, safeBounds.y, safeBounds.y + safeBounds.height - group.bounds.height);
    const groupTargetX = safeBounds.x + (safeBounds.width - group.bounds.width) / 2;

    // Calculate offset from group's current position to target
    const offsetX = groupTargetX - group.bounds.x;
    const offsetY = groupTargetY - group.bounds.y;

    // Position all elements in the group maintaining their relative positions
    for (const element of group.elements) {
      const targetX = clamp(
        element.bounds.x + offsetX,
        safeBounds.x,
        safeBounds.x + safeBounds.width - element.bounds.width
      );
      const targetY = clamp(
        element.bounds.y + offsetY,
        safeBounds.y,
        safeBounds.y + safeBounds.height - element.bounds.height
      );

      plans.push({
        id: element.id,
        x: round(targetX),
        y: round(targetY)
      });
    }

    cursorY = groupTargetY + group.bounds.height + gapSize;
  }

  return plans;
}

/**
 * Positions element groups with smart layout based on target profile.
 */
function planGroupPositioning(
  groups: ReadonlyArray<ElementGroup>,
  safeBounds: Bounds,
  profile: LayoutProfile,
  targetAspectRatio?: number
): AbsolutePlan[] {
  const plans: AbsolutePlan[] = [];

  if (groups.length === 1) {
    // Single group - center it in the safe area
    const group = groups[0];
    const centerX = safeBounds.x + (safeBounds.width - group.bounds.width) / 2;
    const centerY = safeBounds.y + (safeBounds.height - group.bounds.height) / 2;

    const offsetX = centerX - group.bounds.x;
    const offsetY = centerY - group.bounds.y;

    for (const element of group.elements) {
      plans.push({
        id: element.id,
        x: round(element.bounds.x + offsetX),
        y: round(element.bounds.y + offsetY)
      });
    }

    return plans;
  }

  // Multiple groups - use layout-aware distribution
  if (profile === "horizontal" && groups.length === 2) {
    // Split layout: position groups side by side
    return planTwoGroupSplit(groups, safeBounds);
  }

  // Fallback to grid layout for complex scenarios
  return planGroupGrid(groups, safeBounds);
}

/**
 * Positions two groups side by side for horizontal layouts.
 */
function planTwoGroupSplit(groups: ReadonlyArray<ElementGroup>, safeBounds: Bounds): AbsolutePlan[] {
  const plans: AbsolutePlan[] = [];
  const [leftGroup, rightGroup] = groups;

  // Allocate space proportionally based on group widths
  const totalWidth = leftGroup.bounds.width + rightGroup.bounds.width;
  const leftWidth = (leftGroup.bounds.width / totalWidth) * safeBounds.width;
  const rightWidth = safeBounds.width - leftWidth;

  // Position left group
  const leftX = safeBounds.x + (leftWidth - leftGroup.bounds.width) / 2;
  const leftY = safeBounds.y + (safeBounds.height - leftGroup.bounds.height) / 2;
  const leftOffsetX = leftX - leftGroup.bounds.x;
  const leftOffsetY = leftY - leftGroup.bounds.y;

  for (const element of leftGroup.elements) {
    plans.push({
      id: element.id,
      x: round(element.bounds.x + leftOffsetX),
      y: round(element.bounds.y + leftOffsetY)
    });
  }

  // Position right group
  const rightX = safeBounds.x + leftWidth + (rightWidth - rightGroup.bounds.width) / 2;
  const rightY = safeBounds.y + (safeBounds.height - rightGroup.bounds.height) / 2;
  const rightOffsetX = rightX - rightGroup.bounds.x;
  const rightOffsetY = rightY - rightGroup.bounds.y;

  for (const element of rightGroup.elements) {
    plans.push({
      id: element.id,
      x: round(element.bounds.x + rightOffsetX),
      y: round(element.bounds.y + rightOffsetY)
    });
  }

  return plans;
}

/**
 * Positions groups in a grid layout for complex scenarios.
 */
function planGroupGrid(groups: ReadonlyArray<ElementGroup>, safeBounds: Bounds): AbsolutePlan[] {
  const plans: AbsolutePlan[] = [];

  // Simple grid: arrange groups top to bottom, left to right
  const cols = Math.ceil(Math.sqrt(groups.length));
  const rows = Math.ceil(groups.length / cols);
  const cellWidth = safeBounds.width / cols;
  const cellHeight = safeBounds.height / rows;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const cellX = safeBounds.x + col * cellWidth;
    const cellY = safeBounds.y + row * cellHeight;
    const centerX = cellX + (cellWidth - group.bounds.width) / 2;
    const centerY = cellY + (cellHeight - group.bounds.height) / 2;

    const offsetX = centerX - group.bounds.x;
    const offsetY = centerY - group.bounds.y;

    for (const element of group.elements) {
      const targetX = clamp(
        element.bounds.x + offsetX,
        safeBounds.x,
        safeBounds.x + safeBounds.width - element.bounds.width
      );
      const targetY = clamp(
        element.bounds.y + offsetY,
        safeBounds.y,
        safeBounds.y + safeBounds.height - element.bounds.height
      );

      plans.push({
        id: element.id,
        x: round(targetX),
        y: round(targetY)
      });
    }
  }

  return plans;
}

function projectChildrenToBounds(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds,
  profile?: LayoutProfile,
  aspectRatioChange?: number
): AbsolutePlan[] {
  // For extreme aspect ratio changes, use smart positioning instead of naive center mapping
  if (profile && aspectRatioChange && shouldUseSmartPositioning(aspectRatioChange, profile)) {
    return projectChildrenWithSmartPositioning(children, source, target, profile, aspectRatioChange);
  }

  // Fallback to existing center-point mapping logic
  const sourceRangeX = { start: source.x, size: source.width };
  const sourceRangeY = { start: source.y, size: source.height };
  const targetRangeX = { start: target.x, size: target.width };
  const targetRangeY = { start: target.y, size: target.height };

  return children.map((child) => {
    const centerX = child.x + child.width / 2;
    const centerY = child.y + child.height / 2;

    const mappedCenterX = scaleCenterToRange(centerX, sourceRangeX, targetRangeX);
    const mappedCenterY = scaleCenterToRange(centerY, sourceRangeY, targetRangeY);

    const nextX = clamp(mappedCenterX - child.width / 2, target.x, target.x + target.width - child.width);
    const nextY = clamp(mappedCenterY - child.height / 2, target.y, target.y + target.height - child.height);

    return {
      id: child.id,
      x: round(nextX),
      y: round(nextY)
    };
  });
}

/**
 * Determines if smart positioning should be used based on aspect ratio change magnitude
 */
function shouldUseSmartPositioning(aspectRatioChange: number, profile: LayoutProfile): boolean {
  // Use smart positioning for extreme aspect ratio changes (>2x or <0.5x change)
  const extremeChange = aspectRatioChange > 2.0 || aspectRatioChange < 0.5;

  debugFixLog("aspect ratio positioning decision", {
    aspectRatioChange: aspectRatioChange.toFixed(3),
    profile,
    extremeChange,
    useSmartPositioning: extremeChange
  });

  return extremeChange;
}

/**
 * Smart positioning for extreme aspect ratio changes
 * Uses layout-aware positioning instead of naive center mapping
 */
function projectChildrenWithSmartPositioning(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds,
  profile: LayoutProfile,
  aspectRatioChange: number
): AbsolutePlan[] {
  debugFixLog("using smart positioning", {
    childCount: children.length,
    profile,
    aspectRatioChange: aspectRatioChange.toFixed(3),
    sourceBounds: source,
    targetBounds: target
  });

  // For vertical targets: prioritize Y-axis positioning accuracy and stack elements
  if (profile === "vertical") {
    return projectChildrenForVerticalTarget(children, source, target);
  }

  // For horizontal targets: prioritize X-axis positioning and create side-by-side layouts
  if (profile === "horizontal") {
    return projectChildrenForHorizontalTarget(children, source, target);
  }

  // For square targets: balanced approach with slight bias toward centering
  return projectChildrenForSquareTarget(children, source, target);
}

/**
 * Project children for vertical targets (TikTok, phone formats)
 * Emphasizes vertical stacking with proper spacing
 */
function projectChildrenForVerticalTarget(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds
): AbsolutePlan[] {
  // Sort children by original vertical position to maintain reading order
  const sortedChildren = [...children].sort((a, b) => {
    const aCenter = a.y + a.height / 2;
    const bCenter = b.y + b.height / 2;
    return aCenter - bCenter;
  });

  const plans: AbsolutePlan[] = [];
  const totalChildrenHeight = sortedChildren.reduce((sum, child) => sum + child.height, 0);
  const availableHeight = target.height - totalChildrenHeight;
  const gapCount = Math.max(sortedChildren.length - 1, 0);
  const gapSize = gapCount > 0 ? Math.max(availableHeight / (gapCount + 1), 8) : availableHeight / 2;

  let currentY = target.y + gapSize;

  sortedChildren.forEach((child) => {
    // Center horizontally, stack vertically
    const targetX = target.x + (target.width - child.width) / 2;
    const constrainedX = clamp(targetX, target.x, target.x + target.width - child.width);
    const constrainedY = clamp(currentY, target.y, target.y + target.height - child.height);

    plans.push({
      id: child.id,
      x: round(constrainedX),
      y: round(constrainedY)
    });

    currentY = constrainedY + child.height + gapSize;
  });

  return plans;
}

/**
 * Project children for horizontal targets (YouTube, web banners)
 * Emphasizes side-by-side layout with proper spacing
 */
function projectChildrenForHorizontalTarget(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds
): AbsolutePlan[] {
  // Sort children by original horizontal position
  const sortedChildren = [...children].sort((a, b) => {
    const aCenter = a.x + a.width / 2;
    const bCenter = b.x + b.width / 2;
    return aCenter - bCenter;
  });

  const plans: AbsolutePlan[] = [];
  const totalChildrenWidth = sortedChildren.reduce((sum, child) => sum + child.width, 0);
  const availableWidth = target.width - totalChildrenWidth;
  const gapCount = Math.max(sortedChildren.length - 1, 0);
  const gapSize = gapCount > 0 ? Math.max(availableWidth / (gapCount + 1), 16) : availableWidth / 2;

  let currentX = target.x + gapSize;

  sortedChildren.forEach((child) => {
    // Center vertically, distribute horizontally
    const targetY = target.y + (target.height - child.height) / 2;
    const constrainedX = clamp(currentX, target.x, target.x + target.width - child.width);
    const constrainedY = clamp(targetY, target.y, target.y + target.height - child.height);

    plans.push({
      id: child.id,
      x: round(constrainedX),
      y: round(constrainedY)
    });

    currentX = constrainedX + child.width + gapSize;
  });

  return plans;
}

/**
 * Project children for square targets with balanced approach
 */
function projectChildrenForSquareTarget(
  children: ReadonlyArray<AbsoluteChildSnapshot>,
  source: Bounds,
  target: Bounds
): AbsolutePlan[] {
  // Use a hybrid approach: maintain relative positions but with bias toward centering
  const sourceRangeX = { start: source.x, size: source.width };
  const sourceRangeY = { start: source.y, size: source.height };
  const targetRangeX = { start: target.x, size: target.width };
  const targetRangeY = { start: target.y, size: target.height };

  return children.map((child) => {
    const centerX = child.x + child.width / 2;
    const centerY = child.y + child.height / 2;

    // Apply scaling with bias toward center (80% scaled position + 20% centered)
    const scaledCenterX = scaleCenterToRange(centerX, sourceRangeX, targetRangeX);
    const scaledCenterY = scaleCenterToRange(centerY, sourceRangeY, targetRangeY);

    const centeredX = target.x + target.width / 2;
    const centeredY = target.y + target.height / 2;

    const blendedCenterX = scaledCenterX * 0.8 + centeredX * 0.2;
    const blendedCenterY = scaledCenterY * 0.8 + centeredY * 0.2;

    const nextX = clamp(blendedCenterX - child.width / 2, target.x, target.x + target.width - child.width);
    const nextY = clamp(blendedCenterY - child.height / 2, target.y, target.y + target.height - child.height);

    return {
      id: child.id,
      x: round(nextX),
      y: round(nextY)
    };
  });
}

function measureBounds(children: ReadonlyArray<AbsoluteChildSnapshot>): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const child of children) {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}



function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width + 0.01 &&
    inner.y + inner.height <= outer.y + outer.height + 0.01
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}