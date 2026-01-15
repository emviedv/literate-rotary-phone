/**
 * Grid system detection for enhanced layout analysis.
 * Analyzes alignment patterns, spacing consistency, and grid structure
 * to understand design system conventions and layout organization.
 */

/**
 * Grid detection result with comprehensive layout analysis.
 */
export interface GridDetectionResult {
  readonly hasGridSystem: boolean;
  readonly gridType: "12-column" | "flex" | "css-grid" | "manual";
  readonly columnCount?: number;
  readonly rowCount?: number;
  readonly gutterWidth: number;
  readonly alignment: "left" | "center" | "right" | "justified";
  readonly breakpoints?: Array<{ width: number; columns: number }>;
  readonly gridItems: Array<{
    nodeId: string;
    gridPosition: { row: number; column: number; span: number };
    alignment: "start" | "center" | "end" | "stretch";
  }>;
  readonly confidence: number; // 0-1 how confident we are this is a true grid
}

/**
 * Column and row position analysis.
 */
interface PositionAnalysis {
  readonly positions: readonly number[];
  readonly commonGaps: readonly number[];
  readonly alignment: "start" | "center" | "distributed";
  readonly consistency: number; // 0-1 how consistent the spacing is
}

/**
 * Tolerance settings for grid detection.
 */
const GRID_DETECTION_CONFIG = {
  COLUMN_TOLERANCE: 4,      // px tolerance for column alignment
  ROW_TOLERANCE: 4,         // px tolerance for row alignment
  MIN_ITEMS_FOR_GRID: 4,    // Minimum items needed to detect a grid
  GUTTER_TOLERANCE: 2,      // px tolerance for gutter consistency
  MIN_CONFIDENCE: 0.6       // Minimum confidence to report a grid
} as const;

/**
 * Detects grid system patterns in a frame's layout.
 * Analyzes horizontal and vertical alignment patterns to identify grid structure.
 */
export function detectGridSystem(frame: FrameNode): GridDetectionResult {
  const children = frame.children.filter(child => child.visible && "absoluteBoundingBox" in child);

  if (children.length < GRID_DETECTION_CONFIG.MIN_ITEMS_FOR_GRID) {
    return createEmptyGridResult();
  }

  // Analyze horizontal alignment patterns (columns)
  const horizontalAnalysis = analyzeHorizontalPositions(children, frame);

  // Analyze vertical alignment patterns (rows)
  const verticalAnalysis = analyzeVerticalPositions(children, frame);

  // Determine if this looks like a grid
  const isGridLike = horizontalAnalysis.positions.length >= 2 &&
                     horizontalAnalysis.consistency > 0.7 &&
                     verticalAnalysis.consistency > 0.5;

  if (!isGridLike) {
    return createEmptyGridResult();
  }

  // Infer grid type and properties
  const gridType = inferGridType(horizontalAnalysis, verticalAnalysis, children);
  const gutterWidth = calculateMostCommonGap(horizontalAnalysis.commonGaps);
  const alignment = inferFrameAlignment(children, frame);

  // Map children to grid positions
  const gridItems = mapChildrenToGrid(
    children,
    horizontalAnalysis.positions,
    verticalAnalysis.positions
  );

  // Calculate confidence score
  const confidence = calculateGridConfidence(horizontalAnalysis, verticalAnalysis, gridItems);

  return {
    hasGridSystem: confidence >= GRID_DETECTION_CONFIG.MIN_CONFIDENCE,
    gridType,
    columnCount: horizontalAnalysis.positions.length,
    rowCount: verticalAnalysis.positions.length,
    gutterWidth,
    alignment,
    gridItems,
    confidence
  };
}

/**
 * Analyzes horizontal positions to detect column structure.
 */
function analyzeHorizontalPositions(
  children: readonly SceneNode[],
  frame: FrameNode
): PositionAnalysis {
  const frameBounds = frame.absoluteBoundingBox!;

  // Get all left edges relative to frame
  const leftEdges = children
    .map(child => {
      const bounds = (child as any).absoluteBoundingBox;
      return bounds ? bounds.x - frameBounds.x : 0;
    })
    .filter(x => x >= 0);

  // Find repeating positions (column starts)
  const columnStarts = findRepeatingPositions(leftEdges, GRID_DETECTION_CONFIG.COLUMN_TOLERANCE);

  // Calculate gaps between columns
  const gaps = calculateGaps(columnStarts);

  // Analyze alignment consistency
  const consistency = calculatePositionConsistency(leftEdges, columnStarts);
  const alignment = inferHorizontalAlignment(leftEdges, frame.width);

  return {
    positions: columnStarts,
    commonGaps: gaps,
    alignment,
    consistency
  };
}

/**
 * Analyzes vertical positions to detect row structure.
 */
