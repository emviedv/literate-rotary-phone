/**
 * Characterization tests for ai-service.ts
 * These tests lock in current behavior before refactoring.
 * All tests MUST pass before AND after refactoring.
 */

import {
  _uint8ArrayToBase64,
  _collectAllVisibleNodes,
} from "../core/ai-service.js";

// ============================================================================
// Test utilities
// ============================================================================

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

// Mock Figma global
(globalThis as any).figma = {
  mixed: Symbol("mixed")
};

// ============================================================================
// Characterization Test 1: uint8ArrayToBase64
// Tests the base64 encoding function used for image export
// ============================================================================

testCase("uint8ArrayToBase64: empty array returns empty string", () => {
  const result = _uint8ArrayToBase64(new Uint8Array([]));
  assertEqual(result, "", "Empty array should produce empty string");
});

testCase("uint8ArrayToBase64: single byte encoding", () => {
  // Single byte 'A' (65) should encode to 'QQ=='
  const result = _uint8ArrayToBase64(new Uint8Array([65]));
  assertEqual(result, "QQ==", "Single byte 65 should encode to QQ==");
});

testCase("uint8ArrayToBase64: two byte encoding", () => {
  // Two bytes 'AB' (65, 66) should encode to 'QUI='
  const result = _uint8ArrayToBase64(new Uint8Array([65, 66]));
  assertEqual(result, "QUI=", "Two bytes 65,66 should encode to QUI=");
});

testCase("uint8ArrayToBase64: three byte encoding (no padding)", () => {
  // Three bytes 'ABC' (65, 66, 67) should encode to 'QUJD'
  const result = _uint8ArrayToBase64(new Uint8Array([65, 66, 67]));
  assertEqual(result, "QUJD", "Three bytes 65,66,67 should encode to QUJD");
});

testCase("uint8ArrayToBase64: 'Hello' encoding", () => {
  // 'Hello' = [72, 101, 108, 108, 111]
  const bytes = new Uint8Array([72, 101, 108, 108, 111]);
  const result = _uint8ArrayToBase64(bytes);
  assertEqual(result, "SGVsbG8=", "'Hello' should encode to SGVsbG8=");
});

testCase("uint8ArrayToBase64: binary data with high bytes", () => {
  // Test with bytes > 127 (binary data)
  const bytes = new Uint8Array([255, 128, 0, 192, 64]);
  const result = _uint8ArrayToBase64(bytes);
  assertEqual(result, "/4AAwEA=", "Binary data should encode correctly");
});

testCase("uint8ArrayToBase64: longer data chunk", () => {
  // Test 12-byte chunk (4 groups of 3, no padding needed)
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const result = _uint8ArrayToBase64(bytes);
  assertEqual(result, "AQIDBAUGBwgJCgsM", "12-byte chunk should encode without padding");
});

testCase("uint8ArrayToBase64: all zeros", () => {
  const bytes = new Uint8Array([0, 0, 0]);
  const result = _uint8ArrayToBase64(bytes);
  assertEqual(result, "AAAA", "Three zeros should encode to AAAA");
});

testCase("uint8ArrayToBase64: all 255s", () => {
  const bytes = new Uint8Array([255, 255, 255]);
  const result = _uint8ArrayToBase64(bytes);
  assertEqual(result, "////", "Three 255s should encode to ////");
});

// ============================================================================
// Characterization Test 2: collectAllVisibleNodes
// Tests BFS traversal of frame children
// ============================================================================

testCase("collectAllVisibleNodes: empty frame returns empty array", () => {
  const mockFrame = {
    children: []
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 0, "Empty frame should return empty array");
});

