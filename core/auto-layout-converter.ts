/**
 * Auto-Layout Converter
 *
 * Smart detection and conversion of non-auto-layout frames to auto-layout
 * before scaling begins. This improves variant quality by giving the scaling
 * algorithm properly structured content to work with.
 */

import { debugFixLog } from "./debug.js";

// ============================================================================
// Types
// ============================================================================

export interface ChildBounds {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly nodeType: string;
  readonly name: string;
}

export interface AutoLayoutConversionCandidate {
  readonly suggestedLayoutMode: "HORIZONTAL" | "VERTICAL";
  readonly suggestedSpacing: number;
  readonly children: ReadonlyArray<ConversionChildAnalysis>;
  readonly confidence: number;
}

export interface ConversionChildAnalysis {
  readonly id: string;
  readonly position: "flow" | "absolute";
  readonly bounds: ChildBounds;
  readonly reason?: string;
}

export interface ConversionResult {
  readonly applied: boolean;
  readonly layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  readonly spacingApplied: number;
  readonly absoluteChildren: ReadonlyArray<string>;
}

type ChildArrangement = "horizontal" | "vertical" | "mixed" | "chaotic";

// ============================================================================
// Constants
// ============================================================================

const CONVERSION_CONFIDENCE_THRESHOLD = 0.45;
const ALIGNMENT_THRESHOLD = 0.65;
const MIN_CHILDREN_FOR_CONVERSION = 2;
const MAX_REASONABLE_GAP = 200;
const BACKGROUND_COVERAGE_THRESHOLD = 0.85;
const EDGE_THRESHOLD_RATIO = 0.15;

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Extracts child bounds information from a frame's children.
 */
function extractChildBounds(frame: FrameNode): ReadonlyArray<ChildBounds> {
  const results: ChildBounds[] = [];

  for (const child of frame.children) {
    if (!("width" in child) || !("height" in child)) continue;
    if (typeof child.width !== "number" || typeof child.height !== "number") continue;

    results.push({
      id: child.id,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      nodeType: child.type,
      name: child.name
    });
  }

  return results;
}

/**
 * Calculates an alignment score to determine how well children
 * are arranged along a particular axis.
 *
 * For horizontal arrangement: children should have similar Y centers
 * For vertical arrangement: children should have similar X centers
 */
function calculateAlignmentScore(
  sortedBounds: ReadonlyArray<ChildBounds>,
  direction: "horizontal" | "vertical"
): number {
  if (sortedBounds.length < 2) return 0;

  // Calculate center positions along the cross-axis
  const crossAxisCenters = sortedBounds.map((b) =>
    direction === "horizontal"
      ? b.y + b.height / 2
      : b.x + b.width / 2
  );

  // Calculate variance in cross-axis positions
  const mean = crossAxisCenters.reduce((a, b) => a + b, 0) / crossAxisCenters.length;
  const variance = crossAxisCenters.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / crossAxisCenters.length;
  const stdDev = Math.sqrt(variance);

  // Calculate average element size on cross-axis for normalization
  const avgCrossSize = sortedBounds.reduce((sum, b) =>
    sum + (direction === "horizontal" ? b.height : b.width), 0
  ) / sortedBounds.length;

  // Score inversely proportional to normalized deviation
  // Low stdDev relative to element size = high alignment = good score
  const normalizedDeviation = stdDev / Math.max(avgCrossSize, 1);
  const score = Math.max(0, 1 - normalizedDeviation);

  return score;
}

/**
 * Determines the primary arrangement pattern of children within a frame.
 */