function analyzeVerticalPositions(
  children: readonly SceneNode[],
  frame: FrameNode
): PositionAnalysis {
  const frameBounds = frame.absoluteBoundingBox!;

  // Get all top edges relative to frame
  const topEdges = children
    .map(child => {
      const bounds = (child as any).absoluteBoundingBox;
      return bounds ? bounds.y - frameBounds.y : 0;
    })
    .filter(y => y >= 0);

  // Find repeating positions (row starts)
  const rowStarts = findRepeatingPositions(topEdges, GRID_DETECTION_CONFIG.ROW_TOLERANCE);

  // Calculate gaps between rows
  const gaps = calculateGaps(rowStarts);

  // Analyze alignment consistency
  const consistency = calculatePositionConsistency(topEdges, rowStarts);
  const alignment = inferVerticalAlignment(topEdges, frame.height);

  return {
    positions: rowStarts,
    commonGaps: gaps,
    alignment,
    consistency
  };
}

/**
 * Finds positions that repeat frequently enough to suggest grid lines.
 */
function findRepeatingPositions(positions: number[], tolerance: number): number[] {
  if (positions.length === 0) return [];

  const sortedPositions = [...positions].sort((a, b) => a - b);
  const clusters: Array<{ position: number; count: number }> = [];

  for (const pos of sortedPositions) {
    // Find existing cluster within tolerance
    const existingCluster = clusters.find(
      cluster => Math.abs(cluster.position - pos) <= tolerance
    );

    if (existingCluster) {
      // Add to existing cluster and update average position
      existingCluster.position = (existingCluster.position * existingCluster.count + pos) / (existingCluster.count + 1);
      existingCluster.count++;
    } else {
      // Create new cluster
      clusters.push({ position: pos, count: 1 });
    }
  }

  // Return positions that appear frequently enough (at least 2 elements)
  return clusters
    .filter(cluster => cluster.count >= 2)
    .map(cluster => Math.round(cluster.position))
    .sort((a, b) => a - b);
}

/**
 * Calculates gaps between consecutive positions.
 */
function calculateGaps(positions: readonly number[]): number[] {
  if (positions.length < 2) return [];

  const gaps: number[] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    gaps.push(positions[i + 1] - positions[i]);
  }

  return gaps;
}

/**
 * Calculates how consistently positions align to detected grid lines.
 */
function calculatePositionConsistency(
  actualPositions: readonly number[],
  gridPositions: readonly number[]
): number {
  if (gridPositions.length === 0) return 0;

  let alignedCount = 0;
  const tolerance = GRID_DETECTION_CONFIG.COLUMN_TOLERANCE;

  for (const pos of actualPositions) {
    const isAligned = gridPositions.some(gridPos => Math.abs(pos - gridPos) <= tolerance);
    if (isAligned) alignedCount++;
  }

  return alignedCount / actualPositions.length;
}

/**
 * Infers horizontal alignment pattern (left, center, distributed).
 */
function inferHorizontalAlignment(positions: readonly number[], frameWidth: number): "start" | "center" | "distributed" {
  if (positions.length < 2) return "start";

  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const spread = maxPos - minPos;
  const centerPos = frameWidth / 2;

  // Check if positions are centered
  const avgPos = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  if (Math.abs(avgPos - centerPos) < frameWidth * 0.1) {
    return "center";
  }

  // Check if positions span most of the frame (distributed)
  if (spread > frameWidth * 0.6) {
    return "distributed";
  }

  return "start";
}

/**
 * Infers vertical alignment pattern.
 */
function inferVerticalAlignment(positions: readonly number[], frameHeight: number): "start" | "center" | "distributed" {
  if (positions.length < 2) return "start";

  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const spread = maxPos - minPos;
  const centerPos = frameHeight / 2;

  // Check if positions are centered
  const avgPos = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  if (Math.abs(avgPos - centerPos) < frameHeight * 0.1) {
    return "center";
  }

  // Check if positions span most of the frame (distributed)
  if (spread > frameHeight * 0.6) {
    return "distributed";
  }

  return "start";
}

/**
 * Infers the type of grid system being used.
 */
function inferGridType(
  horizontal: PositionAnalysis,
  vertical: PositionAnalysis,
  children: readonly SceneNode[]
): GridDetectionResult["gridType"] {
  const columnCount = horizontal.positions.length;

  // Common grid systems
  if (columnCount === 12) return "12-column";
  if (columnCount === 16) return "12-column"; // Map 16-column to 12-column for compatibility

  // Check for flex-wrap pattern (uneven rows) - map to flex
  const hasUnevenRows = vertical.consistency < 0.6;
  if (hasUnevenRows && horizontal.consistency > 0.8) {
    return "flex";
  }

  // Check if children use auto-layout (suggesting CSS Grid)
  const autoLayoutChildren = children.filter(child =>
    "layoutMode" in child && child.layoutMode !== "NONE"
  );

  if (autoLayoutChildren.length > children.length * 0.5) {
    return "css-grid";
  }

  return "manual";
}

/**
 * Calculates the most common gap size for consistent gutter detection.
 */
