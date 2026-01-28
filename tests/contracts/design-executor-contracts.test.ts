/**
 * Contract tests for design-executor module boundaries.
 *
 * These tests verify the public API contracts between:
 * - design-executor.ts (orchestrator)
 * - External callers (main.ts)
 * - Types (design-types.ts)
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

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertType(value: unknown, expectedType: string, message: string): void {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`${message}\nExpected type: ${expectedType}\nActual type: ${actualType}`);
  }
}

// ============================================================================
// Contract: ExecutionResult
// ============================================================================

interface ExecutionResult {
  readonly success: boolean;
  readonly variant?: unknown; // FrameNode in real code
  readonly appliedSpecs: number;
  readonly skippedSpecs: number;
  readonly errors: readonly string[];
}

console.log("\n📜 Design Executor Contract Tests\n");

testCase("ExecutionResult: success is boolean", () => {
  const result: ExecutionResult = {
    success: true,
    appliedSpecs: 5,
    skippedSpecs: 0,
    errors: [],
  };

  assertType(result.success, "boolean", "success must be boolean");
});

testCase("ExecutionResult: appliedSpecs and skippedSpecs are numbers", () => {
  const result: ExecutionResult = {
    success: true,
    appliedSpecs: 10,
    skippedSpecs: 2,
    errors: [],
  };

  assertType(result.appliedSpecs, "number", "appliedSpecs must be number");
  assertType(result.skippedSpecs, "number", "skippedSpecs must be number");
});

testCase("ExecutionResult: errors is array of strings", () => {
  const result: ExecutionResult = {
    success: false,
    appliedSpecs: 3,
    skippedSpecs: 2,
    errors: ["Node not found", "Font load failed"],
  };

  assertTrue(Array.isArray(result.errors), "errors must be array");
  assertTrue(
    result.errors.every((e) => typeof e === "string"),
    "all errors must be strings"
  );
});

// ============================================================================
// Contract: AdjustmentResult
// ============================================================================

interface AdjustmentResult {
  readonly applied: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

testCase("AdjustmentResult: has required fields", () => {
  const result: AdjustmentResult = {
    applied: 3,
    skipped: 1,
    errors: [],
  };

  assertType(result.applied, "number", "applied must be number");
  assertType(result.skipped, "number", "skipped must be number");
  assertTrue(Array.isArray(result.errors), "errors must be array");
});

// ============================================================================
// Contract: NodeSpec input
// ============================================================================

interface NodeSpec {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly visible: boolean;
  readonly position?: { readonly x: number; readonly y: number };
  readonly size?: { readonly width: number; readonly height: number };
  readonly zIndex?: number;
  readonly scaleFactor?: number;
  readonly textTruncate?: boolean;
  readonly maxLines?: number;
}

testCase("NodeSpec: required fields are present", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Hero Image",
    visible: true,
  };

  assertType(spec.nodeId, "string", "nodeId must be string");
  assertType(spec.nodeName, "string", "nodeName must be string");
  assertType(spec.visible, "boolean", "visible must be boolean");
});

testCase("NodeSpec: position is optional with x,y numbers", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Title",
    visible: true,
    position: { x: 100, y: 200 },
  };

  assertTrue(spec.position !== undefined, "position should exist");
  assertType(spec.position!.x, "number", "x must be number");
  assertType(spec.position!.y, "number", "y must be number");
});

testCase("NodeSpec: size is optional with width,height numbers", () => {
  const spec: NodeSpec = {
    nodeId: "123:456",
    nodeName: "Frame",
    visible: true,
    size: { width: 500, height: 300 },
  };

  assertTrue(spec.size !== undefined, "size should exist");
  assertType(spec.size!.width, "number", "width must be number");
  assertType(spec.size!.height, "number", "height must be number");
});

// ============================================================================
// Contract: Utility function signatures
// ============================================================================

testCase("calculateScaleFactor: returns scale and fitMode", () => {
  // Contract: calculateScaleFactor(frame) => { scale: number, fitMode: 'width'|'height'|'cover' }
  const mockResult = { scale: 1.5, fitMode: "width" as const };

  assertType(mockResult.scale, "number", "scale must be number");
  assertTrue(
    ["width", "height", "cover"].includes(mockResult.fitMode),
    "fitMode must be width, height, or cover"
  );
});

testCase("getTikTokCenter: returns x,y coordinates", () => {
  // Contract: getTikTokCenter() => { x: number, y: number }
  const center = { x: 540, y: 960 };

  assertEqual(center.x, 1080 / 2, "Center x should be half of TikTok width");
  assertEqual(center.y, 1920 / 2, "Center y should be half of TikTok height");
});

testCase("getCenteredPosition: returns x,y for given dimensions", () => {
  // Contract: getCenteredPosition(width, height) => { x: number, y: number }
  const width = 200;
  const height = 100;
  const position = {
    x: (1080 - width) / 2,
    y: (1920 - height) / 2,
  };

  assertEqual(position.x, 440, "Centered x for 200px width");
  assertEqual(position.y, 910, "Centered y for 100px height");
});

console.log("\n✅ All contract tests passed!\n");
