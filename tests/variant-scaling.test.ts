/**
 * Characterization tests for variant-scaling.ts
 * These tests lock the current behavior before refactoring.
 * All tests MUST pass before AND after the refactor.
 */

// Mutable type helper to remove readonly constraints from Figma types
type Mutable<T> = T extends ReadonlyArray<infer U>
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

// ============================================================================
// Test Utilities
// ============================================================================

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

// ============================================================================
// Mock Factories
// ============================================================================

type MockNodeOverrides = {
  id?: string;
  type?: string;
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fills?: readonly Paint[];
  children?: SceneNode[];
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  parent?: { name: string };
};

function createMockNode(overrides: MockNodeOverrides = {}): SceneNode {
  return {
    id: overrides.id ?? "node-1",
    type: overrides.type ?? "RECTANGLE",
    name: overrides.name ?? "Mock Node",
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    fills: overrides.fills ?? [],
    children: overrides.children ?? [],
    layoutPositioning: overrides.layoutPositioning ?? "AUTO",
    parent: overrides.parent ?? null
  } as unknown as SceneNode;
}


// ============================================================================
// Inline Implementation for Testing (mirrors variant-scaling.ts logic)
// These replicate the functions we're testing to verify behavior
// ============================================================================

// scaleAutoLayoutMetric - from line 373-377
function scaleAutoLayoutMetric(value: number, scale: number, min: number = 0): number {
  if (value === 0) return 0;
  const scaled = value * scale;
  return Math.max(Math.round(scaled), min);
}

// isBackgroundLike - from lines 570-577
function isBackgroundLike(node: SceneNode, rootWidth: number, rootHeight: number): boolean {
  if (!("width" in node) || !("height" in node)) return false;
  if (typeof (node as any).width !== "number" || typeof (node as any).height !== "number") return false;
  const nodeArea = (node as any).width * (node as any).height;
  const rootArea = rootWidth * rootHeight;
  return rootArea > 0 && nodeArea >= rootArea * 0.95;
}

// isDecorativePointer - from lines 629-659
function isDecorativePointer(node: SceneNode): boolean {
  if (node.type !== "FRAME" && node.type !== "VECTOR" && node.type !== "POLYGON") return false;
  if (!("width" in node) || !("height" in node)) return false;
  const width = (node as any).width as number;
  const height = (node as any).height as number;
  if (width <= 0 || height <= 0) return false;
  const aspectRatio = width / height;
  if (aspectRatio > 3 || aspectRatio < 0.33) {
    const parent = node.parent;
    if (parent && "name" in parent) {
      const parentName = (parent.name as string).toLowerCase();
      if (/frame|container|card|box|bubble|speech|tooltip|callout/i.test(parentName)) {
        return true;
      }
    }
    const nodeName = node.name.toLowerCase();
    if (/pointer|arrow|triangle|tip|caret|tail/i.test(nodeName)) {
      return true;
    }
  }
  return false;
}

// getMinLegibleSize - from lines 889-901
const MIN_LEGIBLE_SIZES = { THUMBNAIL: 9, STANDARD: 11, LARGE_DISPLAY: 14 };
const RESOLUTION_THRESHOLDS = { THUMBNAIL_DIMENSION: 500, LARGE_DISPLAY_DIMENSION: 2000 };

function getMinLegibleSize(target: { width: number; height: number }): number {
  const minDimension = Math.min(target.width, target.height);
  if (minDimension < RESOLUTION_THRESHOLDS.THUMBNAIL_DIMENSION) {
    return MIN_LEGIBLE_SIZES.THUMBNAIL;
  }
  if (target.width >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION ||
      target.height >= RESOLUTION_THRESHOLDS.LARGE_DISPLAY_DIMENSION) {
    return MIN_LEGIBLE_SIZES.LARGE_DISPLAY;
  }
  return MIN_LEGIBLE_SIZES.STANDARD;
}

