import { calculatePlacementScores, getRegionBounds, getRegionCenter } from "../core/placement-scoring.js";
import type { AiFaceRegion } from "../types/ai-signals.js";
import type { LayoutProfile } from "../core/layout-profile.js";

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function assertGreater(actual: number, than: number, message: string): void {
  if (actual <= than) {
    throw new Error(`${message}\nExpected: > ${than}\nReceived: ${actual}`);
  }
}

function assertLess(actual: number, than: number, message: string): void {
  if (actual >= than) {
    throw new Error(`${message}\nExpected: < ${than}\nReceived: ${actual}`);
  }
}

const SAFE_BOUNDS = { x: 50, y: 50, width: 500, height: 500 };
const FRAME_BOUNDS = { width: 600, height: 600 };

// Test: Base scores by profile

testCase("square profile assigns higher base scores to bottom regions", () => {
  const scoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS
  });

  const bottomCenter = scoring.regions.find(r => r.regionId === "bottom-center");
  const topCenter = scoring.regions.find(r => r.regionId === "top-center");

  assertGreater(
    bottomCenter!.baseScore,
    topCenter!.baseScore,
    "Bottom-center should have higher base score than top-center for square targets"
  );
});

testCase("vertical profile assigns highest base score to bottom-center", () => {
  const scoring = calculatePlacementScores({
    profile: "vertical" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS
  });

  const bottomCenter = scoring.regions.find(r => r.regionId === "bottom-center");
  assertEqual(
    bottomCenter!.baseScore,
    0.80,
    "Bottom-center should have 0.80 base score for vertical profile"
  );
});

testCase("horizontal profile assigns higher base scores to right regions", () => {
  const scoring = calculatePlacementScores({
    profile: "horizontal" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS
  });

  const middleRight = scoring.regions.find(r => r.regionId === "middle-right");
  const middleLeft = scoring.regions.find(r => r.regionId === "middle-left");

  assertGreater(
    middleRight!.baseScore,
    middleLeft!.baseScore,
    "Middle-right should have higher base score than middle-left for horizontal targets"
  );
});

// Test: Face region creates exclusion zone

testCase("face region in top-center reduces that region's score", () => {
  const faceRegions: AiFaceRegion[] = [
    { nodeId: "photo", x: 0.5, y: 0.2, width: 0.3, height: 0.35, confidence: 0.9 }
  ];

  const scoringWithFace = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    faceRegions
  });

  const scoringWithoutFace = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS
  });

  const topCenterWithFace = scoringWithFace.regions.find(r => r.regionId === "top-center");
  const topCenterWithoutFace = scoringWithoutFace.regions.find(r => r.regionId === "top-center");

  assertLess(
    topCenterWithFace!.finalScore,
    topCenterWithoutFace!.finalScore,
    "Top-center should have lower score when face is detected there"
  );
});

testCase("face in upper half results in bottom region recommendation", () => {
  const faceRegions: AiFaceRegion[] = [
    { nodeId: "headshot", x: 0.5, y: 0.3, width: 0.3, height: 0.35, confidence: 0.88 }
  ];

  const scoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    faceRegions
  });

  const recommendedIncludesBottom = scoring.recommendedRegion.includes("bottom");
  assertEqual(
    recommendedIncludesBottom,
    true,
    `Recommended region should be in bottom when face is in upper half. Got: ${scoring.recommendedRegion}`
  );
});

testCase("multiple faces create combined exclusion zones", () => {
  const faceRegions: AiFaceRegion[] = [
    { nodeId: "person1", x: 0.25, y: 0.4, width: 0.15, height: 0.2, confidence: 0.85 },
    { nodeId: "person2", x: 0.75, y: 0.4, width: 0.15, height: 0.2, confidence: 0.82 }
  ];

  const scoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    faceRegions
  });

  // With faces on left and right middle, bottom-center should be recommended
  assertEqual(
    scoring.recommendedRegion,
    "bottom-center",
    "With faces on both sides, bottom-center should be the safest placement"
  );
});

