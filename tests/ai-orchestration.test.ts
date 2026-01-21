import {
  VISION_ONLY_PROMPT,
  parseVisionResponse,
  type VisionFacts,
  type VisionFaceRegion
} from "../core/ai-vision-prompt.js";
import {
  buildLayoutPromptWithFacts,
  buildLayoutUserMessage,
  visionFacesToAiFaces
} from "../core/ai-layout-prompt.js";

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

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`${message}\nExpected: true\nReceived: false`);
  }
}

// === Vision Prompt Tests ===

testCase("VISION_ONLY_PROMPT contains key instructions", () => {
  assertTrue(
    VISION_ONLY_PROMPT.includes("Vision Analyzer"),
    "Should identify as Vision Analyzer"
  );
  assertTrue(
    VISION_ONLY_PROMPT.includes("FACE DETECTION"),
    "Should contain face detection section"
  );
  assertTrue(
    VISION_ONLY_PROMPT.includes("subjectOccupancy"),
    "Should mention subject occupancy"
  );
  assertTrue(
    VISION_ONLY_PROMPT.includes("JSON"),
    "Should mention JSON output"
  );
});

// === parseVisionResponse Tests ===

testCase("parseVisionResponse handles valid response with faces", () => {
  const rawResponse = {
    faceRegions: [
      { x: 0.3, y: 0.4, width: 0.15, height: 0.2, confidence: 0.95 }
    ],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.9
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    assertEqual(result.faceRegions.length, 1, "Should have 1 face region");
    assertApproxEqual(result.faceRegions[0].x, 0.3, 0.001, "Face x should be 0.3");
    assertApproxEqual(result.faceRegions[0].y, 0.4, 0.001, "Face y should be 0.4");
    assertEqual(result.subjectOccupancy, "left", "Subject occupancy should be left");
    assertEqual(result.subjectType, "person", "Subject type should be person");
    assertEqual(result.intent, "Subject-Dominant", "Intent should be Subject-Dominant");
    assertApproxEqual(result.confidence, 0.9, 0.001, "Confidence should be 0.9");
  }
});

testCase("parseVisionResponse handles empty face regions", () => {
  const rawResponse = {
    faceRegions: [],
    subjectOccupancy: "none",
    subjectType: "abstract",
    intent: "Information-Dominant",
    confidence: 0.8
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    assertEqual(result.faceRegions.length, 0, "Should have 0 face regions");
    assertEqual(result.subjectOccupancy, "none", "Subject occupancy should be none");
  }
});

testCase("parseVisionResponse clamps out-of-range values", () => {
  const rawResponse = {
    faceRegions: [
      { x: 1.5, y: -0.2, width: 2.0, height: 0.1, confidence: 1.5 }
    ],
    subjectOccupancy: "right",
    subjectType: "product",
    intent: "Subject-Dominant",
    confidence: 1.5
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    // Values should be clamped to 0-1 range
    assertApproxEqual(result.faceRegions[0].x, 1.0, 0.001, "Face x should be clamped to 1.0");
    assertApproxEqual(result.faceRegions[0].y, 0.0, 0.001, "Face y should be clamped to 0.0");
    assertApproxEqual(result.faceRegions[0].width, 1.0, 0.001, "Width should be clamped to 1.0");
    assertApproxEqual(result.faceRegions[0].confidence, 1.0, 0.001, "Confidence should be clamped to 1.0");
    assertApproxEqual(result.confidence, 1.0, 0.001, "Overall confidence should be clamped to 1.0");
  }
});

testCase("parseVisionResponse handles invalid subject occupancy", () => {
  const rawResponse = {
    faceRegions: [],
    subjectOccupancy: "invalid",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.8
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    assertEqual(result.subjectOccupancy, "none", "Invalid occupancy should default to none");
  }
});

testCase("parseVisionResponse handles invalid intent", () => {
  const rawResponse = {
    faceRegions: [],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "invalid-intent",
    confidence: 0.8
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    assertEqual(result.intent, "Information-Dominant", "Invalid intent should default to Information-Dominant");
  }
});

testCase("parseVisionResponse handles null input", () => {
  const result = parseVisionResponse(null);
  assertEqual(result, null, "Null input should return null");
});

testCase("parseVisionResponse handles non-object input", () => {
  const result = parseVisionResponse("not an object");
  assertEqual(result, null, "String input should return null");
});

testCase("parseVisionResponse handles missing confidence defaults", () => {
  const rawResponse = {
    faceRegions: [
      { x: 0.5, y: 0.5 } // Missing width, height, confidence
    ],
    subjectOccupancy: "center",
    subjectType: "person",
    intent: "Subject-Dominant"
    // Missing confidence
  };

  const result = parseVisionResponse(rawResponse);

  assertEqual(result !== null, true, "Should parse successfully");
  if (result) {
    assertEqual(result.faceRegions.length, 1, "Should have 1 face");
    assertApproxEqual(result.faceRegions[0].width, 0.1, 0.001, "Width should default to 0.1");
    assertApproxEqual(result.faceRegions[0].height, 0.1, 0.001, "Height should default to 0.1");
    assertApproxEqual(result.faceRegions[0].confidence, 0.5, 0.001, "Face confidence should default to 0.5");
    assertApproxEqual(result.confidence, 0.5, 0.001, "Overall confidence should default to 0.5");
  }
});

// === buildLayoutPromptWithFacts Tests ===