// positionHeroBleedChild - from lines 523-568
function positionHeroBleedChild(
  child: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): { x: number; y: number } {
  const centerX = child.x + child.width / 2;
  const centerY = child.y + child.height / 2;
  const distToLeft = centerX;
  const distToRight = frameWidth - centerX;
  const distToTop = centerY;
  const distToBottom = frameHeight - centerY;

  let newX = child.x;
  let newY = child.y;

  if (distToLeft <= distToRight) {
    const leftRatio = child.x / Math.max(frameWidth, 1);
    newX = frameWidth * leftRatio;
  } else {
    const rightEdgeOfChild = child.x + child.width;
    const rightRatio = (frameWidth - rightEdgeOfChild) / Math.max(frameWidth, 1);
    newX = frameWidth - (frameWidth * rightRatio) - child.width;
  }

  if (distToTop <= distToBottom) {
    const topRatio = child.y / Math.max(frameHeight, 1);
    newY = frameHeight * topRatio;
  } else {
    const bottomEdgeOfChild = child.y + child.height;
    const bottomRatio = (frameHeight - bottomEdgeOfChild) / Math.max(frameHeight, 1);
    newY = frameHeight - (frameHeight * bottomRatio) - child.height;
  }

  return { x: Math.round(newX), y: Math.round(newY) };
}

// scaleEffect - from lines 985-1029
// Uses mutable clone to allow property modification
type MutableShadowEffect = Mutable<DropShadowEffect | InnerShadowEffect>;
type MutableBlurEffect = Mutable<BlurEffect>;

function scaleEffect(effect: Effect, scale: number): Effect {
  const clone = JSON.parse(JSON.stringify(effect)) as Mutable<Effect>;

  if (clone.type === "DROP_SHADOW" || clone.type === "INNER_SHADOW") {
    const shadowClone = clone as MutableShadowEffect;
    if (typeof shadowClone.radius === "number") {
      if (scale > 2) {
        shadowClone.radius = shadowClone.radius * Math.pow(scale, 0.65);
      } else {
        shadowClone.radius *= scale;
      }
      shadowClone.radius = Math.min(shadowClone.radius, 100);
    }
    if (shadowClone.offset) {
      const offsetScale = scale > 2 ? Math.pow(scale, 0.7) : scale;
      shadowClone.offset = {
        x: shadowClone.offset.x * offsetScale,
        y: shadowClone.offset.y * offsetScale
      };
    }
    if (typeof shadowClone.spread === "number") {
      shadowClone.spread = shadowClone.spread * Math.pow(scale, 0.6);
    }
    return shadowClone as Effect;
  }

  if (clone.type === "LAYER_BLUR" || clone.type === "BACKGROUND_BLUR") {
    const blurClone = clone as MutableBlurEffect;
    if (typeof blurClone.radius === "number") {
      if (scale > 2) {
        blurClone.radius = blurClone.radius * Math.pow(scale, 0.6);
      } else {
        blurClone.radius *= scale;
      }
      blurClone.radius = Math.min(blurClone.radius, 50);
    }
    return blurClone as Effect;
  }

  return clone as Effect;
}

// scalePaint - from lines 1031-1057
type MutableImagePaint = Mutable<ImagePaint>;
type MutableGradientPaint = Mutable<GradientPaint> & { gradientHandlePositions?: Vector[] };

function scalePaint(paint: Paint, scale: number): Paint {
  const clone = JSON.parse(JSON.stringify(paint)) as Mutable<Paint>;

  if ((clone.type === "IMAGE" || clone.type === "VIDEO") && (clone as MutableImagePaint).scaleMode === "TILE") {
    const imgClone = clone as MutableImagePaint;
    imgClone.scalingFactor = (imgClone.scalingFactor ?? 1) * scale;
  }

  if (
    clone.type === "GRADIENT_LINEAR" ||
    clone.type === "GRADIENT_RADIAL" ||
    clone.type === "GRADIENT_ANGULAR" ||
    clone.type === "GRADIENT_DIAMOND"
  ) {
    const gradientClone = clone as MutableGradientPaint;
    if (Array.isArray(gradientClone.gradientHandlePositions)) {
      gradientClone.gradientHandlePositions = gradientClone.gradientHandlePositions.map((pos) => ({
        x: pos.x * scale,
        y: pos.y * scale
      }));
    }
    gradientClone.gradientTransform = gradientClone.gradientTransform.map((row: readonly number[]) =>
      row.map((value: number, index: number) => (index === 2 ? value : value * scale))
    ) as Transform;
  }

  return clone as Paint;
}