function calculateMostCommonGap(gaps: readonly number[]): number {
  if (gaps.length === 0) return 0;

  const gapCounts = new Map<number, number>();
  const tolerance = GRID_DETECTION_CONFIG.GUTTER_TOLERANCE;

  // Group similar gaps
  for (const gap of gaps) {
    let foundGroup = false;

    for (const [existingGap, count] of gapCounts) {
      if (Math.abs(gap - existingGap) <= tolerance) {
        gapCounts.set(existingGap, count + 1);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      gapCounts.set(gap, 1);
    }
  }

  // Find most frequent gap
  let mostCommonGap = 0;
  let maxCount = 0;

  for (const [gap, count] of gapCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonGap = gap;
    }
  }

  return Math.round(mostCommonGap);
}

/**
 * Infers frame-level alignment based on children positioning.
 */
function inferFrameAlignment(
  children: readonly SceneNode[],
  frame: FrameNode
): GridDetectionResult["alignment"] {
  const frameBounds = frame.absoluteBoundingBox!;
  const frameCenter = frameBounds.width / 2;

  // Calculate average distance from center
  const centerDistances = children.map(child => {
    const bounds = (child as any).absoluteBoundingBox;
    if (!bounds) return 0;

    const childCenter = (bounds.x - frameBounds.x) + bounds.width / 2;
    return Math.abs(childCenter - frameCenter);
  });

  const avgCenterDistance = centerDistances.reduce((sum, dist) => sum + dist, 0) / centerDistances.length;
  const maxPossibleDistance = frameCenter;

  // If elements are mostly near center, it's center-aligned
  if (avgCenterDistance < maxPossibleDistance * 0.2) {
    return "center";
  }

  // Check left vs right bias
  const leftAlignedCount = children.filter(child => {
    const bounds = (child as any).absoluteBoundingBox;
    return bounds && (bounds.x - frameBounds.x) < frameCenter;
  }).length;

  const rightAlignedCount = children.length - leftAlignedCount;

  if (Math.abs(leftAlignedCount - rightAlignedCount) < children.length * 0.1) {
    return "justified";
  }

  return leftAlignedCount > rightAlignedCount ? "left" : "right";
}

/**
 * Maps children to grid positions based on detected grid lines.
 */
function mapChildrenToGrid(
  children: readonly SceneNode[],
  columnPositions: readonly number[],
  rowPositions: readonly number[]
): GridDetectionResult["gridItems"] {
  const gridItems: GridDetectionResult["gridItems"][number][] = [];

  for (const child of children) {
    const bounds = (child as any).absoluteBoundingBox;
    if (!bounds) continue;

    // Find closest column and row
    const column = findClosestPosition(bounds.x, columnPositions);
    const row = findClosestPosition(bounds.y, rowPositions);

    // Calculate span based on element width/height
    const span = Math.max(1, Math.round(bounds.width / (bounds.width / 1))); // Simplified span calculation

    // Determine alignment within grid cell
    const alignment = inferElementAlignment(bounds, columnPositions, rowPositions, column, row);

    gridItems.push({
      nodeId: child.id,
      gridPosition: { row, column, span },
      alignment
    });
  }

  return gridItems;
}

/**
 * Finds the closest position index for a given coordinate.
 */
function findClosestPosition(coordinate: number, positions: readonly number[]): number {
  if (positions.length === 0) return 0;

  let closestIndex = 0;
  let minDistance = Math.abs(coordinate - positions[0]);

  for (let i = 1; i < positions.length; i++) {
    const distance = Math.abs(coordinate - positions[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Infers how an element is aligned within its grid cell.
 */
function inferElementAlignment(
  bounds: { x: number; y: number; width: number; height: number },
  columnPositions: readonly number[],
  rowPositions: readonly number[],
  columnIndex: number,
  rowIndex: number
): "start" | "center" | "end" | "stretch" {
  // For now, return start as default
  // Could be enhanced to analyze actual positioning within grid cells
  return "start";
}

/**
 * Calculates confidence score for grid detection.
 */
function calculateGridConfidence(
  horizontal: PositionAnalysis,
  vertical: PositionAnalysis,
  gridItems: readonly any[]
): number {
  // Base confidence on position consistency
  let confidence = (horizontal.consistency + vertical.consistency) / 2;

  // Boost confidence for common grid patterns
  if (horizontal.positions.length === 12 || horizontal.positions.length === 16) {
    confidence += 0.1;
  }

  // Boost confidence for consistent gaps
  if (horizontal.commonGaps.length > 0) {
    const gapVariance = calculateVariance(horizontal.commonGaps);
    if (gapVariance < 4) { // Low variance means consistent gaps
      confidence += 0.1;
    }
  }

  // Boost confidence for higher item count
  if (gridItems.length >= 8) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Calculates variance of an array of numbers.
 */
function calculateVariance(numbers: readonly number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
  return squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / numbers.length;
}

/**
 * Creates an empty grid result for non-grid layouts.
 */
function createEmptyGridResult(): GridDetectionResult {
  return {
    hasGridSystem: false,
    gridType: "manual",
    gutterWidth: 0,
    alignment: "left",
    gridItems: [],
    confidence: 0
  };
}