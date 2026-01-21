/**
 * Tests for OpenAI Structured Output Schemas
 *
 * Validates:
 * 1. Schema structure validity
 * 2. Parser behavior with structured outputs enabled
 * 3. Semantic validation (neverHide/hide cross-check, container visibility)
 */

import {
  USE_STRUCTURED_OUTPUTS,
  STAGE_1_SCHEMA,
  STAGE_2_SCHEMA,
  STAGE_3_SCHEMA
} from "../core/design-schemas.js";
import {
  parseStage1Response,
  parseStage2Response,
  parseStage3Response
} from "../core/design-prompts.js";

// ============================================================================
// Test Utilities
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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(array: readonly string[], item: string, message: string): void {
  if (!array.includes(item)) {
    throw new Error(`${message}\nArray: ${JSON.stringify(array)}\nMissing: ${item}`);
  }
}

// ============================================================================
// Schema Structure Tests
// ============================================================================

console.log("\n📐 Schema Structure Tests\n");

testCase("STAGE_1_SCHEMA has required properties", () => {
  assertEqual(STAGE_1_SCHEMA.name, "stage1_design_plan", "Schema name should match");
  assertEqual(STAGE_1_SCHEMA.strict, true, "Schema should use strict mode");
  assertTrue(STAGE_1_SCHEMA.schema.type === "object", "Schema root should be object");
  assertTrue(Array.isArray(STAGE_1_SCHEMA.schema.required), "Schema should have required array");
  assertContains(STAGE_1_SCHEMA.schema.required as unknown as string[], "designStrategy", "Should require designStrategy");
  assertContains(STAGE_1_SCHEMA.schema.required as unknown as string[], "neverHide", "Should require neverHide");
  assertContains(STAGE_1_SCHEMA.schema.required as unknown as string[], "elements", "Should require elements");
});

testCase("STAGE_2_SCHEMA has required properties", () => {
  assertEqual(STAGE_2_SCHEMA.name, "stage2_design_specs", "Schema name should match");
  assertEqual(STAGE_2_SCHEMA.strict, true, "Schema should use strict mode");
  assertTrue(STAGE_2_SCHEMA.schema.type === "object", "Schema root should be object");
  assertContains(STAGE_2_SCHEMA.schema.required as unknown as string[], "plan", "Should require plan");
  assertContains(STAGE_2_SCHEMA.schema.required as unknown as string[], "nodes", "Should require nodes");
  assertContains(STAGE_2_SCHEMA.schema.required as unknown as string[], "confidence", "Should require confidence");
});

testCase("STAGE_3_SCHEMA has required properties", () => {
  assertEqual(STAGE_3_SCHEMA.name, "stage3_evaluation", "Schema name should match");
  assertEqual(STAGE_3_SCHEMA.strict, true, "Schema should use strict mode");
  assertTrue(STAGE_3_SCHEMA.schema.type === "object", "Schema root should be object");
  assertContains(STAGE_3_SCHEMA.schema.required as unknown as string[], "passed", "Should require passed");
  assertContains(STAGE_3_SCHEMA.schema.required as unknown as string[], "issues", "Should require issues");
  assertContains(STAGE_3_SCHEMA.schema.required as unknown as string[], "adjustments", "Should require adjustments");
});

testCase("Feature flag USE_STRUCTURED_OUTPUTS is enabled", () => {
  assertEqual(USE_STRUCTURED_OUTPUTS, true, "Structured outputs should be enabled by default");
});

// ============================================================================
// Parser Tests - Stage 1
// ============================================================================

console.log("\n🔍 Parser Tests - Stage 1\n");

testCase("parseStage1Response accepts valid JSON", () => {
  const validResponse = JSON.stringify({
    designStrategy: "Stack content vertically",
    reasoning: "TikTok is vertical format",
    visualInventory: {
      logos: [{ description: "Brand logo", nodeNameGuess: "Logo", visualLocation: "top-left" }],
      prices: [],
      headlines: [{ text: "Main headline", nodeNameGuess: "Title" }],
      primarySubject: "Product mockup",
      ctas: [{ text: "Buy Now", nodeNameGuess: "CTA Button" }]
    },
    neverHide: ["Logo", "Title", "CTA Button"],
    designAnalysis: {
      visualFocal: "Product image",
      compositionalFlow: "Top to bottom",
      layoutLogic: "Vertical stack",
      typographyHierarchy: "Title > Body",
      designIntent: "Sell product",
      criticalRelationships: ["Logo near title"]
    },
    elements: {
      keep: ["Logo", "Title", "Product"],
      hide: ["Decorative Line"],
      emphasize: ["Title"]
    },
    layoutZones: {
      hero: { top: 15, bottom: 45 },
      content: { top: 45, bottom: 65 },
      branding: { top: 50, bottom: 60 },
      safeArea: { top: 15, bottom: 65 }
    },
    focalPoints: []
  });

  const result = parseStage1Response(validResponse);
  assertEqual(result.success, true, "Should successfully parse valid response");
  assertEqual(result.plan?.designStrategy, "Stack content vertically", "Should extract designStrategy");
});