export function calculateChildArrangement(children: ReadonlyArray<ChildBounds>): ChildArrangement {
  if (children.length < 2) return "chaotic";

  // Sort by position on each axis
  const sortedByX = [...children].sort((a, b) => a.x - b.x);
  const sortedByY = [...children].sort((a, b) => a.y - b.y);

  // Calculate alignment scores
  const horizontalAlignmentScore = calculateAlignmentScore(sortedByX, "horizontal");
  const verticalAlignmentScore = calculateAlignmentScore(sortedByY, "vertical");

  debugFixLog("arrangement analysis", {
    horizontalScore: horizontalAlignmentScore.toFixed(2),
    verticalScore: verticalAlignmentScore.toFixed(2)
  });

  // Calculate which direction dominates
  const scoreDifference = Math.abs(horizontalAlignmentScore - verticalAlignmentScore);
  const maxScore = Math.max(horizontalAlignmentScore, verticalAlignmentScore);
  const minScore = Math.min(horizontalAlignmentScore, verticalAlignmentScore);

  // Strong clear winner: one axis has good alignment AND dominates the other
  if (maxScore >= ALIGNMENT_THRESHOLD && scoreDifference >= 0.15) {
    return horizontalAlignmentScore > verticalAlignmentScore ? "horizontal" : "vertical";
  }

  // Moderate winner: one axis is reasonable AND clearly better than the other
  if (maxScore >= 0.55 && scoreDifference >= 0.12) {
    return horizontalAlignmentScore > verticalAlignmentScore ? "horizontal" : "vertical";
  }

  // Both axes have similar reasonable scores - could work either way
  if (minScore >= 0.5 && scoreDifference < 0.1) {
    return "mixed";
  }

  return "chaotic";
}

/**
 * Infers optimal spacing by analyzing gaps between children.
 */
export function inferOptimalSpacing(
  children: ReadonlyArray<ChildBounds>,
  direction: "horizontal" | "vertical"
): number {
  if (children.length < 2) return 16; // Default spacing

  const gaps: number[] = [];
  const sorted = [...children].sort((a, b) =>
    direction === "horizontal" ? a.x - b.x : a.y - b.y
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const gap = direction === "horizontal"
      ? curr.x - (prev.x + prev.width)
      : curr.y - (prev.y + prev.height);

    // Only consider reasonable positive gaps
    if (gap > 0 && gap < MAX_REASONABLE_GAP) {
      gaps.push(gap);
    }
  }

  if (gaps.length === 0) return 16;

  // Use median for robustness against outliers
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];

  return Math.round(median);
}

/**
 * Determines if a child element is a background (should stay absolute).
 */
function isBackgroundElement(
  child: ChildBounds,
  parentWidth: number,
  parentHeight: number
): boolean {
  const parentArea = parentWidth * parentHeight;
  const childArea = child.width * child.height;
  const coverageRatio = childArea / Math.max(parentArea, 1);

  // Check if element covers most of the parent
  if (coverageRatio >= BACKGROUND_COVERAGE_THRESHOLD) {
    return true;
  }

  // Check by name patterns
  const lowerName = child.name.toLowerCase();
  if (
    lowerName.includes("background") ||
    lowerName.includes("bg") ||
    lowerName === "cover" ||
    lowerName === "backdrop"
  ) {
    return true;
  }

  return false;
}

/**
 * Determines if a child is positioned at a frame edge (corner floating element).
 */
function isEdgeFloatingElement(
  child: ChildBounds,
  parentWidth: number,
  parentHeight: number
): boolean {
  const edgeThresholdX = parentWidth * EDGE_THRESHOLD_RATIO;
  const edgeThresholdY = parentHeight * EDGE_THRESHOLD_RATIO;

  const nearLeftEdge = child.x < edgeThresholdX;
  const nearRightEdge = child.x + child.width > parentWidth - edgeThresholdX;
  const nearTopEdge = child.y < edgeThresholdY;
  const nearBottomEdge = child.y + child.height > parentHeight - edgeThresholdY;

  // Consider it edge-floating if it's in a corner and relatively small
  const isInCorner =
    (nearLeftEdge || nearRightEdge) && (nearTopEdge || nearBottomEdge);
  const isSmall =
    child.width < parentWidth * 0.25 && child.height < parentHeight * 0.25;

  return isInCorner && isSmall;
}

