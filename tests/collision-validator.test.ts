import {
  faceToPixelBounds,
  calculateOverlapArea,
  calculateOverlapPercent,
  calculateNudgeDirection,
  findMinimumNudgeDistance,
  clampToSafeArea,
  nudgeTextAwayFromFaces,
  type PixelBounds
} from "../core/collision-validator.js";
import type { AiFaceRegion } from "../types/ai-signals.js";

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

function assertApproxEqual(actual: number, expected: number, tolerance: number, message: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\nExpected: ${expected} (±${tolerance})\nReceived: ${actual}`);
  }
}

// === faceToPixelBounds Tests ===

testCase("faceToPixelBounds converts centered face correctly", () => {
  const face: AiFaceRegion = {
    nodeId: "face-1",
    x: 0.5,        // center of frame
    y: 0.5,        // center of frame
    width: 0.2,    // 20% of frame width
    height: 0.3,   // 30% of frame height
    confidence: 0.9
  };

  const bounds = faceToPixelBounds(face, 1000, 800);

  // Face center at (500, 400), width 200, height 240
  // So x = 500 - 100 = 400, y = 400 - 120 = 280
  assertApproxEqual(bounds.x, 400, 0.1, "X should be 400");
  assertApproxEqual(bounds.y, 280, 0.1, "Y should be 280");
  assertApproxEqual(bounds.width, 200, 0.1, "Width should be 200");
  assertApproxEqual(bounds.height, 240, 0.1, "Height should be 240");
});

testCase("faceToPixelBounds handles corner face", () => {
  const face: AiFaceRegion = {
    nodeId: "face-2",
    x: 0.1,        // 10% from left
    y: 0.1,        // 10% from top
    width: 0.1,
    height: 0.1,
    confidence: 0.8
  };

  const bounds = faceToPixelBounds(face, 1000, 1000);

  // Face center at (100, 100), width 100, height 100
  // So x = 100 - 50 = 50, y = 100 - 50 = 50
  assertApproxEqual(bounds.x, 50, 0.1, "X should be 50");
  assertApproxEqual(bounds.y, 50, 0.1, "Y should be 50");
  assertApproxEqual(bounds.width, 100, 0.1, "Width should be 100");
  assertApproxEqual(bounds.height, 100, 0.1, "Height should be 100");
});

// === calculateOverlapArea Tests ===

testCase("calculateOverlapArea returns 0 for non-overlapping rects", () => {
  const a: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };
  const b: PixelBounds = { x: 200, y: 200, width: 100, height: 100 };

  const overlap = calculateOverlapArea(a, b);
  assertEqual(overlap, 0, "Non-overlapping rectangles should have 0 overlap");
});

testCase("calculateOverlapArea calculates partial overlap correctly", () => {
  const a: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };
  const b: PixelBounds = { x: 50, y: 50, width: 100, height: 100 };

  // Overlap is 50x50 = 2500
  const overlap = calculateOverlapArea(a, b);
  assertEqual(overlap, 2500, "Overlap should be 2500 sq px");
});

testCase("calculateOverlapArea handles full containment", () => {
  const a: PixelBounds = { x: 0, y: 0, width: 200, height: 200 };
  const b: PixelBounds = { x: 50, y: 50, width: 50, height: 50 };

  // b is fully inside a, overlap is 50x50 = 2500
  const overlap = calculateOverlapArea(a, b);
  assertEqual(overlap, 2500, "Full containment overlap should equal smaller rect area");
});

testCase("calculateOverlapArea handles touching edges (no overlap)", () => {
  const a: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };
  const b: PixelBounds = { x: 100, y: 0, width: 100, height: 100 };

  const overlap = calculateOverlapArea(a, b);
  assertEqual(overlap, 0, "Touching edges should have 0 overlap");
});

// === calculateOverlapPercent Tests ===

testCase("calculateOverlapPercent returns 0 for no overlap", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const face: PixelBounds = { x: 200, y: 200, width: 100, height: 100 };

  const percent = calculateOverlapPercent(text, face);
  assertEqual(percent, 0, "No overlap should return 0%");
});

testCase("calculateOverlapPercent returns 100 for full overlap", () => {
  const text: PixelBounds = { x: 50, y: 50, width: 50, height: 50 };
  const face: PixelBounds = { x: 0, y: 0, width: 200, height: 200 };

  // Text is fully inside face
  const percent = calculateOverlapPercent(text, face);
  assertEqual(percent, 100, "Full containment should return 100%");
});

testCase("calculateOverlapPercent calculates partial correctly", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };
  const face: PixelBounds = { x: 50, y: 50, width: 100, height: 100 };

  // Text area = 10000, overlap = 2500, so 25%
  const percent = calculateOverlapPercent(text, face);
  assertEqual(percent, 25, "Partial overlap should be 25%");
});

testCase("calculateOverlapPercent handles zero-area text", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 0, height: 0 };
  const face: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };

  const percent = calculateOverlapPercent(text, face);
  assertEqual(percent, 0, "Zero-area text should return 0%");
});

// === calculateNudgeDirection Tests ===

testCase("calculateNudgeDirection points away from face (text to right)", () => {
  const text: PixelBounds = { x: 150, y: 50, width: 100, height: 50 };
  const face: PixelBounds = { x: 0, y: 0, width: 100, height: 100 };

  // Text center: (200, 75), Face center: (50, 50)
  // Direction: (150, 25) normalized
  const dir = calculateNudgeDirection(text, face);

  // Should be mostly positive X (pointing right/away from face)
  assertEqual(dir.dx > 0, true, "dx should be positive (away from face)");
  assertEqual(dir.dy > 0, true, "dy should be positive (away from face)");

  // Verify unit vector
  const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
  assertApproxEqual(magnitude, 1, 0.001, "Should be a unit vector");
});

testCase("calculateNudgeDirection points away from face (text above)", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const face: PixelBounds = { x: 0, y: 100, width: 100, height: 100 };

  // Text center: (50, 25), Face center: (50, 150)
  // Direction: (0, -125) normalized
  const dir = calculateNudgeDirection(text, face);

  assertApproxEqual(dir.dx, 0, 0.001, "dx should be ~0 (vertical displacement)");
  assertEqual(dir.dy < 0, true, "dy should be negative (pointing up/away from face)");
});

testCase("calculateNudgeDirection handles coincident centers", () => {
  const text: PixelBounds = { x: 50, y: 50, width: 100, height: 100 };
  const face: PixelBounds = { x: 50, y: 50, width: 100, height: 100 };

  // Same centers, should default to (1, 1) normalized
  const dir = calculateNudgeDirection(text, face);

  // Should have valid direction (not NaN)
  assertEqual(Number.isFinite(dir.dx), true, "dx should be finite");
  assertEqual(Number.isFinite(dir.dy), true, "dy should be finite");

  const magnitude = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
  assertApproxEqual(magnitude, 1, 0.001, "Should be a unit vector");
});

// === findMinimumNudgeDistance Tests ===

testCase("findMinimumNudgeDistance returns small value when overlap is small", () => {
  const text: PixelBounds = { x: 95, y: 0, width: 50, height: 50 };
  const faceBounds: PixelBounds[] = [{ x: 0, y: 0, width: 100, height: 100 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 500, height: 500 };
  const direction = { dx: 1, dy: 0 }; // Move right

  // Text overlaps by 5px, needs to move at least 5px right
  const distance = findMinimumNudgeDistance(text, faceBounds, direction, safeBounds);

  // Should be small since overlap is only 5px
  assertEqual(distance >= 5, true, "Distance should be at least 5");
  assertEqual(distance < 100, true, "Distance should be reasonable (< 100)");
});

testCase("findMinimumNudgeDistance handles no initial overlap", () => {
  const text: PixelBounds = { x: 200, y: 200, width: 50, height: 50 };
  const faceBounds: PixelBounds[] = [{ x: 0, y: 0, width: 100, height: 100 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 500, height: 500 };
  const direction = { dx: 1, dy: 0 };

  // No overlap to begin with - binary search should converge to 0
  const distance = findMinimumNudgeDistance(text, faceBounds, direction, safeBounds);

  // Should converge to very small value
  assertEqual(distance < 1, true, "Distance should be very small when no initial overlap");
});

// === clampToSafeArea Tests ===

testCase("clampToSafeArea keeps position inside safe area", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const safeBounds: PixelBounds = { x: 50, y: 50, width: 400, height: 300 };

  const clamped = clampToSafeArea(text, 100, 100, safeBounds);

  assertEqual(clamped.x, 100, "X should stay at 100 (within safe area)");
  assertEqual(clamped.y, 100, "Y should stay at 100 (within safe area)");
});

testCase("clampToSafeArea clamps position to left edge", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const safeBounds: PixelBounds = { x: 50, y: 50, width: 400, height: 300 };

  const clamped = clampToSafeArea(text, 0, 100, safeBounds);

  assertEqual(clamped.x, 50, "X should be clamped to safe area left edge");
  assertEqual(clamped.y, 100, "Y should stay at 100");
});

testCase("clampToSafeArea clamps position to right edge", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 400, height: 300 };

  // Try to position at x=350, but text is 100 wide, so max x = 400-100 = 300
  const clamped = clampToSafeArea(text, 350, 100, safeBounds);

  assertEqual(clamped.x, 300, "X should be clamped to keep text inside safe area");
  assertEqual(clamped.y, 100, "Y should stay at 100");
});

testCase("clampToSafeArea clamps both axes", () => {
  const text: PixelBounds = { x: 0, y: 0, width: 100, height: 50 };
  const safeBounds: PixelBounds = { x: 50, y: 50, width: 200, height: 200 };

  // Try to position outside on both axes
  const clamped = clampToSafeArea(text, 300, 300, safeBounds);

  // Max x = 50 + 200 - 100 = 150
  // Max y = 50 + 200 - 50 = 200
  assertEqual(clamped.x, 150, "X should be clamped to max safe x");
  assertEqual(clamped.y, 200, "Y should be clamped to max safe y");
});

// === nudgeTextAwayFromFaces Tests ===

testCase("nudgeTextAwayFromFaces returns null for non-overlapping text", () => {
  const text: PixelBounds = { x: 300, y: 300, width: 100, height: 50 };
  const faceBounds: PixelBounds[] = [{ x: 0, y: 0, width: 100, height: 100 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 500, height: 500 };

  const nudge = nudgeTextAwayFromFaces(text, faceBounds, safeBounds);

  assertEqual(nudge, null, "Should return null when no overlap");
});

testCase("nudgeTextAwayFromFaces calculates nudge for overlapping text", () => {
  const text: PixelBounds = { x: 50, y: 50, width: 100, height: 50 };
  const faceBounds: PixelBounds[] = [{ x: 0, y: 0, width: 100, height: 100 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 500, height: 500 };

  const nudge = nudgeTextAwayFromFaces(text, faceBounds, safeBounds);

  assertEqual(nudge !== null, true, "Should return a nudge result");
  if (nudge) {
    // Nudge should move away from face (positive direction)
    assertEqual(nudge.dx > 0 || nudge.dy > 0, true, "Should nudge in positive direction");
    assertEqual(nudge.magnitude > 0, true, "Magnitude should be positive");
  }
});

testCase("nudgeTextAwayFromFaces handles multiple faces", () => {
  const text: PixelBounds = { x: 150, y: 150, width: 100, height: 50 };
  const faceBounds: PixelBounds[] = [
    { x: 100, y: 100, width: 100, height: 100 },  // Overlaps text
    { x: 300, y: 300, width: 100, height: 100 }   // Doesn't overlap
  ];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 500, height: 500 };

  const nudge = nudgeTextAwayFromFaces(text, faceBounds, safeBounds);

  assertEqual(nudge !== null, true, "Should return a nudge result");
  if (nudge) {
    assertEqual(nudge.magnitude > 0, true, "Should have positive magnitude");
  }
});

testCase("nudgeTextAwayFromFaces respects safe bounds", () => {
  // Text overlaps face but is constrained by tight safe bounds
  const text: PixelBounds = { x: 50, y: 50, width: 50, height: 50 };
  const faceBounds: PixelBounds[] = [{ x: 25, y: 25, width: 50, height: 50 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 150, height: 150 };

  const nudge = nudgeTextAwayFromFaces(text, faceBounds, safeBounds);

  assertEqual(nudge !== null, true, "Should return a nudge result");
  if (nudge) {
    // Verify the nudged position is within safe bounds
    const newX = text.x + nudge.dx;
    const newY = text.y + nudge.dy;

    assertEqual(newX >= safeBounds.x, true, "New X should be >= safe bounds left");
    assertEqual(newY >= safeBounds.y, true, "New Y should be >= safe bounds top");
    assertEqual(
      newX + text.width <= safeBounds.x + safeBounds.width,
      true,
      "New X + width should be <= safe bounds right"
    );
    assertEqual(
      newY + text.height <= safeBounds.y + safeBounds.height,
      true,
      "New Y + height should be <= safe bounds bottom"
    );
  }
});

testCase("nudgeTextAwayFromFaces handles text fully inside face", () => {
  // Text is completely inside a large face
  const text: PixelBounds = { x: 50, y: 50, width: 50, height: 30 };
  const faceBounds: PixelBounds[] = [{ x: 0, y: 0, width: 200, height: 200 }];
  const safeBounds: PixelBounds = { x: 0, y: 0, width: 400, height: 400 };

  const nudge = nudgeTextAwayFromFaces(text, faceBounds, safeBounds);

  assertEqual(nudge !== null, true, "Should return a nudge result");
  if (nudge) {
    assertEqual(nudge.magnitude > 0, true, "Should require significant nudge to escape");
  }
});

console.log("\n✅ All collision validator tests passed!\n");