testCase("parseStage1Response removes neverHide items from hide list (semantic validation)", () => {
  const responseWithConflict = JSON.stringify({
    designStrategy: "Test strategy",
    reasoning: "Test",
    visualInventory: {
      logos: [],
      prices: [],
      headlines: [],
      primarySubject: "",
      ctas: []
    },
    neverHide: ["Logo", "Price"],
    designAnalysis: {
      visualFocal: "",
      compositionalFlow: "",
      layoutLogic: "",
      typographyHierarchy: "",
      designIntent: "",
      criticalRelationships: []
    },
    elements: {
      keep: ["Title"],
      hide: ["Logo", "Decoration"],  // Logo is in neverHide - should be removed
      emphasize: []
    },
    layoutZones: {
      hero: { top: 15, bottom: 45 },
      content: { top: 45, bottom: 65 },
      branding: { top: 50, bottom: 60 },
      safeArea: { top: 15, bottom: 65 }
    },
    focalPoints: []
  });

  const result = parseStage1Response(responseWithConflict);
  assertEqual(result.success, true, "Should succeed but with warnings");
  assertTrue(
    !result.plan?.elements.hide.includes("Logo"),
    "Logo should be removed from hide list"
  );
  assertTrue(
    result.plan?.elements.hide.includes("Decoration") ?? false,
    "Decoration should remain in hide list"
  );
  assertTrue(
    (result.warnings?.length ?? 0) > 0,
    "Should have warnings about the conflict"
  );
});

testCase("parseStage1Response validates container visibility", () => {
  const responseWithContainer = JSON.stringify({
    designStrategy: "Test",
    reasoning: "Test",
    visualInventory: {
      logos: [],
      prices: [],
      headlines: [],
      primarySubject: "",
      ctas: []
    },
    neverHide: [],
    designAnalysis: {
      visualFocal: "",
      compositionalFlow: "",
      layoutLogic: "",
      typographyHierarchy: "",
      designIntent: "",
      criticalRelationships: []
    },
    elements: {
      keep: [],
      hide: ["ContentContainer"],  // Container with children
      emphasize: []
    },
    layoutZones: {
      hero: { top: 15, bottom: 45 },
      content: { top: 45, bottom: 65 },
      branding: { top: 50, bottom: 60 },
      safeArea: { top: 15, bottom: 65 }
    },
    focalPoints: []
  });

  // Provide node tree with container having children
  const nodeTree = JSON.stringify({
    nodes: [
      { id: "1", name: "ContentContainer", hasChildren: true, childCount: 3 },
      { id: "2", name: "Title", parentId: "1" },
      { id: "3", name: "Body", parentId: "1" }
    ]
  });

  const result = parseStage1Response(responseWithContainer, nodeTree);
  assertEqual(result.success, true, "Should succeed but with corrections");
  assertTrue(
    !result.plan?.elements.hide.includes("ContentContainer"),
    "Container should be removed from hide list"
  );
});

// ============================================================================
// Parser Tests - Stage 2
// ============================================================================

console.log("\n🔍 Parser Tests - Stage 2\n");

testCase("parseStage2Response accepts valid JSON", () => {
  const validResponse = JSON.stringify({
    plan: {
      designStrategy: "Vertical stack",
      reasoning: "TikTok format",
      visualInventory: { logos: [], prices: [], headlines: [], primarySubject: "", ctas: [] },
      neverHide: ["Logo"],
      designAnalysis: {
        visualFocal: "",
        compositionalFlow: "",
        layoutLogic: "",
        typographyHierarchy: "",
        designIntent: "",
        criticalRelationships: []
      },
      elements: { keep: [], hide: [], emphasize: [] },
      layoutZones: {
        hero: { top: 15, bottom: 45 },
        content: { top: 45, bottom: 65 },
        branding: { top: 50, bottom: 60 },
        safeArea: { top: 15, bottom: 65 }
      },
      focalPoints: []
    },
    nodes: [
      { nodeId: "1", nodeName: "Logo", visible: true, position: { x: 100, y: 100 } },
      { nodeId: "2", nodeName: "Title", visible: true, position: { x: 100, y: 200 } }
    ],
    confidence: 0.9,
    warnings: []
  });

  const result = parseStage2Response(validResponse);
  assertEqual(result.success, true, "Should successfully parse valid response");
  assertEqual(result.specs?.nodes.length, 2, "Should have 2 node specs");
});

