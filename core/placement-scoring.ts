import type { LayoutProfile } from "./layout-profile.js";
import type { AiFaceRegion, PlacementScoring, RegionScore } from "../types/ai-signals.js";
import { debugFixLog } from "./debug.js";

type Bounds = { x: number; y: number; width: number; height: number };

/**
 * 3x3 grid region identifiers in row-major order.
 */
const REGION_IDS = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right"
] as const;

type RegionId = typeof REGION_IDS[number];

/**
 * Base scores by profile - determines where text should prefer to go
 * based on aspect ratio heuristics alone.
 */
const BASE_SCORES: Record<LayoutProfile, Record<RegionId, number>> = {
  vertical: {
    "top-left": 0.35, "top-center": 0.35, "top-right": 0.35,
    "middle-left": 0.50, "center": 0.50, "middle-right": 0.50,
    "bottom-left": 0.75, "bottom-center": 0.80, "bottom-right": 0.75
  },
  square: {
    "top-left": 0.35, "top-center": 0.35, "top-right": 0.35,
    "middle-left": 0.50, "center": 0.45, "middle-right": 0.50,
    "bottom-left": 0.70, "bottom-center": 0.75, "bottom-right": 0.70
  },
  horizontal: {
    "top-left": 0.35, "top-center": 0.50, "top-right": 0.70,
    "middle-left": 0.35, "center": 0.50, "middle-right": 0.75,
    "bottom-left": 0.35, "bottom-center": 0.50, "bottom-right": 0.70
  }
};

/**
 * Maximum penalty a face can apply to a region.
 * Capped to ensure faces discourage but don't completely prohibit placement.
 */
const MAX_FACE_PENALTY = 0.6;

/**
 * Maximum penalty from focal point proximity.
 */
const MAX_FOCAL_PENALTY = 0.25;

/**
 * Distance threshold (normalized) within which focal point creates penalty.
 */
const FOCAL_PROXIMITY_THRESHOLD = 0.25;

export interface CalculatePlacementScoresInput {
  readonly profile: LayoutProfile;
  readonly safeBounds: Bounds;
  readonly frameBounds: { readonly width: number; readonly height: number };
  readonly faceRegions?: readonly AiFaceRegion[];
  readonly focalPoint?: { readonly x: number; readonly y: number; readonly confidence: number } | null;
}

/**
 * Calculates placement scores for a 3x3 grid of regions within the frame.
 * Scores are biased by:
 * 1. Aspect ratio heuristics (bottom third for vertical/square, right side for horizontal)
 * 2. Face region exclusion zones
 * 3. Focal point proximity avoidance
 */
export function calculatePlacementScores(input: CalculatePlacementScoresInput): PlacementScoring {
  const { profile, safeBounds, frameBounds, faceRegions, focalPoint } = input;

  const regions: RegionScore[] = [];

  for (const regionId of REGION_IDS) {
    const regionBounds = getRegionBounds(regionId, safeBounds);
    const baseScore = BASE_SCORES[profile][regionId];

    // Calculate face avoidance penalty
    let faceAvoidance = 0;
    if (faceRegions && faceRegions.length > 0) {
      for (const face of faceRegions) {
        const penalty = calculateFaceOverlapPenalty(regionBounds, face, frameBounds);
        faceAvoidance += penalty;
      }
      faceAvoidance = Math.min(faceAvoidance, MAX_FACE_PENALTY);
    }

    // Calculate focal point proximity penalty
    let focalAvoidance = 0;
    if (focalPoint && focalPoint.confidence > 0.5) {
      focalAvoidance = calculateFocalProximityPenalty(regionBounds, focalPoint, frameBounds);
    }

    const finalScore = Math.max(0, baseScore - faceAvoidance - focalAvoidance);

    regions.push({
      regionId,
      baseScore,
      faceAvoidance,
      focalAvoidance,
      finalScore
    });
  }

  // Find highest scoring region
  const sortedRegions = [...regions].sort((a, b) => b.finalScore - a.finalScore);
  const recommendedRegion = sortedRegions[0].regionId;

  debugFixLog("placement scoring calculated", {
    profile,
    faceCount: faceRegions?.length ?? 0,
    hasFocalPoint: Boolean(focalPoint),
    recommendedRegion,
    topScore: sortedRegions[0].finalScore.toFixed(3),
    regions: regions.map(r => ({
      id: r.regionId,
      base: r.baseScore.toFixed(2),
      face: r.faceAvoidance.toFixed(2),
      focal: r.focalAvoidance.toFixed(2),
      final: r.finalScore.toFixed(2)
    }))
  });

  return {
    gridDimensions: { rows: 3, cols: 3 },
    regions,
    recommendedRegion
  };
}

