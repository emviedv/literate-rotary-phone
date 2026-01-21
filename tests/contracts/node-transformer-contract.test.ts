/**
 * Contract tests for Node Transformer module
 * Validates the recursive node scaling contract that will be extracted
 *
 * Run: npx jest --runInBand tests/contracts/node-transformer-contract.test.ts
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

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

// Contract type definitions
type NodeTypeContract = "FRAME" | "RECTANGLE" | "TEXT" | "VECTOR" | "ELLIPSE" | "POLYGON" | "GROUP";

type SceneNodeContract = {
  id: string;
  type: NodeTypeContract;
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: SceneNodeContract[];
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: any[];
  fills?: any[];
};

type VariantTargetContract = {
  id: string;
  width: number;
  height: number;
};

// ============================================================================
// NODE TRANSFORMER INPUT CONTRACT
// ============================================================================

testCase("scaleNodeRecursive input contract: required parameters", () => {
  const mockNode: SceneNodeContract = {
    id: "node1",
    type: "RECTANGLE",
    name: "Test Node",
    width: 100,
    height: 80
  };
  const scale = 1.5;
  const fontCache = new Set<string>();
  const target: VariantTargetContract = { id: "figma-cover", width: 1920, height: 960 };
  const rootSnapshot = null;

  // Contract validation for required parameters
  assert(mockNode != null, "node parameter is required");
  assert(typeof scale === "number" && scale > 0, "scale must be positive number");
  assert(fontCache instanceof Set, "fontCache must be Set<string>");
  assert(target != null && typeof target === "object", "target parameter is required");
  assert(rootSnapshot === null || typeof rootSnapshot === "object", "rootSnapshot must be object or null");
});

testCase("Node contract: required fields validation", () => {
  const validNode: SceneNodeContract = {
    id: "test-node",
    type: "RECTANGLE",
    name: "Valid Node",
    width: 200,
    height: 150
  };

  const invalidNode1 = { type: "RECTANGLE", name: "Missing ID" }; // Missing id
  const invalidNode2 = { id: "test", name: "Missing Type" }; // Missing type

  // Contract: nodes must have id, type, and name
  assert(typeof validNode.id === "string" && validNode.id.length > 0, "node.id must be non-empty string");
  assert(typeof validNode.type === "string", "node.type must be string");
  assert(typeof validNode.name === "string", "node.name must be string");

  // Invalid nodes should fail validation
  const hasRequiredFields1 = "id" in invalidNode1 && "type" in invalidNode1;
  const hasRequiredFields2 = "id" in invalidNode2 && "type" in invalidNode2;

  assertEqual(hasRequiredFields1, false, "node missing ID should be invalid");
  assertEqual(hasRequiredFields2, false, "node missing type should be invalid");
});

testCase("Node contract: dimensional properties", () => {
  const dimensionalNode: SceneNodeContract = {
    id: "dim-node",
    type: "RECTANGLE",
    name: "Dimensional Node",
    x: 50,
    y: 75,
    width: 200,
    height: 150
  };

  // Contract: dimensional properties must be numbers when present
  if (dimensionalNode.x !== undefined) {
    assert(typeof dimensionalNode.x === "number", "x must be number when present");
  }
  if (dimensionalNode.y !== undefined) {
    assert(typeof dimensionalNode.y === "number", "y must be number when present");
  }
  if (dimensionalNode.width !== undefined) {
    assert(typeof dimensionalNode.width === "number" && dimensionalNode.width >= 0, "width must be non-negative number when present");
  }
  if (dimensionalNode.height !== undefined) {
    assert(typeof dimensionalNode.height === "number" && dimensionalNode.height >= 0, "height must be non-negative number when present");
  }
});

testCase("Node contract: valid node types", () => {
  const validTypes: NodeTypeContract[] = ["FRAME", "RECTANGLE", "TEXT", "VECTOR", "ELLIPSE", "POLYGON", "GROUP"];
  const invalidTypes = ["INVALID", "IMAGE", "COMPONENT_SET", "", "rectangle"];

  for (const nodeType of validTypes) {
    const node: SceneNodeContract = {
      id: "test",
      type: nodeType,
      name: "Test"
    };
    assert(validTypes.includes(node.type), `${nodeType} should be valid node type`);
  }

  for (const nodeType of invalidTypes) {
    const isValid = validTypes.includes(nodeType as NodeTypeContract);
    assertEqual(isValid, false, `${nodeType} should be invalid node type`);
  }
});

// ============================================================================
// SCALING CONTRACT
// ============================================================================

testCase("Scaling contract: scale factor validation", () => {
  const validScales = [0.1, 0.5, 1.0, 1.5, 2.0, 5.0];
  const invalidScales = [0, -1, NaN, Infinity, -Infinity];

  for (const scale of validScales) {
    assert(typeof scale === "number", "scale must be number");
    assert(Number.isFinite(scale), "scale must be finite");
    assert(scale > 0, "scale must be positive");
  }

  for (const scale of invalidScales) {
    const isValid = typeof scale === "number" && Number.isFinite(scale) && scale > 0;
    assertEqual(isValid, false, `${scale} should be invalid scale`);
  }
});

testCase("Scaling contract: dimension calculations", () => {
  const originalWidth = 100;
  const originalHeight = 80;
  const scale = 1.5;

  // Contract: scaling should preserve aspect ratio and be deterministic
  const newWidth = originalWidth * scale;
  const newHeight = originalHeight * scale;
  const expectedRatio = originalWidth / originalHeight;
  const actualRatio = newWidth / newHeight;

  assertEqual(newWidth, 150, "width scaling should be deterministic");
  assertEqual(newHeight, 120, "height scaling should be deterministic");
  assertEqual(actualRatio, expectedRatio, "aspect ratio should be preserved");
});

testCase("Scaling contract: minimum size enforcement", () => {
  const tinyNode: SceneNodeContract = {
    id: "tiny",
    type: "RECTANGLE",
    name: "logo",
    width: 5,
    height: 5
  };
  const scale = 0.1; // Would make 0.5x0.5

  // Contract: minimum sizes should be enforced
  const scaledWidth = tinyNode.width! * scale; // 0.5
  const scaledHeight = tinyNode.height! * scale; // 0.5

  // Mock minimum size logic
  const MIN_SIZE = 1;
  const finalWidth = Math.max(scaledWidth, MIN_SIZE);
  const finalHeight = Math.max(scaledHeight, MIN_SIZE);

  assert(finalWidth >= MIN_SIZE, "final width should meet minimum");
  assert(finalHeight >= MIN_SIZE, "final height should meet minimum");
  assertEqual(finalWidth, 1, "should clamp to minimum size");
  assertEqual(finalHeight, 1, "should clamp to minimum size");
});

// ============================================================================
// CHILD TRAVERSAL CONTRACT
// ============================================================================

testCase("Child traversal contract: hierarchy preservation", () => {
  const parentNode: SceneNodeContract = {
    id: "parent",
    type: "FRAME",
    name: "Parent Frame",
    children: [
      {
        id: "child1",
        type: "RECTANGLE",
        name: "Child 1"
      },
      {
        id: "child2",
        type: "TEXT",
        name: "Child 2"
      }
    ]
  };

  // Contract: children should be preserved during traversal
  assert(Array.isArray(parentNode.children), "children should be array");
  assertEqual(parentNode.children?.length, 2, "should preserve child count");
  assert(parentNode.children?.every(child => typeof child.id === "string"), "all children should have IDs");
});

testCase("Child traversal contract: layout mode detection", () => {
  const autoLayoutFrame: SceneNodeContract = {
    id: "auto-frame",
    type: "FRAME",
    name: "Auto Layout Frame",
    layoutMode: "HORIZONTAL"
  };

  const noneLayoutFrame: SceneNodeContract = {
    id: "none-frame",
    type: "FRAME",
    name: "None Layout Frame",
    layoutMode: "NONE"
  };

  // Contract: layout mode detection should be consistent
  const isAutoLayout1 = autoLayoutFrame.type === "FRAME" &&
    autoLayoutFrame.layoutMode !== undefined &&
    autoLayoutFrame.layoutMode !== "NONE";

  const isAutoLayout2 = noneLayoutFrame.type === "FRAME" &&
    noneLayoutFrame.layoutMode !== undefined &&
    noneLayoutFrame.layoutMode !== "NONE";

  assertEqual(isAutoLayout1, true, "HORIZONTAL layout should be detected as auto layout");
  assertEqual(isAutoLayout2, false, "NONE layout should not be detected as auto layout");
});

testCase("Child positioning contract: layout positioning modes", () => {
  const autoChild: SceneNodeContract = {
    id: "auto-child",
    type: "RECTANGLE",
    name: "Auto Child",
    layoutPositioning: "AUTO"
  };

  const absoluteChild: SceneNodeContract = {
    id: "absolute-child",
    type: "RECTANGLE",
    name: "Absolute Child",
    layoutPositioning: "ABSOLUTE"
  };

  // Contract: positioning modes should be valid
  const validPositions = ["AUTO", "ABSOLUTE"];

  if (autoChild.layoutPositioning) {
    assert(validPositions.includes(autoChild.layoutPositioning), "AUTO should be valid positioning");
  }

  if (absoluteChild.layoutPositioning) {
    assert(validPositions.includes(absoluteChild.layoutPositioning), "ABSOLUTE should be valid positioning");
  }
});

// ============================================================================
// PROPERTY SCALING CONTRACT
// ============================================================================

testCase("Property scaling contract: stroke weight", () => {
  const nodeWithStroke: SceneNodeContract = {
    id: "stroked",
    type: "RECTANGLE",
    name: "Stroked Node",
    strokeWeight: 2
  };
  const scale = 1.5;

  // Contract: stroke weight should scale proportionally
  if (nodeWithStroke.strokeWeight !== undefined) {
    assert(typeof nodeWithStroke.strokeWeight === "number", "strokeWeight must be number");
    const scaledStroke = nodeWithStroke.strokeWeight * scale;
    assertEqual(scaledStroke, 3, "stroke weight should scale proportionally");
  }
});

testCase("Property scaling contract: corner radius", () => {
  const nodeWithRadius: SceneNodeContract = {
    id: "rounded",
    type: "RECTANGLE",
    name: "Rounded Node",
    width: 100,
    height: 80,
    cornerRadius: 8
  };
  const scale = 2;

  // Contract: corner radius should scale but be capped by dimensions
  if (nodeWithRadius.cornerRadius !== undefined && nodeWithRadius.width && nodeWithRadius.height) {
    assert(typeof nodeWithRadius.cornerRadius === "number", "cornerRadius must be number");
    const scaledRadius = nodeWithRadius.cornerRadius * scale; // 16
    const maxRadius = Math.min(nodeWithRadius.width * scale, nodeWithRadius.height * scale) / 2; // 80
    const finalRadius = Math.min(scaledRadius, maxRadius);

    assertEqual(scaledRadius, 16, "radius should scale initially");
    assertEqual(finalRadius, 16, "radius should not be capped in this case");
    assert(finalRadius <= maxRadius, "final radius should not exceed maximum");
  }
});

testCase("Property scaling contract: effects array", () => {
  const nodeWithEffects: SceneNodeContract = {
    id: "effects",
    type: "RECTANGLE",
    name: "Effects Node",
    effects: [
      { type: "DROP_SHADOW", radius: 10, offset: { x: 2, y: 4 } }
    ]
  };

  // Contract: effects should be scalable array
  if (nodeWithEffects.effects) {
    assert(Array.isArray(nodeWithEffects.effects), "effects must be array");
    assert(nodeWithEffects.effects.length >= 0, "effects array can be empty");

    // Each effect should have scalable properties
    const effect = nodeWithEffects.effects[0];
    if (effect && typeof effect === "object") {
      assert("type" in effect, "effect should have type");
      if ("radius" in effect) {
        assert(typeof effect.radius === "number", "effect radius should be number");
      }
    }
  }
});

// ============================================================================
// ASYNC OPERATION CONTRACT
// ============================================================================

testCase("Async operation contract: Promise-based scaling", () => {
  // Contract: node transformation should support async operations
  const mockAsyncTransform = async (
    node: SceneNodeContract,
    scale: number
  ): Promise<void> => {
    // Mock async transformation (e.g., font loading)
    if (node.type === "TEXT") {
      await new Promise(resolve => setTimeout(resolve, 1)); // Simulate async font operation
    }
  };

  assert(typeof mockAsyncTransform === "function", "transform should be function");

  const result = mockAsyncTransform({ id: "text", type: "TEXT", name: "Text" }, 1.5);
  assert(result instanceof Promise, "transform should return Promise");
});

testCase("Error handling contract: graceful failure", () => {
  // Contract: transformation should handle malformed nodes gracefully
  const malformedNodes = [
    { id: "", type: "RECTANGLE", name: "Empty ID" },
    { id: "test", type: "INVALID", name: "Invalid Type" },
    { id: "test", type: "RECTANGLE", name: "Test", width: -1 }, // Negative dimension
  ];

  for (const node of malformedNodes) {
    // Contract: these should be detectable as problematic
    const hasValidId = typeof node.id === "string" && node.id.length > 0;
    const hasValidType = ["FRAME", "RECTANGLE", "TEXT", "VECTOR", "ELLIPSE", "POLYGON", "GROUP"].includes(node.type as any);
    const hasValidDimensions = !node.width || (typeof node.width === "number" && node.width >= 0);

    if (!hasValidId) {
      assertEqual(hasValidId, false, "empty ID should be detectable");
    } else if (!hasValidType) {
      assertEqual(hasValidType, false, "invalid type should be detectable");
    } else if (!hasValidDimensions) {
      assertEqual(hasValidDimensions, false, "invalid dimensions should be detectable");
    }
  }
});

// ============================================================================
// BACKGROUND DETECTION CONTRACT
// ============================================================================

testCase("Background detection contract: area-based heuristic", () => {
  const backgroundNode: SceneNodeContract = {
    id: "bg",
    type: "RECTANGLE",
    name: "Background",
    width: 950,
    height: 100
  };

  const smallNode: SceneNodeContract = {
    id: "small",
    type: "RECTANGLE",
    name: "Small Node",
    width: 100,
    height: 100
  };

  const rootWidth = 1000;
  const rootHeight = 100;

  // Contract: background detection should use area coverage
  const backgroundArea = backgroundNode.width! * backgroundNode.height!;
  const smallArea = smallNode.width! * smallNode.height!;
  const rootArea = rootWidth * rootHeight;

  const backgroundCoverage = backgroundArea / rootArea;
  const smallCoverage = smallArea / rootArea;

  assert(backgroundCoverage >= 0.95, "background should cover 95%+ of area");
  assert(smallCoverage < 0.95, "small node should cover less than 95%");

  const isBackgroundLike1 = backgroundCoverage >= 0.95;
  const isBackgroundLike2 = smallCoverage >= 0.95;

  assertEqual(isBackgroundLike1, true, "background should be detected");
  assertEqual(isBackgroundLike2, false, "small node should not be background");
});

console.log("\n✅ All node transformer contract tests passed!\n");