testCase("buildLayoutPromptWithFacts includes face facts", () => {
  const facts: VisionFacts = {
    faceRegions: [
      { x: 0.3, y: 0.4, width: 0.15, height: 0.2, confidence: 0.95 }
    ],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.9
  };

  const prompt = buildLayoutPromptWithFacts(facts);

  assertTrue(prompt.includes("Layout Engineer"), "Should identify as Layout Engineer");
  assertTrue(prompt.includes("IMMUTABLE VISUAL FACTS"), "Should contain facts section");
  assertTrue(prompt.includes("Subject Occupancy"), "Should mention subject occupancy");
  assertTrue(prompt.includes("Face"), "Should mention face");
  assertTrue(prompt.includes("LEFT"), "Should mention LEFT position");
  assertTrue(prompt.includes("REPULSION LAW"), "Should contain repulsion law");
});

testCase("buildLayoutPromptWithFacts handles left occupancy", () => {
  const facts: VisionFacts = {
    faceRegions: [],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.9
  };

  const prompt = buildLayoutPromptWithFacts(facts);

  assertTrue(
    prompt.includes("anchor RIGHT") || prompt.includes("anchor right"),
    "Left occupancy should direct text to anchor right"
  );
});

testCase("buildLayoutPromptWithFacts handles right occupancy", () => {
  const facts: VisionFacts = {
    faceRegions: [],
    subjectOccupancy: "right",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.9
  };

  const prompt = buildLayoutPromptWithFacts(facts);

  assertTrue(
    prompt.includes("anchor LEFT") || prompt.includes("anchor left"),
    "Right occupancy should direct text to anchor left"
  );
});

testCase("buildLayoutPromptWithFacts handles no faces", () => {
  const facts: VisionFacts = {
    faceRegions: [],
    subjectOccupancy: "none",
    subjectType: "abstract",
    intent: "Information-Dominant",
    confidence: 0.8
  };

  const prompt = buildLayoutPromptWithFacts(facts);

  assertTrue(prompt.includes("No faces detected"), "Should mention no faces");
  assertTrue(prompt.includes("Standard layout rules"), "Should mention standard rules");
});

// === buildLayoutUserMessage Tests ===

testCase("buildLayoutUserMessage includes frame summary and facts", () => {
  const facts: VisionFacts = {
    faceRegions: [
      { x: 0.3, y: 0.4, width: 0.15, height: 0.2, confidence: 0.95 }
    ],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.9
  };

  const message = buildLayoutUserMessage("Test frame summary JSON", facts);

  assertTrue(message.includes("Test frame summary JSON"), "Should include frame summary");
  assertTrue(message.includes("Subject Occupancy: left"), "Should include occupancy");
  assertTrue(message.includes("Face Count: 1"), "Should include face count");
  assertTrue(message.includes("17 targets"), "Should mention 17 targets");
});

// === visionFacesToAiFaces Tests ===

testCase("visionFacesToAiFaces converts face regions", () => {
  const visionFaces: VisionFaceRegion[] = [
    { x: 0.3, y: 0.4, width: 0.15, height: 0.2, confidence: 0.95 },
    { x: 0.7, y: 0.5, width: 0.1, height: 0.15, confidence: 0.8 }
  ];

  const aiFaces = visionFacesToAiFaces(visionFaces);

  assertEqual(aiFaces.length, 2, "Should convert 2 faces");
  assertEqual(aiFaces[0].nodeId, "vision-face-0", "First face should have nodeId vision-face-0");
  assertEqual(aiFaces[1].nodeId, "vision-face-1", "Second face should have nodeId vision-face-1");
  assertApproxEqual(aiFaces[0].x, 0.3, 0.001, "First face x should be 0.3");
  assertApproxEqual(aiFaces[0].y, 0.4, 0.001, "First face y should be 0.4");
  assertApproxEqual(aiFaces[0].confidence, 0.95, 0.001, "First face confidence should be 0.95");
});

testCase("visionFacesToAiFaces handles empty array", () => {
  const aiFaces = visionFacesToAiFaces([]);
  assertEqual(aiFaces.length, 0, "Should return empty array");
});

// === Integration Test: Full Chained Flow Data ===

testCase("Vision facts can be parsed and used in layout prompt", () => {
  // Simulate vision response from API
  const rawVisionResponse = {
    faceRegions: [
      { x: 0.25, y: 0.35, width: 0.12, height: 0.18, confidence: 0.92 }
    ],
    subjectOccupancy: "left",
    subjectType: "person",
    intent: "Subject-Dominant",
    confidence: 0.88
  };

  // Parse vision response
  const visionFacts = parseVisionResponse(rawVisionResponse);
  assertEqual(visionFacts !== null, true, "Vision facts should parse");

  if (visionFacts) {
    // Build layout prompt with parsed facts
    const layoutPrompt = buildLayoutPromptWithFacts(visionFacts);
    assertTrue(layoutPrompt.length > 0, "Layout prompt should be generated");
    assertTrue(layoutPrompt.includes("0.25"), "Prompt should include face x coordinate");

    // Convert faces for AI signals
    const aiFaces = visionFacesToAiFaces(visionFacts.faceRegions);
    assertEqual(aiFaces.length, 1, "Should have 1 AI face");
    assertEqual(aiFaces[0].nodeId, "vision-face-0", "Face should have correct nodeId");
  }
});

console.log("\n✅ All AI orchestration tests passed!\n");
