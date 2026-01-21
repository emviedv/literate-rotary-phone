/**
 * Collision Validator: Post-AI geometric veto for text/face overlap.
 *
 * This module provides a deterministic safety net that runs AFTER scaling
 * and layout adaptation to ensure text never overlaps detected face regions.
 * The AI might recommend text positions that are generally good but overlapped
 * with faces - this validator nudges them to safety.
 *
 * Algorithm:
 * 1. Convert normalized face coords (0-1) to pixel bounds
 * 2. For each text node, calculate overlap percentage with face regions
 * 3. If overlap > 0: compute nudge vector away from face center
 * 4. Binary search for minimum nudge distance achieving 0% overlap
 * 5. Clamp to safe bounds
 *
 * Integration point: After expandAbsoluteChildren in variant-scaling.ts
 */

import type { AiFaceRegion } from "../types/ai-signals.js";
import { debugFixLog } from "./debug.js";

declare const figma: PluginAPI;

/**
 * Rectangular bounds in pixel coordinates.
 */
export interface PixelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Result of a single correction applied to a node.
 */
export interface CorrectionResult {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly originalPosition: { readonly x: number; readonly y: number };
  readonly correctedPosition: { readonly x: number; readonly y: number };
  readonly nudgeVector: { readonly dx: number; readonly dy: number };
  readonly overlapPercentBefore: number;
}

/**
 * Result of running collision validation on a frame.
 */
export interface CollisionValidationResult {
  /** Whether any corrections were applied */
  readonly corrected: boolean;
  /** List of corrections applied to nodes */
  readonly corrections: readonly CorrectionResult[];
  /** Total face regions evaluated */
  readonly faceCount: number;
  /** Total text nodes evaluated */
  readonly textNodeCount: number;
}

/**
 * Input parameters for collision validation.
 */
export interface CollisionValidationInput {
  /** The frame to validate */
  readonly frame: FrameNode;
  /** Detected face regions (normalized 0-1 coordinates) */
  readonly faceRegions: readonly AiFaceRegion[] | undefined;
  /** Safe area bounds (pixel coordinates) */
  readonly safeBounds: PixelBounds;
}

/**
 * Nudge result with direction and magnitude.
 */
interface NudgeResult {
  readonly dx: number;
  readonly dy: number;
  readonly magnitude: number;
}

/**
 * Convert a normalized face region (0-1) to pixel bounds.
 * Face regions have center (x, y) and dimensions (width, height).
 */
export function faceToPixelBounds(
  face: AiFaceRegion,
  frameWidth: number,
  frameHeight: number
): PixelBounds {
  const centerX = face.x * frameWidth;
  const centerY = face.y * frameHeight;
  const faceWidth = face.width * frameWidth;
  const faceHeight = face.height * frameHeight;

  return {
    x: centerX - faceWidth / 2,
    y: centerY - faceHeight / 2,
    width: faceWidth,
    height: faceHeight
  };
}

/**
 * Calculate overlap area between two rectangles.
 */
export function calculateOverlapArea(a: PixelBounds, b: PixelBounds): number {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX * overlapY;
}

/**
 * Calculate overlap percentage of the text node with a face region.
 */
export function calculateOverlapPercent(textBounds: PixelBounds, faceBounds: PixelBounds): number {
  const overlap = calculateOverlapArea(textBounds, faceBounds);
  const textArea = textBounds.width * textBounds.height;
  if (textArea <= 0) return 0;
  return (overlap / textArea) * 100;
}

/**
 * Calculate the nudge vector to move text away from face center.
 * Returns a unit vector pointing away from the face center.
 */