/**
 * Determines if a child deviates significantly from the detected stack pattern.
 */
function isPositionOutlier(
  child: ChildBounds,
  siblings: ReadonlyArray<ChildBounds>,
  stackDirection: "horizontal" | "vertical"
): boolean {
  if (siblings.length < 2) return false;

  // Calculate the center position along the cross-axis
  const crossAxisCenters = siblings.map((s) =>
    stackDirection === "horizontal"
      ? s.y + s.height / 2
      : s.x + s.width / 2
  );

  const mean = crossAxisCenters.reduce((a, b) => a + b, 0) / crossAxisCenters.length;
  const variance = crossAxisCenters.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / crossAxisCenters.length;
  const stdDev = Math.sqrt(variance);

  // Child's cross-axis center
  const childCrossCenter = stackDirection === "horizontal"
    ? child.y + child.height / 2
    : child.x + child.width / 2;

  // Check if child is more than 2 std deviations from mean
  const deviation = Math.abs(childCrossCenter - mean);
  return deviation > 2 * Math.max(stdDev, 20);
}

/**
 * Classifies a child as flow (participates in auto-layout) or absolute (stays positioned).
 */
export function classifyChildPosition(
  child: ChildBounds,
  siblings: ReadonlyArray<ChildBounds>,
  parentWidth: number,
  parentHeight: number,
  stackDirection: "horizontal" | "vertical"
): { position: "flow" | "absolute"; reason?: string } {
  // Background elements stay absolute
  if (isBackgroundElement(child, parentWidth, parentHeight)) {
    return { position: "absolute", reason: "background" };
  }

  // Edge floating elements (corner logos, badges) stay absolute
  if (isEdgeFloatingElement(child, parentWidth, parentHeight)) {
    return { position: "absolute", reason: "edge-floating" };
  }

  // Position outliers stay absolute
  if (isPositionOutlier(child, siblings, stackDirection)) {
    return { position: "absolute", reason: "position-outlier" };
  }

  return { position: "flow" };
}

// ============================================================================
// Main Analysis Entry Point
// ============================================================================

/**
 * Analyzes a frame without auto-layout to determine if it would benefit
 * from conversion and what configuration to use.
 */
export function analyzeFrameForAutoLayoutConversion(
  frame: FrameNode
): AutoLayoutConversionCandidate | null {
  // Already has auto-layout
  if (frame.layoutMode !== "NONE") {
    return null;
  }

  const childBounds = extractChildBounds(frame);

  // Not enough children to benefit
  if (childBounds.length < MIN_CHILDREN_FOR_CONVERSION) {
    return null;
  }

  const arrangement = calculateChildArrangement(childBounds);

  // Can't determine a clear arrangement
  if (arrangement === "chaotic" || arrangement === "mixed") {
    debugFixLog("auto-layout conversion skipped", {
      frameId: frame.id,
      reason: arrangement,
      childCount: childBounds.length
    });
    return null;
  }

  const suggestedLayoutMode = arrangement === "horizontal" ? "HORIZONTAL" : "VERTICAL";
  const suggestedSpacing = inferOptimalSpacing(childBounds, arrangement);

  // Classify each child
  const children: ConversionChildAnalysis[] = childBounds.map((child) => {
    const classification = classifyChildPosition(
      child,
      childBounds,
      frame.width,
      frame.height,
      arrangement
    );
    return {
      id: child.id,
      position: classification.position,
      bounds: child,
      reason: classification.reason
    };
  });

  // Calculate confidence based on:
  // - How many children will participate in flow
  // - How clear the arrangement is
  const flowChildren = children.filter((c) => c.position === "flow");
  const flowRatio = flowChildren.length / children.length;

  // Recalculate alignment score for confidence
  const sortedForArrangement = arrangement === "horizontal"
    ? [...childBounds].sort((a, b) => a.x - b.x)
    : [...childBounds].sort((a, b) => a.y - b.y);
  const alignmentScore = calculateAlignmentScore(sortedForArrangement, arrangement);

  const confidence = flowRatio * 0.5 + alignmentScore * 0.5;

  debugFixLog("auto-layout conversion analysis", {
    frameId: frame.id,
    arrangement,
    spacing: suggestedSpacing,
    flowCount: flowChildren.length,
    absoluteCount: children.length - flowChildren.length,
    confidence: confidence.toFixed(2)
  });

  return {
    suggestedLayoutMode,
    suggestedSpacing,
    children,
    confidence
  };
}

