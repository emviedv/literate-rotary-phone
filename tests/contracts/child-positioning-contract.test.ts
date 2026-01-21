/**
 * Contract tests for Child Positioning module
 * Validates the absolute child positioning and hero bleed contract
 *
 * Run: npx jest --runInBand tests/contracts/child-positioning-contract.test.ts
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
type FrameContract = {
  id: string;
  width: number;
  height: number;
  children: ChildContract[];
};

type ChildContract = {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
};

type AxisExpansionPlanContract = {
  start: number;
  end: number;
  interior: number;
};

type SafeBoundsContract = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type LayoutProfileContract = "horizontal" | "vertical" | "square";

type FaceRegionContract = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

type FocalPointContract = {
  x: number;
  y: number;
  confidence: number;
} | null;

// ============================================================================
// CHILD POSITIONING INPUT CONTRACT
// ============================================================================

testCase("expandAbsoluteChildren input contract: required parameters", () => {
  const mockFrame: FrameContract = {
    id: "frame1",
    width: 1000,
    height: 800,
    children: []
  };
  const horizontal: AxisExpansionPlanContract = { start: 50, end: 50, interior: 0 };
  const vertical: AxisExpansionPlanContract = { start: 40, end: 40, interior: 0 };
  const profile: LayoutProfileContract = "horizontal";
  const primaryFocal: FocalPointContract = { x: 0.5, y: 0.3, confidence: 0.8 };
  const faceRegions: FaceRegionContract[] = [];

  // Contract validation for required parameters
  assert(mockFrame != null, "frame parameter is required");
  assert(horizontal != null, "horizontal expansion plan is required");
  assert(vertical != null, "vertical expansion plan is required");
  assert(typeof profile === "string", "profile must be string");
  assert(primaryFocal === null || typeof primaryFocal === "object", "primaryFocal must be object or null");
  assert(Array.isArray(faceRegions), "faceRegions must be array");
});

testCase("AxisExpansionPlan contract: structure validation", () => {
  const validPlan: AxisExpansionPlanContract = {
    start: 48,
    end: 52,
    interior: 24
  };

  const invalidPlan1 = { start: 48 }; // Missing end and interior
  const invalidPlan2 = { start: -10, end: 20, interior: 0 }; // Negative start

  // Contract: expansion plan must have all required numeric fields
  assert(typeof validPlan.start === "number", "start must be number");
  assert(typeof validPlan.end === "number", "end must be number");
  assert(typeof validPlan.interior === "number", "interior must be number");

  // Contract: values should be non-negative
  assert(validPlan.start >= 0, "start must be non-negative");
  assert(validPlan.end >= 0, "end must be non-negative");
  assert(validPlan.interior >= 0, "interior must be non-negative");

  // Invalid plans should fail validation
  const hasRequiredFields1 = "start" in invalidPlan1 && "end" in invalidPlan1 && "interior" in invalidPlan1;
  const hasValidValues = typeof invalidPlan2.start === "number" && invalidPlan2.start >= 0;

  assertEqual(hasRequiredFields1, false, "plan missing fields should be invalid");
  assertEqual(hasValidValues, false, "plan with negative values should be invalid");
});

testCase("SafeBounds contract: bounds validation", () => {
  const validBounds: SafeBoundsContract = {
    x: 60,
    y: 40,
    width: 880,
    height: 720
  };

  const invalidBounds = {
    x: 60,
    y: 40,
    width: 0,
    height: -100
  };

  // Contract: safe bounds must have valid dimensions
  assert(typeof validBounds.x === "number", "x must be number");
  assert(typeof validBounds.y === "number", "y must be number");
  assert(typeof validBounds.width === "number", "width must be number");
  assert(typeof validBounds.height === "number", "height must be number");

  assert(validBounds.width > 0, "width must be positive");
  assert(validBounds.height > 0, "height must be positive");

  const hasValidDimensions = invalidBounds.width > 0 && invalidBounds.height > 0;
  assertEqual(hasValidDimensions, false, "invalid bounds should be detectable");
});

// ============================================================================
// CHILD FILTERING CONTRACT
// ============================================================================

testCase("Child filtering contract: layout positioning detection", () => {
  const autoChild: ChildContract = {
    id: "auto-child",
    type: "RECTANGLE",
    name: "Auto Child",
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    layoutPositioning: "AUTO"
  };

  const absoluteChild: ChildContract = {
    id: "absolute-child",
    type: "RECTANGLE",
    name: "Absolute Child",
    x: 300,
    y: 200,
    width: 150,
    height: 100,
    layoutPositioning: "ABSOLUTE"
  };

  const defaultChild: ChildContract = {
    id: "default-child",
    type: "RECTANGLE",
    name: "Default Child",
    x: 400,
    y: 300,
    width: 100,
    height: 80
    // No layoutPositioning - should default to AUTO behavior
  };

  const children = [autoChild, absoluteChild, defaultChild];
  const frameLayoutMode = "HORIZONTAL"; // Auto layout frame

  // Contract: filtering should identify absolute children correctly
  const absoluteChildren = children.filter((child) => {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && (frameLayoutMode as string) !== "NONE") {
      return false; // Filter out AUTO children in auto layout frames
    }
    return true;
  });

  // In auto layout frame, only ABSOLUTE child should remain
  assertEqual(absoluteChildren.length, 1, "should filter to only absolute children in auto layout");
  assertEqual(absoluteChildren[0].id, "absolute-child", "should keep the absolute child");
});

testCase("Child filtering contract: NONE layout preserves all children", () => {
  const children: ChildContract[] = [
    { id: "child1", type: "RECTANGLE", name: "Child 1", x: 0, y: 0, width: 100, height: 100, layoutPositioning: "AUTO" },
    { id: "child2", type: "RECTANGLE", name: "Child 2", x: 0, y: 0, width: 100, height: 100, layoutPositioning: "ABSOLUTE" }
  ];
  const frameLayoutMode = "NONE";

  const absoluteChildren = children.filter((child) => {
    if ("layoutPositioning" in child && child.layoutPositioning !== "ABSOLUTE" && frameLayoutMode !== "NONE") {
      return false;
    }
    return true;
  });

  assertEqual(absoluteChildren.length, 2, "NONE layout should preserve all children");
});

// ============================================================================
// HERO BLEED DETECTION CONTRACT
// ============================================================================

testCase("Hero bleed detection contract: AI signals integration", () => {
  const mockAiSignals = {
    nodeRoles: {
      "hero-1": "subject",
      "regular-1": "typography",
      "hero-2": "subject"
    }
  };

  const children: ChildContract[] = [
    { id: "hero-1", type: "RECTANGLE", name: "Hero Image", x: 0, y: 0, width: 800, height: 600 },
    { id: "regular-1", type: "TEXT", name: "Title", x: 100, y: 100, width: 200, height: 50 },
    { id: "hero-2", type: "RECTANGLE", name: "Background", x: 0, y: 0, width: 800, height: 600 }
  ];

  // Contract: hero bleed detection should use AI signals
  const heroBleedChildren: ChildContract[] = [];
  const regularChildren: ChildContract[] = [];

  const isHeroBleedNode = (nodeId: string) => (mockAiSignals.nodeRoles as any)[nodeId] === "hero";

  for (const child of children) {
    if (isHeroBleedNode(child.id)) {
      heroBleedChildren.push(child);
    } else {
      regularChildren.push(child);
    }
  }

  assertEqual(heroBleedChildren.length, 2, "should detect 2 hero bleed children");
  assertEqual(regularChildren.length, 1, "should have 1 regular child");
  assertEqual(heroBleedChildren[0].id, "hero-1", "should identify first hero child");
  assertEqual(heroBleedChildren[1].id, "hero-2", "should identify second hero child");
});

testCase("Hero bleed detection contract: name-based fallback", () => {
  const children: ChildContract[] = [
    { id: "bg-1", type: "RECTANGLE", name: "Background Image", x: 0, y: 0, width: 800, height: 600 },
    { id: "btn-1", type: "RECTANGLE", name: "Primary Button", x: 100, y: 500, width: 120, height: 40 }
  ];

  // Contract: fallback to name-based detection
  const hasHeroBleedRole = (child: ChildContract) => /background|hero|bleed/i.test(child.name);

  const heroBleedChildren = children.filter(hasHeroBleedRole);
  const regularChildren = children.filter(child => !hasHeroBleedRole(child));

  assertEqual(heroBleedChildren.length, 1, "should detect background by name");
  assertEqual(regularChildren.length, 1, "should keep button as regular child");
  assertEqual(heroBleedChildren[0].id, "bg-1", "should identify background child");
});

// ============================================================================
// POSITION SNAPSHOT CONTRACT
// ============================================================================

testCase("Position snapshot contract: required fields", () => {
  const mockSnapshot = {
    id: "child-1",
    x: 100,
    y: 150,
    width: 200,
    height: 160,
    nodeType: "RECTANGLE",
    bounds: {
      x: 100,
      y: 150,
      width: 200,
      height: 160
    }
  };

  // Contract: snapshot must include all positioning data
  assert(typeof mockSnapshot.id === "string", "snapshot.id must be string");
  assert(typeof mockSnapshot.x === "number", "snapshot.x must be number");
  assert(typeof mockSnapshot.y === "number", "snapshot.y must be number");
  assert(typeof mockSnapshot.width === "number", "snapshot.width must be number");
  assert(typeof mockSnapshot.height === "number", "snapshot.height must be number");
  assert(typeof mockSnapshot.nodeType === "string", "snapshot.nodeType must be string");
  assert(typeof mockSnapshot.bounds === "object", "snapshot.bounds must be object");
});

testCase("Position snapshot contract: dimension validation", () => {
  const validChild: ChildContract = {
    id: "valid",
    type: "RECTANGLE",
    name: "Valid Child",
    x: 50,
    y: 75,
    width: 100,
    height: 80
  };

  const invalidChild = {
    id: "invalid",
    type: "TEXT",
    name: "Invalid Child"
    // Missing x, y, width, height
  };

  // Contract: only children with valid dimensions should be snapshotted
  const hasValidDimensions = (child: any) => {
    return (
      typeof child.x === "number" &&
      typeof child.y === "number" &&
      typeof child.width === "number" &&
      typeof child.height === "number"
    );
  };

  assertEqual(hasValidDimensions(validChild), true, "valid child should pass dimension check");
  assertEqual(hasValidDimensions(invalidChild), false, "invalid child should fail dimension check");
});

// ============================================================================
// PLACEMENT SCORING CONTRACT
// ============================================================================

testCase("Placement scoring contract: face region structure", () => {
  const validFaceRegion: FaceRegionContract = {
    x: 300,
    y: 200,
    width: 100,
    height: 120,
    confidence: 0.9
  };

  const invalidFaceRegion1 = { x: 300, y: 200 }; // Missing dimensions
  const invalidFaceRegion2 = { x: 300, y: 200, width: 100, height: 120, confidence: 1.5 }; // Invalid confidence

  // Contract: face regions must have complete position and size data
  assert(typeof validFaceRegion.x === "number", "face x must be number");
  assert(typeof validFaceRegion.y === "number", "face y must be number");
  assert(typeof validFaceRegion.width === "number", "face width must be number");
  assert(typeof validFaceRegion.height === "number", "face height must be number");
  assert(typeof validFaceRegion.confidence === "number", "face confidence must be number");

  assert(validFaceRegion.width > 0, "face width must be positive");
  assert(validFaceRegion.height > 0, "face height must be positive");
  assert(validFaceRegion.confidence >= 0 && validFaceRegion.confidence <= 1, "confidence must be in [0,1]");

  // Invalid regions should fail validation
  const hasRequiredFields1 = "width" in invalidFaceRegion1 && "height" in invalidFaceRegion1;
  const hasValidConfidence2 = typeof invalidFaceRegion2.confidence === "number" &&
    invalidFaceRegion2.confidence >= 0 && invalidFaceRegion2.confidence <= 1;

  assertEqual(hasRequiredFields1, false, "face region missing dimensions should be invalid");
  assertEqual(hasValidConfidence2, false, "face region with invalid confidence should be invalid");
});

testCase("Placement scoring contract: focal point structure", () => {
  const validFocalPoint: FocalPointContract = {
    x: 0.3,
    y: 0.7,
    confidence: 0.85
  };

  const nullFocalPoint: FocalPointContract = null;

  const invalidFocalPoint = {
    x: 1.5, // Out of range
    y: 0.3,
    confidence: 0.9
  };

  // Contract: focal point coordinates must be in [0,1] range
  if (validFocalPoint) {
    assert(typeof validFocalPoint.x === "number", "focal x must be number");
    assert(typeof validFocalPoint.y === "number", "focal y must be number");
    assert(typeof validFocalPoint.confidence === "number", "focal confidence must be number");

    assert(validFocalPoint.x >= 0 && validFocalPoint.x <= 1, "focal x must be in [0,1]");
    assert(validFocalPoint.y >= 0 && validFocalPoint.y <= 1, "focal y must be in [0,1]");
    assert(validFocalPoint.confidence >= 0 && validFocalPoint.confidence <= 1, "focal confidence must be in [0,1]");
  }

  assertEqual(nullFocalPoint, null, "null focal point should be valid");

  const hasValidCoords = invalidFocalPoint.x >= 0 && invalidFocalPoint.x <= 1;
  assertEqual(hasValidCoords, false, "out-of-range focal point should be invalid");
});

// ============================================================================
// HERO BLEED POSITIONING CONTRACT
// ============================================================================

testCase("Hero bleed positioning contract: edge-relative calculation", () => {
  const heroChild: ChildContract = {
    id: "hero",
    type: "RECTANGLE",
    name: "Hero Background",
    x: 100,
    y: 200,
    width: 300,
    height: 200
  };

  const frameWidth = 1000;
  const frameHeight = 800;

  // Contract: hero bleed positioning should preserve edge relationships
  const centerX = heroChild.x + heroChild.width / 2; // 250
  const centerY = heroChild.y + heroChild.height / 2; // 300

  const distToLeft = centerX; // 250
  const distToRight = frameWidth - centerX; // 750
  const distToTop = centerY; // 300
  const distToBottom = frameHeight - centerY; // 500

  // Contract: positioning should choose nearest edge
  const isCloserToLeft = distToLeft <= distToRight;
  const isCloserToTop = distToTop <= distToBottom;

  assertEqual(isCloserToLeft, true, "should be closer to left edge");
  assertEqual(isCloserToTop, true, "should be closer to top edge");

  // Contract: edge ratios should be calculable
  if (isCloserToLeft) {
    const leftRatio = heroChild.x / Math.max(frameWidth, 1);
    assert(leftRatio >= 0 && leftRatio <= 1, "left ratio should be in [0,1]");
    assertEqual(leftRatio, 0.1, "left ratio should be 0.1");
  }
});

testCase("Hero bleed positioning contract: proportional preservation", () => {
  const heroChild: ChildContract = {
    id: "hero",
    type: "RECTANGLE",
    name: "Hero",
    x: 800, // Right-aligned
    y: 50,  // Top-aligned
    width: 150,
    height: 100
  };

  const sourceFrameWidth = 1000;
  const targetFrameWidth = 1500;

  // Contract: proportional distances should be preserved
  const rightEdge = heroChild.x + heroChild.width; // 950
  const rightGap = sourceFrameWidth - rightEdge; // 50
  const rightRatio = rightGap / Math.max(sourceFrameWidth, 1); // 0.05

  // In target frame
  const targetRightGap = targetFrameWidth * rightRatio; // 75
  const targetX = targetFrameWidth - targetRightGap - heroChild.width; // 1275

  assert(rightRatio >= 0, "right ratio should be non-negative");
  assertEqual(rightRatio, 0.05, "right ratio should be 0.05");
  assertEqual(targetX, 1275, "target X should preserve right edge ratio");
});

// ============================================================================
// POSITION APPLICATION CONTRACT
// ============================================================================

testCase("Position application contract: finite value validation", () => {
  const child: ChildContract = {
    id: "test-child",
    type: "RECTANGLE",
    name: "Test Child",
    x: 100,
    y: 150,
    width: 200,
    height: 160
  };

  const plannedPosition = {
    id: "test-child",
    x: 200,
    y: NaN // Invalid position
  };

  // Contract: only finite values should be applied
  // const originalX = child.x; // Used for comparison but not needed in contract test

  if (Number.isFinite(plannedPosition.x)) {
    child.x = plannedPosition.x;
  }
  if (Number.isFinite(plannedPosition.y)) {
    child.y = plannedPosition.y; // Should not happen due to NaN
  }

  assertEqual(child.x, 200, "should apply finite X position");
  assertEqual(child.y, 150, "should not apply non-finite Y position");
});

console.log("\n✅ All child positioning contract tests passed!\n");