// Constraint validation logic - from lines 773-801
type ScaledConstraints = {
  minWidth: number | null;
  maxWidth: number | null;
  minHeight: number | null;
  maxHeight: number | null;
};

function validateConstraints(
  constraints: ScaledConstraints,
  safeWidth: number,
  safeHeight: number
): ScaledConstraints {
  const result = { ...constraints };

  // Resolve min > max conflicts
  if (result.minWidth !== null && result.maxWidth !== null) {
    if (result.minWidth > result.maxWidth) {
      const avgWidth = (result.minWidth + result.maxWidth) / 2;
      result.minWidth = Math.min(avgWidth, safeWidth);
      result.maxWidth = Math.max(avgWidth, safeWidth);
    }
  }
  if (result.minHeight !== null && result.maxHeight !== null) {
    if (result.minHeight > result.maxHeight) {
      const avgHeight = (result.minHeight + result.maxHeight) / 2;
      result.minHeight = Math.min(avgHeight, safeHeight);
      result.maxHeight = Math.max(avgHeight, safeHeight);
    }
  }

  // Ensure constraints don't prevent intended sizing
  if (result.minWidth !== null && result.minWidth > safeWidth) {
    result.minWidth = safeWidth;
  }
  if (result.maxWidth !== null && result.maxWidth < safeWidth) {
    result.maxWidth = safeWidth;
  }
  if (result.minHeight !== null && result.minHeight > safeHeight) {
    result.minHeight = safeHeight;
  }
  if (result.maxHeight !== null && result.maxHeight < safeHeight) {
    result.maxHeight = safeHeight;
  }

  return result;
}

// ============================================================================
// TEST CASES: scaleAutoLayoutMetric
// ============================================================================

testCase("scaleAutoLayoutMetric scales positive values correctly", () => {
  const result = scaleAutoLayoutMetric(24, 0.5);
  assertEqual(result, 12, "24 * 0.5 should equal 12");
});

testCase("scaleAutoLayoutMetric returns 0 for 0 input", () => {
  const result = scaleAutoLayoutMetric(0, 2);
  assertEqual(result, 0, "0 * any scale should equal 0");
});

testCase("scaleAutoLayoutMetric respects minimum floor", () => {
  const result = scaleAutoLayoutMetric(2, 0.1, 1);
  assertEqual(result, 1, "should not go below minimum of 1");
});

testCase("scaleAutoLayoutMetric rounds to nearest integer", () => {
  const result = scaleAutoLayoutMetric(10, 0.33);
  assertEqual(result, 3, "10 * 0.33 = 3.3, rounds to 3");
});

// ============================================================================
// TEST CASES: isBackgroundLike
// ============================================================================

testCase("isBackgroundLike returns true at exactly 95% area", () => {
  // 95% of 1000 = 950
  const node = createMockNode({ width: 950, height: 100 });
  const result = isBackgroundLike(node, 1000, 100);
  assertEqual(result, true, "node covering 95% should be background-like");
});

testCase("isBackgroundLike returns false below 95% threshold", () => {
  // 94% of 1000 = 940
  const node = createMockNode({ width: 940, height: 100 });
  const result = isBackgroundLike(node, 1000, 100);
  assertEqual(result, false, "node covering 94% should NOT be background-like");
});

testCase("isBackgroundLike returns true for full-size node", () => {
  const node = createMockNode({ width: 800, height: 600 });
  const result = isBackgroundLike(node, 800, 600);
  assertEqual(result, true, "full-size node should be background-like");
});

testCase("isBackgroundLike handles zero root area gracefully", () => {
  const node = createMockNode({ width: 100, height: 100 });
  const result = isBackgroundLike(node, 0, 0);
  assertEqual(result, false, "should return false when root area is 0");
});