/**
 * Decides whether a frame should be converted based on analysis results.
 */
export function shouldConvertToAutoLayout(
  frame: FrameNode,
  candidate: AutoLayoutConversionCandidate
): boolean {
  // Already has auto-layout
  if (frame.layoutMode !== "NONE") return false;

  // Not enough children to benefit
  if (candidate.children.length < MIN_CHILDREN_FOR_CONVERSION) return false;

  // Confidence too low
  if (candidate.confidence < CONVERSION_CONFIDENCE_THRESHOLD) return false;

  // Check if at least half of children will participate in flow
  const flowChildren = candidate.children.filter((c) => c.position === "flow");
  if (flowChildren.length < candidate.children.length * 0.5) return false;

  return true;
}

// ============================================================================
// Application
// ============================================================================

/**
 * Applies auto-layout conversion to a frame based on the analysis candidate.
 */
export function applyAutoLayoutToFrame(
  frame: FrameNode,
  candidate: AutoLayoutConversionCandidate
): ConversionResult {
  const absoluteChildIds: string[] = [];

  // Identify children that should remain absolute
  for (const childAnalysis of candidate.children) {
    if (childAnalysis.position === "absolute") {
      absoluteChildIds.push(childAnalysis.id);
    }
  }

  // Apply layout mode
  frame.layoutMode = candidate.suggestedLayoutMode;
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.itemSpacing = candidate.suggestedSpacing;

  // Set alignment based on layout mode with intelligent defaults
  if (candidate.suggestedLayoutMode === "VERTICAL") {
    // For vertical layouts, default to top-aligned (MIN) which is more common for content flows
    frame.primaryAxisAlignItems = "MIN";
    frame.counterAxisAlignItems = "CENTER";
  } else if (candidate.suggestedLayoutMode === "HORIZONTAL") {
    // For horizontal layouts, center alignment works well for most cases
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
  } else {
    // Fallback for NONE or other modes
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
  }

  // Set absolute positioning on identified children
  for (const child of frame.children) {
    if (absoluteChildIds.includes(child.id)) {
      if ("layoutPositioning" in child) {
        (child as SceneNode & { layoutPositioning: "AUTO" | "ABSOLUTE" }).layoutPositioning = "ABSOLUTE";
      }
    }
  }

  debugFixLog("auto-layout conversion applied", {
    frameId: frame.id,
    layoutMode: candidate.suggestedLayoutMode,
    spacing: candidate.suggestedSpacing,
    absoluteChildCount: absoluteChildIds.length,
    flowChildCount: candidate.children.length - absoluteChildIds.length
  });

  return {
    applied: true,
    layoutMode: candidate.suggestedLayoutMode,
    spacingApplied: candidate.suggestedSpacing,
    absoluteChildren: absoluteChildIds
  };
}

/**
 * Convenience function that performs analysis and application in one step.
 * Returns true if conversion was applied, false otherwise.
 */
export function convertFrameToAutoLayoutIfBeneficial(frame: FrameNode): boolean {
  const candidate = analyzeFrameForAutoLayoutConversion(frame);
  if (!candidate) return false;

  if (!shouldConvertToAutoLayout(frame, candidate)) return false;

  applyAutoLayoutToFrame(frame, candidate);
  return true;
}
