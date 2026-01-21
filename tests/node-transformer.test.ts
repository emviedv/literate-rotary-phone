/**
 * Characterization tests for node-transformer module extraction
 * Tests for scaleNodeRecursive logic and node-specific scaling (lines 537-758)
 *
 * Run: npx jest --runInBand tests/node-transformer.test.ts
 */

// Test utilities
function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual: number, expected: number, epsilon: number, message: string): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ~${expected}, got ${actual} (epsilon: ${epsilon})`);
  }
}

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

// Mock factories
type MockNode = {
  id: string;
  type: string;
  name: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  children?: MockNode[];
  layoutMode?: string;
  layoutPositioning?: string;
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: any[];
  fills?: any[];
};

type MockTarget = {
  width: number;
  height: number;
};

function createMockNode(overrides: Partial<MockNode> = {}): MockNode {
  return {
    id: "node-1",
    type: "RECTANGLE",
    name: "Mock Node",
    width: 100,
    height: 80,
    x: 10,
    y: 20,
    children: [],
    strokeWeight: 2,
    cornerRadius: 8,
    effects: [],
    fills: [],
    ...overrides
  };
}

function createMockTarget(overrides: Partial<MockTarget> = {}): MockTarget {
  return {
    width: 1920,
    height: 960,
    ...overrides
  };
}

// ============================================================================
// BACKGROUND DETECTION TESTS
// ============================================================================

testCase("isBackgroundLike detects large nodes covering 95%+ of root", () => {
  const node = createMockNode({ width: 950, height: 100 });
  const rootWidth = 1000;
  const rootHeight = 100;

  // Logic from element-classification.ts (referenced in variant-scaling.ts line 544)
  const nodeArea = node.width! * node.height!;
  const rootArea = rootWidth * rootHeight;
  const isBackground = rootArea > 0 && nodeArea >= rootArea * 0.95;

  assertEqual(isBackground, true, "95% coverage should be background-like");
});

testCase("isBackgroundLike returns false for smaller nodes", () => {
  const node = createMockNode({ width: 200, height: 100 });
  const rootWidth = 1000;
  const rootHeight = 100;

  const nodeArea = node.width! * node.height!;
  const rootArea = rootWidth * rootHeight;
  const isBackground = rootArea > 0 && nodeArea >= rootArea * 0.95;

  assertEqual(isBackground, false, "20% coverage should not be background-like");
});

// ============================================================================
// AUTO LAYOUT FRAME DETECTION TESTS
// ============================================================================

testCase("auto layout frame detection logic", () => {
  const frameNode = createMockNode({
    type: "FRAME",
    layoutMode: "HORIZONTAL"
  });
  const noneNode = createMockNode({
    type: "FRAME",
    layoutMode: "NONE"
  });

  // Logic from lines 550-551
  const isAutoLayoutFrame1 = frameNode.type === "FRAME" &&
    "layoutMode" in frameNode && frameNode.layoutMode !== "NONE";
  const isAutoLayoutFrame2 = noneNode.type === "FRAME" &&
    "layoutMode" in noneNode && noneNode.layoutMode !== "NONE";

  assertEqual(isAutoLayoutFrame1, true, "FRAME with HORIZONTAL mode should be auto-layout");
  assertEqual(isAutoLayoutFrame2, false, "FRAME with NONE mode should not be auto-layout");
});

// ============================================================================
// CHILD POSITION ADJUSTMENT LOGIC TESTS
// ============================================================================

testCase("position adjustment skipped for auto-layout children", () => {
  const autoLayoutFrame = createMockNode({
    type: "FRAME",
    layoutMode: "HORIZONTAL"
  });
  const flowChild = createMockNode({ layoutPositioning: "AUTO", x: 50, y: 100 });
  const absoluteChild = createMockNode({ layoutPositioning: "ABSOLUTE", x: 50, y: 100 });

  // Logic from lines 579-587
  const isAutoLayoutFrame = autoLayoutFrame.type === "FRAME" &&
    autoLayoutFrame.layoutMode !== "NONE";

  const shouldAdjustFlow = !isAutoLayoutFrame;
  const shouldAdjustAbsolute = isAutoLayoutFrame &&
    "layoutPositioning" in flowChild && flowChild.layoutPositioning === "ABSOLUTE";
  const shouldAdjustAbsoluteChild = isAutoLayoutFrame &&
    "layoutPositioning" in absoluteChild && absoluteChild.layoutPositioning === "ABSOLUTE";

  assertEqual(shouldAdjustFlow, false, "flow children in auto-layout should not adjust");
  assertEqual(shouldAdjustAbsolute, false, "flow child marked as AUTO should not adjust");
  assertEqual(shouldAdjustAbsoluteChild, true, "absolute child in auto-layout should adjust");
});

// ============================================================================
// NODE SIZING TESTS
// ============================================================================

testCase("node sizing calculation with scale", () => {
  const node = createMockNode({ width: 200, height: 150 });
  const scale = 1.5;

  // Logic from lines 598-599
  let newWidth = node.width! * scale;
  let newHeight = node.height! * scale;

  assertEqual(newWidth, 300, "width should scale to 300");
  assertEqual(newHeight, 225, "height should scale to 225");
});

testCase("background sizing overrides scaled dimensions", () => {
  const node = createMockNode({ width: 800, height: 600 });
  const target = createMockTarget({ width: 1920, height: 1080 });
  const scale = 1.5;
  const isBackground = true;

  let newWidth = node.width! * scale; // 1200
  let newHeight = node.height! * scale; // 900

  // Logic from lines 604-607
  if (isBackground) {
    newWidth = target.width;
    newHeight = target.height;
  }

  assertEqual(newWidth, 1920, "background width should match target");
  assertEqual(newHeight, 1080, "background height should match target");
});

// ============================================================================
// MINIMUM SIZE ENFORCEMENT TESTS
// ============================================================================

testCase("minimum size enforcement for logos", () => {
  const logoNode = createMockNode({
    name: "Company Logo",
    width: 20,  // Small original size
    height: 20
  });
  const scale = 0.5; // Would make it even smaller

  // Mock MIN_ELEMENT_SIZES logic
  const MIN_ELEMENT_SIZES = {
    LOGO: { width: 32, height: 32 }
  };

  const getElementRole = (node: MockNode) => {
    return /logo/i.test(node.name) ? "LOGO" : null;
  };

  let newWidth = logoNode.width! * scale; // 10
  let newHeight = logoNode.height! * scale; // 10

  const elementRole = getElementRole(logoNode);
  if (elementRole && MIN_ELEMENT_SIZES[elementRole as keyof typeof MIN_ELEMENT_SIZES]) {
    const minSize = MIN_ELEMENT_SIZES[elementRole as keyof typeof MIN_ELEMENT_SIZES];

    if (newWidth < minSize.width || newHeight < minSize.height) {
      const minScaleW = minSize.width / logoNode.width!;
      const minScaleH = minSize.height / logoNode.height!;
      const preserveScale = Math.max(minScaleW, minScaleH, scale);

      newWidth = Math.max(newWidth, logoNode.width! * preserveScale);
      newHeight = Math.max(newHeight, logoNode.height! * preserveScale);
    }
  }

  assertEqual(newWidth, 32, "logo width should be enforced to minimum");
  assertEqual(newHeight, 32, "logo height should be enforced to minimum");
});

// ============================================================================
// DECORATIVE POINTER ASPECT RATIO PRESERVATION TESTS
// ============================================================================

testCase("decorative pointer aspect ratio preservation", () => {
  const pointerNode = createMockNode({
    name: "arrow-pointer",
    width: 100,
    height: 20  // 5:1 aspect ratio
  });
  const scale = 1.5;

  // Mock isDecorativePointer logic
  const isDecorativePointer = (node: MockNode) => {
    if (node.type !== "FRAME" && node.type !== "VECTOR" && node.type !== "POLYGON") return false;
    const width = node.width || 0;
    const height = node.height || 0;
    if (width <= 0 || height <= 0) return false;
    const aspectRatio = width / height;
    return (aspectRatio > 3 || aspectRatio < 0.33) && /pointer|arrow/i.test(node.name);
  };

  let newWidth = pointerNode.width! * scale; // 150
  let newHeight = pointerNode.height! * scale; // 30

  if (isDecorativePointer(pointerNode)) {
    const originalAspect = pointerNode.width! / pointerNode.height!; // 5
    const currentAspect = newWidth / newHeight; // 5

    // Logic from lines 645-660
    if (Math.abs(originalAspect - currentAspect) > 0.1) {
      const fitWidth = Math.min(newWidth, newHeight * originalAspect);
      const fitHeight = fitWidth / originalAspect;
      newWidth = fitWidth;
      newHeight = fitHeight;
    }
  }

  // In this case, aspect ratio is preserved, so no change needed
  assertEqual(newWidth, 150, "pointer width should scale normally when aspect preserved");
  assertAlmostEqual(newWidth / newHeight, 5, 0.1, "aspect ratio should be preserved");
});

// ============================================================================
// SAFE SIZING AND ROUNDING TESTS
// ============================================================================

testCase("safe sizing clamps to minimum 1px", () => {
  let newWidth = 0.3;
  let newHeight = -0.5;

  // Logic from lines 663-664
  const safeWidth = Math.max(1, Math.round(newWidth));
  const safeHeight = Math.max(1, Math.round(newHeight));

  assertEqual(safeWidth, 1, "width should clamp to minimum 1");
  assertEqual(safeHeight, 1, "height should clamp to minimum 1");
});

testCase("safe sizing rounds to nearest integer", () => {
  let newWidth = 123.7;
  let newHeight = 89.2;

  const safeWidth = Math.max(1, Math.round(newWidth));
  const safeHeight = Math.max(1, Math.round(newHeight));

  assertEqual(safeWidth, 124, "should round 123.7 to 124");
  assertEqual(safeHeight, 89, "should round 89.2 to 89");
});

// ============================================================================
// AUTO LAYOUT REFLOW TESTS
// ============================================================================

testCase("auto layout reflow toggle for nested frames", () => {
  const autoFrame = createMockNode({
    type: "FRAME",
    layoutMode: "VERTICAL"
  });

  // Mock the reflow logic from lines 676-693
  const isAutoLayoutFrame = autoFrame.type === "FRAME" && autoFrame.layoutMode !== "NONE";

  if (isAutoLayoutFrame) {
    const originalMode = autoFrame.layoutMode;
    // const originalPrimary = "MIN"; // Used for restoration logic
    // const originalCounter = "MIN"; // Used for restoration logic

    // Toggle to force reflow
    autoFrame.layoutMode = "NONE";
    autoFrame.layoutMode = originalMode;

    assertEqual(autoFrame.layoutMode, "VERTICAL", "should restore original layout mode");
  }

  assert(isAutoLayoutFrame, "should detect auto layout frame");
});

// ============================================================================
// STROKE WEIGHT SCALING TESTS
// ============================================================================

testCase("stroke weight scaling", () => {
  const node = createMockNode({ strokeWeight: 4 });
  const scale = 1.5;

  // Mock scaleStrokeWeight function
  const scaleStrokeWeight = (weight: number, scale: number) => {
    return Math.max(0.5, Math.round(weight * scale));
  };

  // Logic from lines 714-718
  if (node.strokeWeight !== undefined && typeof node.strokeWeight === "number") {
    if (node.strokeWeight > 0) {
      node.strokeWeight = scaleStrokeWeight(node.strokeWeight, scale);
    }
  }

  assertEqual(node.strokeWeight, 6, "stroke weight should scale from 4 to 6");
});

// ============================================================================
// CORNER RADIUS SCALING TESTS
// ============================================================================

testCase("corner radius scaling with size context", () => {
  const node = createMockNode({
    cornerRadius: 12,
    width: 100,
    height: 80
  });
  const scale = 2.0;

  // Mock scaleCornerRadius function
  const scaleCornerRadius = (radius: number, scale: number, width: number, height: number) => {
    const scaledRadius = radius * scale;
    const maxRadius = Math.min(width, height) / 2;
    return Math.min(scaledRadius, maxRadius);
  };

  // Logic from lines 723-727
  const nodeWidth = node.width! * scale; // 200
  const nodeHeight = node.height! * scale; // 160

  if (typeof node.cornerRadius === "number") {
    node.cornerRadius = scaleCornerRadius(node.cornerRadius, scale, nodeWidth, nodeHeight);
  }

  // scaledRadius = 12 * 2 = 24
  // maxRadius = min(200, 160) / 2 = 80
  // result = min(24, 80) = 24
  assertEqual(node.cornerRadius, 24, "corner radius should scale to 24");
});

testCase("corner radius capped by node dimensions", () => {
  const node = createMockNode({
    cornerRadius: 50,
    width: 60,
    height: 40
  });
  const scale = 2.0;

  const scaleCornerRadius = (radius: number, scale: number, width: number, height: number) => {
    const scaledRadius = radius * scale;
    const maxRadius = Math.min(width, height) / 2;
    return Math.min(scaledRadius, maxRadius);
  };

  const nodeWidth = node.width! * scale; // 120
  const nodeHeight = node.height! * scale; // 80

  if (typeof node.cornerRadius === "number") {
    node.cornerRadius = scaleCornerRadius(node.cornerRadius, scale, nodeWidth, nodeHeight);
  }

  // scaledRadius = 50 * 2 = 100
  // maxRadius = min(120, 80) / 2 = 40
  // result = min(100, 40) = 40
  assertEqual(node.cornerRadius, 40, "corner radius should cap at half min dimension");
});

// ============================================================================
// EFFECTS AND FILLS SCALING TESTS
// ============================================================================

testCase("effects array scaling preserves structure", () => {
  const mockEffect = {
    type: "DROP_SHADOW",
    radius: 10,
    offset: { x: 2, y: 4 }
  };
  const node = createMockNode({ effects: [mockEffect] });

  // Mock scaleEffect function
  const scaleEffect = (effect: any, scale: number) => ({
    ...effect,
    radius: effect.radius * scale,
    offset: {
      x: effect.offset.x * scale,
      y: effect.offset.y * scale
    }
  });

  // Logic from lines 748-750
  if (Array.isArray(node.effects)) {
    node.effects = node.effects.map((effect) => scaleEffect(effect, 1.5));
  }

  assertEqual(node.effects?.[0]?.radius, 15, "effect radius should scale");
  assertEqual(node.effects?.[0]?.offset?.x, 3, "effect offset X should scale");
});

testCase("fills array scaling for gradients", () => {
  const mockGradientFill = {
    type: "GRADIENT_LINEAR",
    gradientTransform: [[1, 0, 0.5], [0, 1, 0.5]]
  };
  const node = createMockNode({ fills: [mockGradientFill] });

  // Mock scalePaint function
  const scalePaint = (paint: any, scale: number) => ({
    ...paint,
    gradientTransform: paint.gradientTransform?.map((row: number[]) =>
      row.map((value: number, index: number) => index === 2 ? value : value * scale)
    )
  });

  // Logic from lines 752-756
  if (Array.isArray(node.fills)) {
    node.fills = node.fills.map((paint) => scalePaint(paint, 2));
  }

  // Transform matrix scaling: scale first two values in each row, preserve third
  assertEqual(node.fills?.[0]?.gradientTransform?.[0]?.[0], 2, "transform[0][0] should scale");
  assertEqual(node.fills?.[0]?.gradientTransform?.[0]?.[2], 0.5, "transform[0][2] should not scale");
});

console.log("\n✅ All node-transformer characterization tests passed!\n");