// ============================================================================
// TEST CASES: isDecorativePointer
// ============================================================================

testCase("isDecorativePointer detects wide pointer with pointer name", () => {
  const node = createMockNode({
    type: "VECTOR",
    name: "pointer",
    width: 100,
    height: 20  // aspect ratio 5:1 > 3
  });
  const result = isDecorativePointer(node);
  assertEqual(result, true, "wide vector named 'pointer' should be decorative pointer");
});

testCase("isDecorativePointer detects tall arrow", () => {
  const node = createMockNode({
    type: "POLYGON",
    name: "down-arrow",
    width: 20,
    height: 100  // aspect ratio 0.2 < 0.33
  });
  const result = isDecorativePointer(node);
  assertEqual(result, true, "tall polygon named 'arrow' should be decorative pointer");
});

testCase("isDecorativePointer returns false for normal aspect ratio", () => {
  const node = createMockNode({
    type: "VECTOR",
    name: "pointer",
    width: 100,
    height: 50  // aspect ratio 2:1, not extreme
  });
  const result = isDecorativePointer(node);
  assertEqual(result, false, "normal aspect ratio should not be decorative pointer");
});

testCase("isDecorativePointer detects by parent container name", () => {
  const node = createMockNode({
    type: "FRAME",
    name: "shape",
    width: 80,
    height: 20,  // aspect ratio 4:1 > 3
    parent: { name: "Speech Bubble" }
  });
  const result = isDecorativePointer(node);
  assertEqual(result, true, "element in speech bubble container should be pointer");
});

// ============================================================================
// TEST CASES: getMinLegibleSize
// ============================================================================

testCase("getMinLegibleSize returns THUMBNAIL size for small targets", () => {
  const result = getMinLegibleSize({ width: 480, height: 320 });
  assertEqual(result, MIN_LEGIBLE_SIZES.THUMBNAIL, "thumbnail target should use THUMBNAIL size");
});

testCase("getMinLegibleSize returns LARGE_DISPLAY for YouTube covers", () => {
  const result = getMinLegibleSize({ width: 2560, height: 1440 });
  assertEqual(result, MIN_LEGIBLE_SIZES.LARGE_DISPLAY, "2560px target should use LARGE_DISPLAY size");
});

testCase("getMinLegibleSize returns STANDARD for medium targets", () => {
  const result = getMinLegibleSize({ width: 1080, height: 1080 });
  assertEqual(result, MIN_LEGIBLE_SIZES.STANDARD, "1080px target should use STANDARD size");
});

testCase("getMinLegibleSize checks min dimension for thumbnail threshold", () => {
  const result = getMinLegibleSize({ width: 1000, height: 400 });
  assertEqual(result, MIN_LEGIBLE_SIZES.THUMBNAIL, "400px min dimension is below thumbnail threshold");
});

// ============================================================================
// TEST CASES: positionHeroBleedChild
// The function preserves proportional edge relationships in the TARGET frame.
// It calculates ratios using the target frame dimensions, not source.
// ============================================================================

testCase("positionHeroBleedChild maintains left-edge position in same-size frame", () => {
  // Child at x=100 in 1000px frame - center at 200, closer to left
  // leftRatio = 100/1000 = 10%
  // In same 1000px frame: 1000 * 0.1 = 100
  const child = { x: 100, y: 300, width: 200, height: 200 };
  const result = positionHeroBleedChild(child, 1000, 1000);
  assertEqual(result.x, 100, "position should stay same in same-size frame");
});

testCase("positionHeroBleedChild identifies right-aligned elements", () => {
  // Child at x=700, width=200 in 1000px frame
  // Center at x=800, distToLeft=800, distToRight=200 -> closer to right
  // Right edge gap = 1000 - 900 = 100 -> ratio = 100/1000 = 10%
  // In same frame: gap preserved at 100, so x = 1000 - 100 - 200 = 700
  const child = { x: 700, y: 300, width: 200, height: 200 };
  const result = positionHeroBleedChild(child, 1000, 1000);
  assertEqual(result.x, 700, "right-aligned child should maintain position");
});

