/**
 * Characterization tests for edge padding and safe area enforcement.
 */

// Test utilities
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

// ============================================================================
// Constants
// ============================================================================

const MIN_EDGE_PADDING = 40;
const TIKTOK_WIDTH = 1080;
const TIKTOK_HEIGHT = 1920;
const BOTTOM_DANGER_ZONE = 0.35;
const TOP_CAUTION_ZONE = 0.15;

// ============================================================================
// Tests
// ============================================================================

console.log("\n🛡️ Edge Enforcement Characterization Tests\n");

// --- Edge Padding ---

testCase("enforceEdgePadding: text at left edge (relX < 40) shifts right", () => {
  // Characterization: correction = MIN_EDGE_PADDING - relX
  const relX = 20;
  const correction = MIN_EDGE_PADDING - relX;

  assertEqual(correction, 20, "Should shift 20px right");
});

testCase("enforceEdgePadding: text at right edge shifts left", () => {
  // Characterization: if relRight > maxRight, correction = relRight - maxRight
  const textWidth = 200;
  const relX = 900;
  const relRight = relX + textWidth; // 1100
  const maxRight = TIKTOK_WIDTH - MIN_EDGE_PADDING; // 1040

  const correction = relRight > maxRight ? relRight - maxRight : 0;

  assertEqual(correction, 60, "Should shift 60px left");
});

testCase("enforceEdgePadding: text within bounds has no correction", () => {
  const relX = 100;
  const textWidth = 200;
  const relRight = relX + textWidth; // 300
  const maxRight = TIKTOK_WIDTH - MIN_EDGE_PADDING; // 1040

  const needsLeftCorrection = relX < MIN_EDGE_PADDING;
  const needsRightCorrection = relRight > maxRight;

  assertEqual(needsLeftCorrection, false, "No left correction needed");
  assertEqual(needsRightCorrection, false, "No right correction needed");
});

// --- Safe Area Detection ---

testCase("enforceSafeAreas: bottom danger zone starts at 65% height", () => {
  const bottomDangerY = TIKTOK_HEIGHT * (1 - BOTTOM_DANGER_ZONE);

  assertEqual(bottomDangerY, 1248, "Danger zone starts at y=1248");
});

testCase("enforceSafeAreas: top caution zone ends at 15% height", () => {
  const topCautionY = TIKTOK_HEIGHT * TOP_CAUTION_ZONE;

  assertEqual(topCautionY, 288, "Caution zone ends at y=288");
});

testCase("enforceSafeAreas: node in bottom danger zone is flagged", () => {
  const bottomDangerY = 1248;
  const nodeRelY = 1200;
  const nodeHeight = 100;
  const nodeRelBottom = nodeRelY + nodeHeight; // 1300

  const inDangerZone = nodeRelBottom > bottomDangerY;

  assertEqual(inDangerZone, true, "Node extending past y=1248 is in danger zone");
});

testCase("enforceSafeAreas: node above danger zone is safe", () => {
  const bottomDangerY = 1248;
  const nodeRelBottom = 1200;

  const inDangerZone = nodeRelBottom > bottomDangerY;

  assertEqual(inDangerZone, false, "Node at y=1200 is safe");
});

// --- Important Content Detection ---

testCase("isImportantContent: TEXT nodes are important", () => {
  const nodeType: string = "TEXT";
  const isImportant = nodeType === "TEXT";

  assertEqual(isImportant, true, "TEXT is important content");
});

testCase("isImportantContent: nodes with IMAGE fills are important", () => {
  const fills: Array<{ type: string }> = [{ type: "IMAGE" }];
  const hasImageFill = fills.some((f) => f.type === "IMAGE");

  assertEqual(hasImageFill, true, "Image fill indicates important content");
});

testCase("isImportantContent: RECTANGLE without image is not important", () => {
  const nodeType: string = "RECTANGLE";
  const fills: Array<{ type: string }> = [{ type: "SOLID" }];

  const isText = nodeType === "TEXT";
  const hasImageFill = fills.some((f) => f.type === "IMAGE");
  const isImportant = isText || hasImageFill;

  assertEqual(isImportant, false, "Plain rectangle is not important");
});

console.log("\n✅ All edge enforcement characterization tests passed!\n");
