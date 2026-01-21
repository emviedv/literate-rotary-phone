/**
 * Contract tests for AI service integration boundaries.
 * These tests verify the schema and error handling contracts
 * between ai-service.ts and its consumers.
 */

import { sanitizeAiSignals } from "../core/ai-service.js";

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

function assertDefined<T>(value: T | undefined | null, label: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${label}: Expected value to be defined`);
  }
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: Expected array, got ${typeof value}`);
  }
}

// Mock Figma global
(globalThis as any).figma = {
  mixed: Symbol("mixed")
};

// ============================================================================
// Contract 1: AiSignals schema validation
// ============================================================================

testCase("AiSignals contract: roles array has required fields", () => {
  // Happy path: well-formed AI response
  const validResponse = {
    roles: [
      { nodeId: "node-1", role: "typography", confidence: 0.95 },
      { nodeId: "node-2", role: "subject", confidence: 0.88 }
    ],
    focalPoints: [{ nodeId: "node-2", x: 0.5, y: 0.4, confidence: 0.82 }],
    qa: [{ code: "LOW_CONTRAST", severity: "warn", message: "Check contrast" }]
  };

  const sanitized = sanitizeAiSignals(validResponse);
  assertDefined(sanitized, "Sanitized signals");

  // Verify roles contract
  assertArray(sanitized.roles, "roles");
  assertEqual(sanitized.roles.length, 2, "Should have 2 roles");

  for (const role of sanitized.roles) {
    assertDefined(role.nodeId, "role.nodeId");
    assertDefined(role.role, "role.role");
    assertDefined(role.confidence, "role.confidence");
    assertEqual(typeof role.nodeId, "string", "nodeId should be string");
    assertEqual(typeof role.role, "string", "role should be string");
    assertEqual(typeof role.confidence, "number", "confidence should be number");
    assertEqual(role.confidence >= 0 && role.confidence <= 1, true, "confidence should be 0-1");
  }
});