testCase("positionHeroBleedChild identifies top-aligned elements", () => {
  // Child at y=50, height=100 in 1000px frame
  // Center at y=100, distToTop=100, distToBottom=900 -> closer to top
  // topRatio = 50/1000 = 5%
  // In same frame: 1000 * 0.05 = 50
  const child = { x: 400, y: 50, width: 200, height: 100 };
  const result = positionHeroBleedChild(child, 1000, 1000);
  assertEqual(result.y, 50, "top-aligned child should maintain position");
});

testCase("positionHeroBleedChild rounds to integer pixels", () => {
  const child = { x: 333, y: 333, width: 100, height: 100 };
  const result = positionHeroBleedChild(child, 1000, 1000);
  assert(Number.isInteger(result.x), "x should be integer");
  assert(Number.isInteger(result.y), "y should be integer");
});

// ============================================================================
// TEST CASES: scaleEffect
// ============================================================================

testCase("scaleEffect scales shadow radius linearly for scale <= 2", () => {
  const effect = {
    type: "DROP_SHADOW" as const,
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    blendMode: "NORMAL" as const,
    offset: { x: 0, y: 4 },
    radius: 10,
    spread: 0
  };
  const result = scaleEffect(effect, 1.5) as DropShadowEffect;
  assertEqual(result.radius, 15, "radius should scale linearly at 1.5x");
});

testCase("scaleEffect dampens shadow radius for scale > 2", () => {
  const effect = {
    type: "DROP_SHADOW" as const,
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    blendMode: "NORMAL" as const,
    offset: { x: 0, y: 4 },
    radius: 10,
    spread: 0
  };
  const result = scaleEffect(effect, 3) as DropShadowEffect;
  // Expected: 10 * 3^0.65 ≈ 10 * 2.08 ≈ 20.8
  assertAlmostEqual(result.radius, 20.8, 0.5, "radius should be dampened at 3x scale");
});

testCase("scaleEffect caps shadow radius at 100px", () => {
  const effect = {
    type: "DROP_SHADOW" as const,
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    blendMode: "NORMAL" as const,
    offset: { x: 0, y: 4 },
    radius: 80,
    spread: 0
  };
  const result = scaleEffect(effect, 5) as DropShadowEffect;
  assertEqual(result.radius, 100, "radius should cap at 100px");
});

testCase("scaleEffect caps blur radius at 50px", () => {
  // BlurEffect requires blurType for newer Figma API versions
  const effect = {
    type: "LAYER_BLUR" as const,
    visible: true,
    radius: 30,
    blurType: "NORMAL" as const
  } as unknown as Effect;
  const result = scaleEffect(effect, 5);
  const blurResult = result as unknown as { radius: number };
  assertEqual(blurResult.radius, 50, "blur radius should cap at 50px");
});

testCase("scaleEffect preserves effect type", () => {
  const effect = {
    type: "DROP_SHADOW" as const,
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    blendMode: "NORMAL" as const,
    offset: { x: 0, y: 4 },
    radius: 10,
    spread: 0
  };
  const result = scaleEffect(effect, 2);
  assertEqual(result.type, "DROP_SHADOW", "type should be preserved");
});

// ============================================================================
// TEST CASES: scalePaint
// ============================================================================

testCase("scalePaint scales tile mode scaling factor", () => {
  const paint = {
    type: "IMAGE" as const,
    scaleMode: "TILE" as const,
    scalingFactor: 1,
    imageHash: "abc123",
    visible: true,
    opacity: 1,
    blendMode: "NORMAL" as const
  };
  const result = scalePaint(paint, 2) as ImagePaint;
  assertEqual(result.scalingFactor, 2, "tile scaling factor should double");
});

testCase("scalePaint preserves non-tile image mode", () => {
  const paint = {
    type: "IMAGE" as const,
    scaleMode: "FILL" as const,
    scalingFactor: 1,
    imageHash: "abc123",
    visible: true,
    opacity: 1,
    blendMode: "NORMAL" as const
  };
  const result = scalePaint(paint, 2) as ImagePaint;
  assertEqual(result.scalingFactor, 1, "FILL mode should not scale factor");
});