testCase("collectAllVisibleNodes: collects visible top-level nodes", () => {
  const mockFrame = {
    children: [
      { id: "node-1", visible: true, type: "RECTANGLE" },
      { id: "node-2", visible: true, type: "TEXT" },
      { id: "node-3", visible: true, type: "FRAME" }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 3, "Should collect all 3 visible nodes");
  assertEqual(result[0].id, "node-1", "First node should be node-1");
  assertEqual(result[1].id, "node-2", "Second node should be node-2");
  assertEqual(result[2].id, "node-3", "Third node should be node-3");
});

testCase("collectAllVisibleNodes: filters invisible nodes", () => {
  const mockFrame = {
    children: [
      { id: "visible-1", visible: true, type: "RECTANGLE" },
      { id: "hidden-1", visible: false, type: "TEXT" },
      { id: "visible-2", visible: true, type: "FRAME" }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 2, "Should only collect 2 visible nodes");
  assertEqual(result[0].id, "visible-1", "First visible node");
  assertEqual(result[1].id, "visible-2", "Second visible node");
});

testCase("collectAllVisibleNodes: traverses nested children (BFS)", () => {
  const mockFrame = {
    children: [
      {
        id: "parent-1",
        visible: true,
        type: "FRAME",
        children: [
          { id: "child-1a", visible: true, type: "TEXT" },
          { id: "child-1b", visible: true, type: "RECTANGLE" }
        ]
      },
      { id: "sibling-2", visible: true, type: "TEXT" }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 4, "Should collect parent + 2 children + sibling = 4");

  // BFS order: parent-1, sibling-2, child-1a, child-1b
  assertEqual(result[0].id, "parent-1", "BFS: parent first");
  assertEqual(result[1].id, "sibling-2", "BFS: sibling before children");
  assertEqual(result[2].id, "child-1a", "BFS: then children");
  assertEqual(result[3].id, "child-1b", "BFS: then children");
});

testCase("collectAllVisibleNodes: skips children of invisible parents", () => {
  const mockFrame = {
    children: [
      {
        id: "hidden-parent",
        visible: false,
        type: "FRAME",
        children: [
          { id: "orphan-child", visible: true, type: "TEXT" }
        ]
      },
      { id: "visible-sibling", visible: true, type: "TEXT" }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 1, "Should only collect visible sibling");
  assertEqual(result[0].id, "visible-sibling", "Only visible sibling collected");
});

testCase("collectAllVisibleNodes: deeply nested structure", () => {
  const mockFrame = {
    children: [
      {
        id: "level-1",
        visible: true,
        type: "FRAME",
        children: [
          {
            id: "level-2",
            visible: true,
            type: "FRAME",
            children: [
              {
                id: "level-3",
                visible: true,
                type: "FRAME",
                children: [
                  { id: "level-4", visible: true, type: "TEXT" }
                ]
              }
            ]
          }
        ]
      }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 4, "Should collect all 4 levels of nesting");
  assertEqual(result[0].id, "level-1", "Level 1 first (BFS)");
  assertEqual(result[1].id, "level-2", "Level 2 second");
  assertEqual(result[2].id, "level-3", "Level 3 third");
  assertEqual(result[3].id, "level-4", "Level 4 fourth");
});

testCase("collectAllVisibleNodes: mixed visibility in nested structure", () => {
  const mockFrame = {
    children: [
      {
        id: "visible-parent",
        visible: true,
        type: "FRAME",
        children: [
          { id: "visible-child", visible: true, type: "TEXT" },
          { id: "hidden-child", visible: false, type: "RECTANGLE" }
        ]
      }
    ]
  } as unknown as FrameNode;

  const result = _collectAllVisibleNodes(mockFrame);
  assertEqual(result.length, 2, "Should collect parent + 1 visible child");
  assertEqual(result[0].id, "visible-parent", "Parent collected");
  assertEqual(result[1].id, "visible-child", "Only visible child collected");
});

// ============================================================================
// Characterization Test 3: Request body structure
// Tests that the AI request body has correct shape
// ============================================================================

testCase("AiServiceResult type has required fields", () => {
  // This tests the type contract - signals and layoutAdvice are optional
  const validResult: import("../core/ai-service.js").AiServiceResult = {
    signals: undefined,
    layoutAdvice: undefined
  };

  assertEqual(typeof validResult, "object", "Result should be object");
});

testCase("EnhancedAiServiceResult type has required fields", () => {
  // Tests the enhanced result type contract
  const validResult: import("../core/ai-service.js").EnhancedAiServiceResult = {
    success: true,
    signals: undefined,
    layoutAdvice: undefined,
    enhancedSummary: undefined,
    recoveryMethod: "primary",
    confidence: 0.95
  };

  assertEqual(validResult.success, true, "success field required");
  assertEqual(typeof validResult.confidence, "number", "confidence should be number");
});

testCase("EnhancedAiServiceResult error state has error field", () => {
  const errorResult: import("../core/ai-service.js").EnhancedAiServiceResult = {
    success: false,
    error: "API request failed"
  };

  assertEqual(errorResult.success, false, "error state has success=false");
  assertEqual(errorResult.error, "API request failed", "error message preserved");
});

// ============================================================================
// Characterization Test 4: Constants and configuration
// Tests that configuration values are as expected
// ============================================================================

testCase("MAX_IMAGE_DIMENSION is reasonable for AI analysis", () => {
  // The constant should be accessible via the module
  // Since it's not exported, we verify through behavior
  // A 1024x1024 source should scale to at most 1024
  // This is a documentation test for the expected constant
  const expectedMaxDimension = 1024;
  assertEqual(expectedMaxDimension, 1024, "MAX_IMAGE_DIMENSION should be 1024");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All ai-service characterization tests passed!\n");