testCase("low confidence face applies reduced penalty", () => {
  const highConfidenceFace: AiFaceRegion[] = [
    { nodeId: "photo", x: 0.5, y: 0.2, width: 0.3, height: 0.35, confidence: 0.95 }
  ];

  const lowConfidenceFace: AiFaceRegion[] = [
    { nodeId: "photo", x: 0.5, y: 0.2, width: 0.3, height: 0.35, confidence: 0.4 }
  ];

  const highConfScoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    faceRegions: highConfidenceFace
  });

  const lowConfScoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    faceRegions: lowConfidenceFace
  });

  const topCenterHigh = highConfScoring.regions.find(r => r.regionId === "top-center");
  const topCenterLow = lowConfScoring.regions.find(r => r.regionId === "top-center");

  assertGreater(
    topCenterLow!.faceAvoidance,
    0,
    "Low confidence face should still apply some penalty"
  );

  assertGreater(
    topCenterHigh!.faceAvoidance,
    topCenterLow!.faceAvoidance,
    "High confidence face should apply greater penalty than low confidence"
  );
});

// Test: Focal point proximity

testCase("focal point near region reduces its score", () => {
  const focalPoint = { x: 0.5, y: 0.5, confidence: 0.85 };

  const scoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS,
    focalPoint
  });

  const center = scoring.regions.find(r => r.regionId === "center");
  const bottomCenter = scoring.regions.find(r => r.regionId === "bottom-center");

  assertGreater(
    center!.focalAvoidance,
    bottomCenter!.focalAvoidance,
    "Center region should have higher focal avoidance when focal point is in center"
  );
});

// Test: Region bounds calculation

testCase("getRegionBounds returns correct bounds for bottom-center", () => {
  const bounds = getRegionBounds("bottom-center", SAFE_BOUNDS);

  // Bottom-center should be: row 2 (bottom), col 1 (center)
  const expectedX = SAFE_BOUNDS.x + (1 * SAFE_BOUNDS.width / 3);
  const expectedY = SAFE_BOUNDS.y + (2 * SAFE_BOUNDS.height / 3);
  const expectedWidth = SAFE_BOUNDS.width / 3;
  const expectedHeight = SAFE_BOUNDS.height / 3;

  assertEqual(Math.round(bounds.x), Math.round(expectedX), "X position should match");
  assertEqual(Math.round(bounds.y), Math.round(expectedY), "Y position should match");
  assertEqual(Math.round(bounds.width), Math.round(expectedWidth), "Width should match");
  assertEqual(Math.round(bounds.height), Math.round(expectedHeight), "Height should match");
});

testCase("getRegionCenter returns center point of region", () => {
  const center = getRegionCenter("bottom-center", SAFE_BOUNDS);
  const bounds = getRegionBounds("bottom-center", SAFE_BOUNDS);

  const expectedCenterX = bounds.x + bounds.width / 2;
  const expectedCenterY = bounds.y + bounds.height / 2;

  assertEqual(Math.round(center.x), Math.round(expectedCenterX), "Center X should match");
  assertEqual(Math.round(center.y), Math.round(expectedCenterY), "Center Y should match");
});

// Test: No faces defaults to aspect-ratio heuristics

testCase("no faces uses pure aspect-ratio heuristics", () => {
  const scoring = calculatePlacementScores({
    profile: "square" as LayoutProfile,
    safeBounds: SAFE_BOUNDS,
    frameBounds: FRAME_BOUNDS
  });

  // All face avoidance penalties should be zero
  const allZeroFaceAvoidance = scoring.regions.every(r => r.faceAvoidance === 0);
  assertEqual(
    allZeroFaceAvoidance,
    true,
    "Without face regions, all faceAvoidance values should be 0"
  );

  // Recommendation should still be bottom for square
  const recommendedIncludesBottom = scoring.recommendedRegion.includes("bottom");
  assertEqual(
    recommendedIncludesBottom,
    true,
    "Square profile without faces should still recommend bottom region"
  );
});

console.log("\n✅ All placement-scoring tests passed!");