testCase("parseStage2Response enforces neverHide protection", () => {
  const responseWithViolation = JSON.stringify({
    plan: {
      designStrategy: "Test",
      reasoning: "Test",
      visualInventory: { logos: [], prices: [], headlines: [], primarySubject: "", ctas: [] },
      neverHide: ["Logo", "Price"],  // Protected elements
      designAnalysis: {
        visualFocal: "",
        compositionalFlow: "",
        layoutLogic: "",
        typographyHierarchy: "",
        designIntent: "",
        criticalRelationships: []
      },
      elements: { keep: [], hide: [], emphasize: [] },
      layoutZones: {
        hero: { top: 15, bottom: 45 },
        content: { top: 45, bottom: 65 },
        branding: { top: 50, bottom: 60 },
        safeArea: { top: 15, bottom: 65 }
      },
      focalPoints: []
    },
    nodes: [
      { nodeId: "1", nodeName: "Logo", visible: false },  // Trying to hide protected!
      { nodeId: "2", nodeName: "Title", visible: true }
    ],
    confidence: 0.8,
    warnings: []
  });

  const nodeTree = JSON.stringify({
    nodes: [
      { id: "1", name: "Logo" },
      { id: "2", name: "Title" }
    ]
  });

  const result = parseStage2Response(responseWithViolation, nodeTree);
  assertEqual(result.success, true, "Should succeed with corrections");

  // Find the Logo spec
  const logoSpec = result.specs?.nodes.find(n => n.nodeName === "Logo");
  assertEqual(logoSpec?.visible, true, "Logo should be forced visible");
});

testCase("parseStage2Response filters INSTANCE children", () => {
  const responseWithInstanceChildren = JSON.stringify({
    plan: {
      designStrategy: "Test",
      reasoning: "Test",
      visualInventory: { logos: [], prices: [], headlines: [], primarySubject: "", ctas: [] },
      neverHide: [],
      designAnalysis: {
        visualFocal: "",
        compositionalFlow: "",
        layoutLogic: "",
        typographyHierarchy: "",
        designIntent: "",
        criticalRelationships: []
      },
      elements: { keep: [], hide: [], emphasize: [] },
      layoutZones: {
        hero: { top: 15, bottom: 45 },
        content: { top: 45, bottom: 65 },
        branding: { top: 50, bottom: 60 },
        safeArea: { top: 15, bottom: 65 }
      },
      focalPoints: []
    },
    nodes: [
      { nodeId: "btn-1", nodeName: "Button", visible: true, position: { x: 100, y: 500 } },
      { nodeId: "btn-text", nodeName: "Button Text", visible: true, position: { x: 120, y: 510 } }  // Child of INSTANCE
    ],
    confidence: 0.9,
    warnings: []
  });

  const nodeTree = JSON.stringify({
    nodes: [
      { id: "btn-1", name: "Button", type: "INSTANCE" },
      { id: "btn-text", name: "Button Text", parentId: "btn-1" }  // Child of INSTANCE
    ]
  });

  const result = parseStage2Response(responseWithInstanceChildren, nodeTree);
  assertEqual(result.success, true, "Should succeed");

  // Button Text should be filtered out
  const buttonTextSpec = result.specs?.nodes.find(n => n.nodeName === "Button Text");
  assertEqual(buttonTextSpec, undefined, "INSTANCE children should be filtered out");

  // Button itself should remain
  const buttonSpec = result.specs?.nodes.find(n => n.nodeName === "Button");
  assertTrue(buttonSpec !== undefined, "INSTANCE parent should remain");
});

// ============================================================================
// Parser Tests - Stage 3
// ============================================================================

console.log("\n🔍 Parser Tests - Stage 3\n");

testCase("parseStage3Response accepts valid JSON", () => {
  const validResponse = JSON.stringify({
    passed: true,
    issues: [],
    adjustments: [],
    confidence: 0.95
  });

  const result = parseStage3Response(validResponse);
  assertEqual(result.success, true, "Should successfully parse valid response");
  assertEqual(result.evaluation?.passed, true, "Should extract passed boolean");
});

testCase("parseStage3Response handles issues array", () => {
  const responseWithIssues = JSON.stringify({
    passed: false,
    issues: [
      {
        type: "safe-area",
        description: "CTA button in danger zone",
        affectedNodes: ["CTA"],
        suggestedFix: "Move CTA button up"
      }
    ],
    adjustments: [
      { nodeId: "cta-1", nodeName: "CTA", visible: true, position: { x: 490, y: 1000 } }
    ],
    confidence: 0.85
  });

  const result = parseStage3Response(responseWithIssues);
  assertEqual(result.success, true, "Should successfully parse response with issues");
  assertEqual(result.evaluation?.passed, false, "Should be not passed");
  assertEqual(result.evaluation?.issues?.length, 1, "Should have 1 issue");
  assertEqual(result.evaluation?.adjustments?.length, 1, "Should have 1 adjustment");
});

console.log("\n✅ All design-schemas tests passed!\n");