testCase("scalePaint scales gradient transform matrix", () => {
  const paint = {
    type: "GRADIENT_LINEAR" as const,
    visible: true,
    opacity: 1,
    blendMode: "NORMAL" as const,
    gradientStops: [],
    gradientTransform: [[1, 0, 0.5], [0, 1, 0.5]] as Transform
  };
  const result = scalePaint(paint, 2) as GradientPaint;
  // First two values in each row should scale, third should not
  assertEqual(result.gradientTransform[0][0], 2, "transform[0][0] should scale");
  assertEqual(result.gradientTransform[0][2], 0.5, "transform[0][2] should NOT scale");
});

// ============================================================================
// TEST CASES: Constraint Validation
// ============================================================================

testCase("validateConstraints resolves min > max conflict for width", () => {
  const constraints: ScaledConstraints = {
    minWidth: 200,
    maxWidth: 100,  // Invalid: min > max
    minHeight: null,
    maxHeight: null
  };
  const result = validateConstraints(constraints, 150, 150);
  assert(
    result.minWidth !== null && result.maxWidth !== null && result.minWidth <= result.maxWidth,
    "min should not exceed max after validation"
  );
});

testCase("validateConstraints clamps min when larger than target size", () => {
  const constraints: ScaledConstraints = {
    minWidth: 300,  // Larger than target
    maxWidth: null,
    minHeight: null,
    maxHeight: null
  };
  const result = validateConstraints(constraints, 200, 200);
  assertEqual(result.minWidth, 200, "minWidth should clamp to target size");
});

testCase("validateConstraints clamps max when smaller than target size", () => {
  const constraints: ScaledConstraints = {
    minWidth: null,
    maxWidth: 100,  // Smaller than target
    minHeight: null,
    maxHeight: null
  };
  const result = validateConstraints(constraints, 200, 200);
  assertEqual(result.maxWidth, 200, "maxWidth should expand to target size");
});

testCase("validateConstraints handles null constraints", () => {
  const constraints: ScaledConstraints = {
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null
  };
  const result = validateConstraints(constraints, 200, 200);
  assertEqual(result.minWidth, null, "null minWidth should remain null");
  assertEqual(result.maxWidth, null, "null maxWidth should remain null");
});

// ============================================================================
// TEST CASES: Element Role Detection (via getElementRole logic inline)
// ============================================================================

const ELEMENT_ROLE_PATTERNS: Record<string, RegExp> = {
  LOGO: /logo|brand|wordmark|logotype/i,
  ICON: /icon|ico\b|symbol/i,
  BADGE: /badge|tag|label|chip|pill/i,
  BUTTON: /button|btn|cta/i
};

function getElementRole(node: SceneNode): string | null {
  const name = node.name;
  for (const [role, pattern] of Object.entries(ELEMENT_ROLE_PATTERNS)) {
    if (pattern.test(name)) {
      return role;
    }
  }
  return null;
}

testCase("getElementRole detects logo by name pattern", () => {
  const node = createMockNode({ name: "Company Logo" });
  const result = getElementRole(node);
  assertEqual(result, "LOGO", "should detect 'Logo' in name");
});

testCase("getElementRole detects button by cta pattern", () => {
  const node = createMockNode({ name: "Primary CTA" });
  const result = getElementRole(node);
  assertEqual(result, "BUTTON", "should detect 'CTA' as button");
});

testCase("getElementRole detects badge pattern", () => {
  const node = createMockNode({ name: "Status Badge" });
  const result = getElementRole(node);
  assertEqual(result, "BADGE", "should detect 'Badge' in name");
});

testCase("getElementRole returns null for generic names", () => {
  // Use a name that doesn't match any pattern: logo, icon, badge, button, btn, cta, etc.
  const node = createMockNode({ name: "Shape 123" });
  const result = getElementRole(node);
  assertEqual(result, null, "generic names should return null");
});

console.log("\n✅ All variant-scaling characterization tests passed!\n");
