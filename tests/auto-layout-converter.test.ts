import {
  calculateChildArrangement,
  inferOptimalSpacing,
  classifyChildPosition,
  analyzeFrameForAutoLayoutConversion,
  shouldConvertToAutoLayout,
  type ChildBounds,
  type AutoLayoutConversionCandidate
} from "../core/auto-layout-converter.js";

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

function makeChildBounds(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  nodeType: string = "FRAME",
  name: string = "Child"
): ChildBounds {
  return { id, x, y, width, height, nodeType, name };
}

// ============================================================================
// calculateChildArrangement Tests
// ============================================================================

testCase("detects horizontal child arrangement", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 0, 50, 100, 100),
    makeChildBounds("2", 120, 50, 100, 100),
    makeChildBounds("3", 240, 50, 100, 100)
  ];
  const arrangement = calculateChildArrangement(children);
  assertEqual(arrangement, "horizontal", "Children with same Y and spaced X should be horizontal.");
});

testCase("detects vertical child arrangement", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 50, 0, 100, 80),
    makeChildBounds("2", 50, 100, 100, 80),
    makeChildBounds("3", 50, 200, 100, 80)
  ];
  const arrangement = calculateChildArrangement(children);
  assertEqual(arrangement, "vertical", "Children with same X and spaced Y should be vertical.");
});

testCase("returns chaotic for single child", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 50, 50, 100, 100)
  ];
  const arrangement = calculateChildArrangement(children);
  assertEqual(arrangement, "chaotic", "Single child should be chaotic (can't determine arrangement).");
});

testCase("returns chaotic for truly scattered children", () => {
  // Create children that are genuinely scattered with no clear pattern
  const children: ChildBounds[] = [
    makeChildBounds("1", 10, 10, 50, 50),
    makeChildBounds("2", 200, 150, 50, 50),
    makeChildBounds("3", 50, 280, 50, 50)
  ];
  const arrangement = calculateChildArrangement(children);
  assertEqual(arrangement, "chaotic", "Truly scattered children should be chaotic.");
});

testCase("picks vertical when vertical score dominates", () => {
  // Vertical alignment: similar X, different Y - this should win
  const children: ChildBounds[] = [
    makeChildBounds("1", 100, 0, 100, 80),
    makeChildBounds("2", 110, 100, 100, 80),
    makeChildBounds("3", 95, 200, 100, 80)
  ];
  const arrangement = calculateChildArrangement(children);
  assertEqual(arrangement, "vertical", "Vertical should win when it dominates.");
});

// ============================================================================
// inferOptimalSpacing Tests
// ============================================================================

testCase("infers spacing from consistent horizontal gaps", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 0, 0, 100, 100),
    makeChildBounds("2", 120, 0, 100, 100),  // 20px gap
    makeChildBounds("3", 240, 0, 100, 100)   // 20px gap
  ];
  const spacing = inferOptimalSpacing(children, "horizontal");
  assertEqual(spacing, 20, "Spacing should be inferred as 20px from consistent gaps.");
});

testCase("infers spacing from consistent vertical gaps", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 0, 0, 100, 80),
    makeChildBounds("2", 0, 100, 100, 80),  // 20px gap
    makeChildBounds("3", 0, 200, 100, 80)   // 20px gap
  ];
  const spacing = inferOptimalSpacing(children, "vertical");
  assertEqual(spacing, 20, "Vertical spacing should be inferred as 20px.");
});

testCase("uses median for outlier gaps", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 0, 0, 100, 100),
    makeChildBounds("2", 116, 0, 100, 100),    // 16px gap
    makeChildBounds("3", 232, 0, 100, 100),    // 16px gap
    makeChildBounds("4", 432, 0, 100, 100)     // 100px gap (outlier)
  ];
  const spacing = inferOptimalSpacing(children, "horizontal");
  assertEqual(spacing, 16, "Median should ignore outlier gap.");
});

testCase("returns default spacing for single child", () => {
  const children: ChildBounds[] = [
    makeChildBounds("1", 0, 0, 100, 100)
  ];
  const spacing = inferOptimalSpacing(children, "horizontal");
  assertEqual(spacing, 16, "Single child should return default 16px.");
});

// ============================================================================
// classifyChildPosition Tests
// ============================================================================

testCase("classifies background element as absolute", () => {
  const background = makeChildBounds("bg", 0, 0, 400, 300, "RECTANGLE", "Background");
  const result = classifyChildPosition(background, [], 400, 300, "horizontal");
  assertEqual(result.position, "absolute", "Full-coverage element should be absolute.");
  assertEqual(result.reason, "background", "Reason should be 'background'.");
});

testCase("classifies named background as absolute", () => {
  const background = makeChildBounds("bg", 0, 0, 200, 150, "RECTANGLE", "Hero BG");
  const result = classifyChildPosition(background, [], 400, 300, "horizontal");
  assertEqual(result.position, "absolute", "Element named 'bg' should be absolute.");
});

