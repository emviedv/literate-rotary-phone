/**
 * AI Vision-Only Prompt
 *
 * This prompt is designed for the first phase of the two-phase AI request.
 * It focuses exclusively on visual analysis without layout reasoning to prevent
 * "contextual drift" where layout concerns contaminate perceptual accuracy.
 *
 * Outputs:
 * - Face regions (normalized 0-1 coordinates)
 * - Subject occupancy zone (left/right/center)
 * - Subject type classification
 * - Intent classification
 */

import { PLUGIN_NAME } from "./plugin-constants.js";

/**
 * Result of vision-only analysis.
 */
export interface VisionFacts {
  /** Detected face regions in normalized coordinates */
  readonly faceRegions: readonly VisionFaceRegion[];
  /** Which horizontal zone the subject occupies */
  readonly subjectOccupancy: "left" | "right" | "center" | "none";
  /** Classification of the primary subject */
  readonly subjectType: "person" | "product" | "device" | "chart" | "abstract" | "none";
  /** Compositional intent */
  readonly intent: "Subject-Dominant" | "Information-Dominant" | "Grid-Repeat";
  /** Overall confidence in the vision analysis */
  readonly confidence: number;
}

/**
 * Face region from vision analysis.
 */
export interface VisionFaceRegion {
  /** Face center X (0-1 from frame left) */
  readonly x: number;
  /** Face center Y (0-1 from frame top) */
  readonly y: number;
  /** Face width as ratio of frame (0-1) */
  readonly width: number;
  /** Face height as ratio of frame (0-1) */
  readonly height: number;
  /** Detection confidence */
  readonly confidence: number;
}

/**
 * Builds the vision-only system prompt.
 * This prompt focuses on perceptual tasks without layout reasoning.
 */
export function buildVisionOnlyPrompt(): string {
  return `You are the ${PLUGIN_NAME} Vision Analyzer. Your ONLY task is to analyze the visual content of marketing frames.

## YOUR MISSION
Extract visual facts with maximum accuracy. Do NOT think about layouts or transformations.
Focus 100% on WHAT you see, not HOW it should be arranged.

## 1. FACE DETECTION (Critical)
Scan the image for human faces:
- Report EVERY visible face, even partial/cropped ones
- Use normalized coordinates (0-1) where:
  - x=0 is left edge, x=1 is right edge
  - y=0 is top edge, y=1 is bottom edge
- Report the center point and approximate dimensions
- Include confidence based on visibility (1.0 = clear full face, 0.5 = partial/angled)

## 2. SUBJECT OCCUPANCY (The "Wall" Location)
Determine which horizontal zone the primary subject occupies:
- **left**: Subject center is in the left 40% of the frame
- **right**: Subject center is in the right 40% of the frame
- **center**: Subject center is in the middle 20% of the frame
- **none**: No clear focal subject

## 3. SUBJECT TYPE
Classify the primary focal element:
- **person**: Human figure (full body, portrait, headshot)
- **product**: Physical product (packaging, item, merchandise)
- **device**: Electronic device mockup (phone, laptop, tablet)
- **chart**: Data visualization (graph, chart, diagram)
- **abstract**: Abstract shapes, illustrations, or patterns
- **none**: No clear subject (text-only, solid colors)

## 4. INTENT CLASSIFICATION
Determine the compositional style:
- **Subject-Dominant**: Primary subject takes >40% of visual area
- **Information-Dominant**: Text/data is the primary content
- **Grid-Repeat**: Multiple similar items in a grid pattern

## OUTPUT FORMAT (JSON)
{
  "faceRegions": [
    { "x": 0.3, "y": 0.4, "width": 0.15, "height": 0.2, "confidence": 0.95 }
  ],
  "subjectOccupancy": "left" | "right" | "center" | "none",
  "subjectType": "person" | "product" | "device" | "chart" | "abstract" | "none",
  "intent": "Subject-Dominant" | "Information-Dominant" | "Grid-Repeat",
  "confidence": 0.9
}

## IMPORTANT RULES
1. Be GENEROUS with face detection - when in doubt, include it
2. For faceRegions, center coordinates + dimensions are more useful than corners
3. If no faces are visible, return an empty array: "faceRegions": []
4. SubjectOccupancy is about the ENTIRE subject silhouette, not just faces
5. Your response must be valid JSON only - no explanations or markdown`;
}

export const VISION_ONLY_PROMPT = buildVisionOnlyPrompt();

/**
 * Parses and validates the vision-only response.
 */
export function parseVisionResponse(content: unknown): VisionFacts | null {
  if (typeof content !== "object" || content === null) {
    return null;
  }

  const raw = content as Record<string, unknown>;

  // Parse face regions
  const faceRegions: VisionFaceRegion[] = [];
  if (Array.isArray(raw.faceRegions)) {
    for (const face of raw.faceRegions) {
      if (
        typeof face === "object" &&
        face !== null &&
        typeof (face as Record<string, unknown>).x === "number" &&
        typeof (face as Record<string, unknown>).y === "number"
      ) {
        const f = face as Record<string, unknown>;
        faceRegions.push({
          x: clamp(Number(f.x), 0, 1),
          y: clamp(Number(f.y), 0, 1),
          width: clamp(Number(f.width) || 0.1, 0, 1),
          height: clamp(Number(f.height) || 0.1, 0, 1),
          confidence: clamp(Number(f.confidence) || 0.5, 0, 1)
        });
      }
    }
  }

  // Parse subject occupancy
  const validOccupancies = ["left", "right", "center", "none"] as const;
  const subjectOccupancy = validOccupancies.includes(raw.subjectOccupancy as typeof validOccupancies[number])
    ? (raw.subjectOccupancy as typeof validOccupancies[number])
    : "none";

  // Parse subject type
  const validTypes = ["person", "product", "device", "chart", "abstract", "none"] as const;
  const subjectType = validTypes.includes(raw.subjectType as typeof validTypes[number])
    ? (raw.subjectType as typeof validTypes[number])
    : "none";

  // Parse intent
  const validIntents = ["Subject-Dominant", "Information-Dominant", "Grid-Repeat"] as const;
  const intent = validIntents.includes(raw.intent as typeof validIntents[number])
    ? (raw.intent as typeof validIntents[number])
    : "Information-Dominant";

  // Parse overall confidence
  const confidence = clamp(Number(raw.confidence) || 0.5, 0, 1);

  return {
    faceRegions,
    subjectOccupancy,
    subjectType,
    intent,
    confidence
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