testCase("AiSignals contract: focalPoints array has required fields", () => {
  const response = {
    roles: [{ nodeId: "n1", role: "typography", confidence: 0.9 }],
    focalPoints: [
      { nodeId: "n1", x: 0.25, y: 0.75, confidence: 0.85 }
    ],
    qa: []
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Sanitized signals");

  // Verify focalPoints contract
  assertArray(sanitized.focalPoints, "focalPoints");
  assertEqual(sanitized.focalPoints.length, 1, "Should have 1 focal point");

  const focal = sanitized.focalPoints[0];
  assertDefined(focal.x, "focal.x");
  assertDefined(focal.y, "focal.y");
  assertDefined(focal.confidence, "focal.confidence");
  assertEqual(typeof focal.x, "number", "x should be number");
  assertEqual(typeof focal.y, "number", "y should be number");
  assertEqual(focal.x >= 0 && focal.x <= 1, true, "x should be 0-1");
  assertEqual(focal.y >= 0 && focal.y <= 1, true, "y should be 0-1");
});

testCase("AiSignals contract: qa array has required fields", () => {
  const response = {
    roles: [],
    focalPoints: [],
    qa: [
      { code: "SAFE_AREA_RISK", severity: "error", message: "Content in danger zone", confidence: 0.78 }
    ]
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Sanitized signals");

  // Verify qa contract
  assertArray(sanitized.qa, "qa");
  assertEqual(sanitized.qa.length, 1, "Should have 1 QA signal");

  const qa = sanitized.qa[0];
  assertDefined(qa.code, "qa.code");
  assertDefined(qa.severity, "qa.severity");
  assertEqual(typeof qa.code, "string", "code should be string");
  assertEqual(["info", "warn", "error"].includes(qa.severity), true, "severity should be info|warn|error");
});

testCase("AiSignals contract: faceRegions array has required fields when present", () => {
  const response = {
    roles: [],
    focalPoints: [],
    qa: [],
    faceRegions: [
      { nodeId: "hero", x: 0.5, y: 0.3, width: 0.2, height: 0.25, confidence: 0.88 }
    ]
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Sanitized signals");
  assertDefined(sanitized.faceRegions, "faceRegions");

  // Verify faceRegions contract
  assertArray(sanitized.faceRegions, "faceRegions");
  assertEqual(sanitized.faceRegions.length, 1, "Should have 1 face region");

  const face = sanitized.faceRegions[0];
  assertDefined(face.x, "face.x");
  assertDefined(face.y, "face.y");
  assertDefined(face.width, "face.width");
  assertDefined(face.height, "face.height");
  assertDefined(face.confidence, "face.confidence");

  // All coordinates and dimensions should be 0-1 range
  assertEqual(face.x >= 0 && face.x <= 1, true, "x should be 0-1");
  assertEqual(face.y >= 0 && face.y <= 1, true, "y should be 0-1");
  assertEqual(face.width >= 0.03 && face.width <= 0.8, true, "width should be 3%-80%");
  assertEqual(face.height >= 0.03 && face.height <= 0.8, true, "height should be 3%-80%");
});

// ============================================================================
// Contract 2: Error handling and edge cases
// ============================================================================

testCase("AiSignals contract: null/undefined input returns undefined", () => {
  assertEqual(sanitizeAiSignals(null), undefined, "null input");
  assertEqual(sanitizeAiSignals(undefined), undefined, "undefined input");
});

testCase("AiSignals contract: empty object returns undefined", () => {
  const result = sanitizeAiSignals({});
  assertEqual(result, undefined, "Empty object should return undefined");
});

testCase("AiSignals contract: malformed roles are filtered, not thrown", () => {
  const response = {
    roles: [
      { nodeId: 123, role: "typography" },           // Invalid nodeId type
      { nodeId: "n1" },                         // Missing role
      { role: "typography" },                        // Missing nodeId
      { nodeId: "n2", role: "typography", confidence: 0.9 } // Valid
    ],
    focalPoints: [],
    qa: []
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Should return result despite malformed entries");
  assertEqual(sanitized.roles.length, 1, "Should only have 1 valid role");
  assertEqual(sanitized.roles[0].nodeId, "n2", "Valid role should be preserved");
});

testCase("AiSignals contract: unknown roles are filtered, not thrown", () => {
  const response = {
    roles: [
      { nodeId: "n1", role: "invalid_role_type", confidence: 0.9 },
      { nodeId: "n2", role: "typography", confidence: 0.85 }
    ],
    focalPoints: [],
    qa: []
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Should return result");
  assertEqual(sanitized.roles.length, 1, "Invalid role should be filtered");
  assertEqual(sanitized.roles[0].role, "typography", "Valid role should remain");
});

testCase("AiSignals contract: unknown QA codes are filtered, not thrown", () => {
  const response = {
    roles: [],
    focalPoints: [],
    qa: [
      { code: "INVALID_QA_CODE", severity: "warn" },
      { code: "LOW_CONTRAST", severity: "info" }
    ]
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Should return result");
  assertEqual(sanitized.qa?.length ?? 0, 1, "Invalid QA code should be filtered");
  // LOW_CONTRAST is consolidated to CONTRAST_ISSUE after sanitization
  assertEqual(sanitized.qa?.[0]?.code, "CONTRAST_ISSUE", "Valid QA code should remain (consolidated)");
});

testCase("AiSignals contract: graceful handling of non-array roles", () => {
  const response = {
    roles: "not an array",
    focalPoints: [],
    qa: []
  };

  // Should not throw - gracefully handle bad data
  const sanitized = sanitizeAiSignals(response);
  // With no valid entries, should return undefined
  assertEqual(sanitized, undefined, "Should return undefined for invalid roles array");
});

// ============================================================================
// Contract 3: Valid role vocabulary (exhaustive check)
// ============================================================================

testCase("AiSignals contract: accepts all valid semantic roles (universal 7-role taxonomy)", () => {
  // Universal taxonomy: 7 roles for compositional layout analysis
  const validRoles = [
    // Primary focal
    "subject",
    // Branding
    "branding",
    // Typography
    "typography",
    // Interactive
    "action",
    // Structural
    "container", "component",
    // Background
    "environment",
    // Catch-all
    "unknown"
  ];

  const response = {
    roles: validRoles.map((role, i) => ({
      nodeId: `node-${i}`,
      role,
      confidence: 0.85  // High confidence by default
    })),
    focalPoints: [],
    qa: []
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Should accept all valid roles");
  assertEqual(sanitized.roles.length, validRoles.length, `Should have ${validRoles.length} roles`);
});

// ============================================================================
// Contract 4: Valid QA code vocabulary (exhaustive check)
// ============================================================================

testCase("AiSignals contract: accepts all valid QA codes", () => {
  // All 33 valid input QA codes (accepted by sanitization)
  const validQaCodes = [
    "LOW_CONTRAST", "LOGO_TOO_SMALL", "TEXT_OVERLAP", "UNCERTAIN_ROLES",
    "SALIENCE_MISALIGNED", "SAFE_AREA_RISK", "GENERIC", "EXCESSIVE_TEXT",
    "MISSING_CTA", "ASPECT_MISMATCH", "TEXT_TOO_SMALL_FOR_TARGET",
    "CONTENT_DENSITY_MISMATCH", "THUMBNAIL_LEGIBILITY", "OVERLAY_CONFLICT",
    "CTA_PLACEMENT_RISK", "HIERARCHY_UNCLEAR", "VERTICAL_OVERFLOW_RISK",
    "HORIZONTAL_OVERFLOW_RISK", "PATTERN_MISMATCH",
    // Accessibility signals (8 new)
    "COLOR_CONTRAST_INSUFFICIENT", "TEXT_TOO_SMALL_ACCESSIBLE", "INSUFFICIENT_TOUCH_TARGETS",
    "HEADING_HIERARCHY_BROKEN", "POOR_FOCUS_INDICATORS", "MOTION_SENSITIVITY_RISK",
    "MISSING_ALT_EQUIVALENT", "POOR_READING_ORDER",
    // Design quality signals (6 new)
    "TYPOGRAPHY_INCONSISTENCY", "COLOR_HARMONY_POOR", "SPACING_INCONSISTENCY",
    "VISUAL_WEIGHT_IMBALANCED", "BRAND_CONSISTENCY_WEAK", "CONTENT_HIERARCHY_FLAT"
  ];

  const response = {
    roles: [],
    focalPoints: [],
    qa: validQaCodes.map(code => ({
      code,
      severity: "warn" as const,
      message: `Test ${code}`
    }))
  };

  const sanitized = sanitizeAiSignals(response);
  assertDefined(sanitized, "Should accept all valid QA codes");

  // After consolidation, 33 input codes map to 25 unique consolidated codes:
  // - LOW_CONTRAST, COLOR_CONTRAST_INSUFFICIENT, COLOR_HARMONY_POOR → CONTRAST_ISSUE (3→1)
  // - TEXT_TOO_SMALL_FOR_TARGET, TEXT_TOO_SMALL_ACCESSIBLE, THUMBNAIL_LEGIBILITY → TEXT_SIZE_ISSUE (3→1)
  // - HIERARCHY_UNCLEAR, CONTENT_HIERARCHY_FLAT, HEADING_HIERARCHY_BROKEN, POOR_READING_ORDER → HIERARCHY_ISSUE (4→1)
  // - VERTICAL_OVERFLOW_RISK, HORIZONTAL_OVERFLOW_RISK → OVERFLOW_RISK (2→1)
  const expectedConsolidatedCount = 25;
  assertEqual(sanitized.qa?.length ?? 0, expectedConsolidatedCount, `Should have ${expectedConsolidatedCount} consolidated QA signals`);
});

console.log("\n✅ All AI contract tests passed!\n");