testCase("classifies corner logo as absolute (edge-floating)", () => {
  const logo = makeChildBounds("logo", 10, 10, 50, 50, "INSTANCE", "Logo");
  const result = classifyChildPosition(logo, [], 400, 300, "horizontal");
  assertEqual(result.position, "absolute", "Small corner element should be absolute.");
  assertEqual(result.reason, "edge-floating", "Reason should be 'edge-floating'.");
});

testCase("classifies normal child as flow", () => {
  const child = makeChildBounds("child", 100, 100, 100, 80, "FRAME", "Content");
  const siblings: ChildBounds[] = [
    makeChildBounds("s1", 50, 100, 100, 80),
    child,
    makeChildBounds("s2", 250, 100, 100, 80)
  ];
  const result = classifyChildPosition(child, siblings, 400, 300, "horizontal");
  assertEqual(result.position, "flow", "Normal aligned child should participate in flow.");
});

// ============================================================================
// Integration Tests
// ============================================================================

testCase("analyzeFrameForAutoLayoutConversion returns null for auto-layout frames", () => {
  const mockFrame = {
    id: "frame-1",
    layoutMode: "HORIZONTAL",
    width: 400,
    height: 300,
    children: []
  } as unknown as FrameNode;

  const result = analyzeFrameForAutoLayoutConversion(mockFrame);
  assertEqual(result, null, "Already auto-layout frames should return null.");
});

testCase("analyzeFrameForAutoLayoutConversion returns null for single child", () => {
  const mockFrame = {
    id: "frame-1",
    layoutMode: "NONE",
    width: 400,
    height: 300,
    children: [
      { id: "1", x: 50, y: 50, width: 100, height: 100, type: "FRAME", name: "Child" }
    ]
  } as unknown as FrameNode;

  const result = analyzeFrameForAutoLayoutConversion(mockFrame);
  assertEqual(result, null, "Single child frame should return null.");
});

testCase("shouldConvertToAutoLayout rejects low confidence candidates", () => {
  const mockFrame = {
    id: "frame-1",
    layoutMode: "NONE",
    width: 400,
    height: 300,
    children: []
  } as unknown as FrameNode;

  const lowConfidenceCandidate: AutoLayoutConversionCandidate = {
    suggestedLayoutMode: "HORIZONTAL",
    suggestedSpacing: 16,
    children: [
      { id: "1", position: "flow", bounds: makeChildBounds("1", 0, 0, 100, 100) },
      { id: "2", position: "flow", bounds: makeChildBounds("2", 150, 0, 100, 100) }
    ],
    confidence: 0.4  // Below threshold
  };

  const result = shouldConvertToAutoLayout(mockFrame, lowConfidenceCandidate);
  assertEqual(result, false, "Low confidence should not convert.");
});

testCase("shouldConvertToAutoLayout accepts high confidence candidates", () => {
  const mockFrame = {
    id: "frame-1",
    layoutMode: "NONE",
    width: 400,
    height: 300,
    children: []
  } as unknown as FrameNode;

  const highConfidenceCandidate: AutoLayoutConversionCandidate = {
    suggestedLayoutMode: "HORIZONTAL",
    suggestedSpacing: 20,
    children: [
      { id: "1", position: "flow", bounds: makeChildBounds("1", 0, 50, 100, 100) },
      { id: "2", position: "flow", bounds: makeChildBounds("2", 120, 50, 100, 100) },
      { id: "3", position: "flow", bounds: makeChildBounds("3", 240, 50, 100, 100) }
    ],
    confidence: 0.8
  };

  const result = shouldConvertToAutoLayout(mockFrame, highConfidenceCandidate);
  assertEqual(result, true, "High confidence with good flow ratio should convert.");
});

testCase("shouldConvertToAutoLayout rejects when most children are absolute", () => {
  const mockFrame = {
    id: "frame-1",
    layoutMode: "NONE",
    width: 400,
    height: 300,
    children: []
  } as unknown as FrameNode;

  const mostlyAbsoluteCandidate: AutoLayoutConversionCandidate = {
    suggestedLayoutMode: "VERTICAL",
    suggestedSpacing: 16,
    children: [
      { id: "1", position: "absolute", bounds: makeChildBounds("1", 0, 0, 400, 300), reason: "background" },
      { id: "2", position: "absolute", bounds: makeChildBounds("2", 10, 10, 50, 50), reason: "edge-floating" },
      { id: "3", position: "flow", bounds: makeChildBounds("3", 150, 150, 100, 80) }
    ],
    confidence: 0.7
  };

  const result = shouldConvertToAutoLayout(mockFrame, mostlyAbsoluteCandidate);
  assertEqual(result, false, "Should not convert when most children are absolute.");
});

console.log("\n✅ All auto-layout-converter tests passed!\n");