export function calculateNudgeDirection(textBounds: PixelBounds, faceBounds: PixelBounds): { dx: number; dy: number } {
  // Text center
  const textCenterX = textBounds.x + textBounds.width / 2;
  const textCenterY = textBounds.y + textBounds.height / 2;

  // Face center
  const faceCenterX = faceBounds.x + faceBounds.width / 2;
  const faceCenterY = faceBounds.y + faceBounds.height / 2;

  // Vector from face to text
  let dx = textCenterX - faceCenterX;
  let dy = textCenterY - faceCenterY;

  // Handle edge case: text exactly on face center
  if (dx === 0 && dy === 0) {
    // Default to moving right and down
    dx = 1;
    dy = 1;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  return {
    dx: dx / magnitude,
    dy: dy / magnitude
  };
}

/**
 * Check if text bounds at given position overlap with any face.
 */
function hasOverlapAtPosition(
  textBounds: PixelBounds,
  offsetX: number,
  offsetY: number,
  faceBounds: readonly PixelBounds[]
): boolean {
  const movedBounds: PixelBounds = {
    x: textBounds.x + offsetX,
    y: textBounds.y + offsetY,
    width: textBounds.width,
    height: textBounds.height
  };

  for (const face of faceBounds) {
    if (calculateOverlapArea(movedBounds, face) > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Binary search for minimum nudge distance to achieve zero overlap.
 * Returns the magnitude to apply to the nudge direction vector.
 */
export function findMinimumNudgeDistance(
  textBounds: PixelBounds,
  faceBounds: readonly PixelBounds[],
  direction: { dx: number; dy: number },
  safeBounds: PixelBounds,
  maxIterations: number = 10
): number {
  // Find an upper bound that clears all faces
  let low = 0;
  let high = Math.max(safeBounds.width, safeBounds.height);

  // First, verify we can even clear with max distance
  const maxOffset = {
    x: direction.dx * high,
    y: direction.dy * high
  };
  // If moving max distance still overlaps or goes out of safe bounds, give up
  if (hasOverlapAtPosition(textBounds, maxOffset.x, maxOffset.y, faceBounds)) {
    // Can't clear overlap in this direction
    return high;
  }

  // Binary search for minimum distance
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const offset = { x: direction.dx * mid, y: direction.dy * mid };

    if (hasOverlapAtPosition(textBounds, offset.x, offset.y, faceBounds)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

/**
 * Clamp position to keep bounds within safe area.
 */
export function clampToSafeArea(
  textBounds: PixelBounds,
  newX: number,
  newY: number,
  safeBounds: PixelBounds
): { x: number; y: number } {
  const clampedX = Math.max(safeBounds.x, Math.min(newX, safeBounds.x + safeBounds.width - textBounds.width));
  const clampedY = Math.max(safeBounds.y, Math.min(newY, safeBounds.y + safeBounds.height - textBounds.height));
  return { x: clampedX, y: clampedY };
}

/**
 * Calculate the optimal nudge for a text node to avoid face overlap.
 */
export function nudgeTextAwayFromFaces(
  textBounds: PixelBounds,
  faceBounds: readonly PixelBounds[],
  safeBounds: PixelBounds
): NudgeResult | null {
  // Check current overlap
  let totalOverlap = 0;
  for (const face of faceBounds) {
    totalOverlap += calculateOverlapArea(textBounds, face);
  }

  if (totalOverlap === 0) {
    // No overlap, no nudge needed
    return null;
  }

  // Find the closest overlapping face to nudge away from
  let closestFace: PixelBounds | null = null;
  let closestDistance = Infinity;

  const textCenterX = textBounds.x + textBounds.width / 2;
  const textCenterY = textBounds.y + textBounds.height / 2;

  for (const face of faceBounds) {
    if (calculateOverlapArea(textBounds, face) > 0) {
      const faceCenterX = face.x + face.width / 2;
      const faceCenterY = face.y + face.height / 2;
      const dist = Math.sqrt(
        Math.pow(textCenterX - faceCenterX, 2) + Math.pow(textCenterY - faceCenterY, 2)
      );
      if (dist < closestDistance) {
        closestDistance = dist;
        closestFace = face;
      }
    }
  }

  if (!closestFace) {
    return null;
  }

  // Calculate nudge direction away from closest face
  const direction = calculateNudgeDirection(textBounds, closestFace);

  // Find minimum distance to clear overlap
  const magnitude = findMinimumNudgeDistance(textBounds, faceBounds, direction, safeBounds);

  // Calculate proposed new position
  const proposedX = textBounds.x + direction.dx * magnitude;
  const proposedY = textBounds.y + direction.dy * magnitude;

  // Clamp to safe area
  const clamped = clampToSafeArea(textBounds, proposedX, proposedY, safeBounds);

  const dx = clamped.x - textBounds.x;
  const dy = clamped.y - textBounds.y;

  // Check if after clamping we still have overlap (edge case: can't escape)
  const finalBounds: PixelBounds = {
    x: clamped.x,
    y: clamped.y,
    width: textBounds.width,
    height: textBounds.height
  };

  let stillOverlapping = false;
  for (const face of faceBounds) {
    if (calculateOverlapArea(finalBounds, face) > 0) {
      stillOverlapping = true;
      break;
    }
  }

  // Even if still overlapping, return the nudge (best effort)
  if (stillOverlapping) {
    debugFixLog("collision-validator: could not fully resolve overlap", {
      textBounds,
      proposedPosition: clamped,
      stillOverlapping: true
    });
  }

  return {
    dx,
    dy,
    magnitude: Math.sqrt(dx * dx + dy * dy)
  };
}

/**
 * Recursively collect all text nodes from a frame.
 */
function collectTextNodes(node: SceneNode): TextNode[] {
  const textNodes: TextNode[] = [];

  if (node.type === "TEXT") {
    textNodes.push(node);
  } else if ("children" in node) {
    for (const child of node.children) {
      textNodes.push(...collectTextNodes(child));
    }
  }

  return textNodes;
}

/**
 * Validate and correct text/face collisions in a frame.
 *
 * This function runs after layout adaptation to ensure no text
 * overlaps with detected face regions. It applies minimum necessary
 * corrections while respecting safe area bounds.
 *
 * @param input Validation input containing frame, face regions, and safe bounds
 * @returns Result with corrections applied
 */
export function validateTextFaceCollisions(input: CollisionValidationInput): CollisionValidationResult {
  const { frame, faceRegions, safeBounds } = input;

  // Early exit if no face regions
  if (!faceRegions || faceRegions.length === 0) {
    return {
      corrected: false,
      corrections: [],
      faceCount: 0,
      textNodeCount: 0
    };
  }

  // Convert face regions to pixel bounds
  const faceBounds = faceRegions.map((face) =>
    faceToPixelBounds(face, frame.width, frame.height)
  );

  // Collect all text nodes
  const textNodes = collectTextNodes(frame);

  if (textNodes.length === 0) {
    return {
      corrected: false,
      corrections: [],
      faceCount: faceRegions.length,
      textNodeCount: 0
    };
  }

  const corrections: CorrectionResult[] = [];

  for (const textNode of textNodes) {
    const textBounds: PixelBounds = {
      x: textNode.x,
      y: textNode.y,
      width: textNode.width,
      height: textNode.height
    };

    // Calculate current overlap
    let maxOverlap = 0;
    for (const face of faceBounds) {
      const overlap = calculateOverlapPercent(textBounds, face);
      maxOverlap = Math.max(maxOverlap, overlap);
    }

    if (maxOverlap === 0) {
      continue; // No overlap, skip
    }

    // Calculate nudge
    const nudge = nudgeTextAwayFromFaces(textBounds, faceBounds, safeBounds);

    if (!nudge || (nudge.dx === 0 && nudge.dy === 0)) {
      continue; // No nudge calculated or zero nudge
    }

    // Apply correction
    const newX = textNode.x + nudge.dx;
    const newY = textNode.y + nudge.dy;

    corrections.push({
      nodeId: textNode.id,
      nodeName: textNode.name,
      originalPosition: { x: textNode.x, y: textNode.y },
      correctedPosition: { x: newX, y: newY },
      nudgeVector: { dx: nudge.dx, dy: nudge.dy },
      overlapPercentBefore: maxOverlap
    });

    // Apply the correction to the node
    textNode.x = newX;
    textNode.y = newY;

    debugFixLog("collision-validator: corrected text position", {
      nodeId: textNode.id,
      nodeName: textNode.name,
      from: { x: textBounds.x, y: textBounds.y },
      to: { x: newX, y: newY },
      nudge: { dx: nudge.dx, dy: nudge.dy },
      overlapBefore: maxOverlap.toFixed(1) + "%"
    });
  }

  if (corrections.length > 0) {
    debugFixLog("collision-validator: summary", {
      frameId: frame.id,
      faceCount: faceRegions.length,
      textNodeCount: textNodes.length,
      correctionsApplied: corrections.length
    });
  }

  return {
    corrected: corrections.length > 0,
    corrections,
    faceCount: faceRegions.length,
    textNodeCount: textNodes.length
  };
}