/**
 * Maps a region ID to its bounds within the safe area.
 */
export function getRegionBounds(regionId: string, safeBounds: Bounds): Bounds {
  const cellWidth = safeBounds.width / 3;
  const cellHeight = safeBounds.height / 3;

  let col = 0;
  let row = 0;

  // Parse row from region ID
  if (regionId.startsWith("top")) row = 0;
  else if (regionId.startsWith("middle") || regionId === "center") row = 1;
  else if (regionId.startsWith("bottom")) row = 2;

  // Parse column from region ID
  if (regionId.endsWith("left")) col = 0;
  else if (regionId.endsWith("center") || regionId === "center") col = 1;
  else if (regionId.endsWith("right")) col = 2;

  return {
    x: safeBounds.x + col * cellWidth,
    y: safeBounds.y + row * cellHeight,
    width: cellWidth,
    height: cellHeight
  };
}

/**
 * Calculates penalty for a region based on face overlap.
 * Returns value between 0 and ~0.3 per face (capped at MAX_FACE_PENALTY total).
 */
function calculateFaceOverlapPenalty(
  regionBounds: Bounds,
  face: AiFaceRegion,
  frameBounds: { width: number; height: number }
): number {
  // Convert normalized face coordinates to pixel bounds
  const facePixelBounds: Bounds = {
    x: (face.x - face.width / 2) * frameBounds.width,
    y: (face.y - face.height / 2) * frameBounds.height,
    width: face.width * frameBounds.width,
    height: face.height * frameBounds.height
  };

  // Calculate overlap percentage
  const overlapX = Math.max(0, Math.min(regionBounds.x + regionBounds.width, facePixelBounds.x + facePixelBounds.width) - Math.max(regionBounds.x, facePixelBounds.x));
  const overlapY = Math.max(0, Math.min(regionBounds.y + regionBounds.height, facePixelBounds.y + facePixelBounds.height) - Math.max(regionBounds.y, facePixelBounds.y));
  const overlapArea = overlapX * overlapY;
  const regionArea = regionBounds.width * regionBounds.height;

  if (regionArea === 0) return 0;

  const overlapPercentage = overlapArea / regionArea;

  // Penalty scales with overlap and face confidence
  // Max penalty per face is ~0.3 (half of MAX_FACE_PENALTY)
  return overlapPercentage * face.confidence * 0.5;
}

/**
 * Calculates penalty based on proximity to focal point.
 * Regions closer to the focal point receive a small penalty to encourage
 * text placement away from the visual focus.
 */
function calculateFocalProximityPenalty(
  regionBounds: Bounds,
  focalPoint: { x: number; y: number; confidence: number },
  frameBounds: { width: number; height: number }
): number {
  // Region center in normalized coordinates
  const regionCenterX = (regionBounds.x + regionBounds.width / 2) / frameBounds.width;
  const regionCenterY = (regionBounds.y + regionBounds.height / 2) / frameBounds.height;

  // Distance to focal point (normalized)
  const dx = regionCenterX - focalPoint.x;
  const dy = regionCenterY - focalPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance >= FOCAL_PROXIMITY_THRESHOLD) {
    return 0;
  }

  // Linear falloff: closer = higher penalty
  const proximityFactor = 1 - (distance / FOCAL_PROXIMITY_THRESHOLD);
  return proximityFactor * focalPoint.confidence * MAX_FOCAL_PENALTY;
}

/**
 * Gets the center point of a region in pixel coordinates.
 */
export function getRegionCenter(regionId: string, safeBounds: Bounds): { x: number; y: number } {
  const bounds = getRegionBounds(regionId, safeBounds);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
}
