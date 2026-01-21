import { sanitizeAiSignals, summarizeFrame } from "../core/ai-service.js";

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
const mockMixed = Symbol("mixed");
(globalThis as any).figma = {
  mixed: mockMixed
};

testCase("summarizeFrame captures visual properties", () => {
  const mockFrame = {
    id: "frame-1",
    name: "Frame 1",
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    width: 100,
    height: 100,
    children: [
      {
        id: "text-1",
        type: "TEXT",
        visible: true,
        name: "Title",
        characters: "Hello World",
        fontSize: 24,
        fontName: { family: "Inter", style: "Bold" },
        absoluteBoundingBox: { x: 10, y: 10, width: 80, height: 20 },
        layoutMode: "NONE",
        fills: [{ type: "SOLID", visible: true, color: { r: 0, g: 0.5, b: 1 } }]
      },
      {
        id: "text-mixed",
        type: "TEXT",
        visible: true,
        name: "Mixed Text",
        characters: "Mixed content",
        fontSize: mockMixed,
        fontName: mockMixed,
        absoluteBoundingBox: { x: 10, y: 40, width: 80, height: 20 },
        layoutMode: "NONE",
        fills: [],
        opacity: 0.8
      },
      {
        id: "image-1",
        type: "RECTANGLE",
        visible: true,
        name: "Image",
        absoluteBoundingBox: { x: 10, y: 70, width: 20, height: 20 },
        layoutMode: "NONE",
        fills: [{ type: "IMAGE" }]
      }
    ]
  };

  // @ts-ignore - partial mock
  const summary = summarizeFrame(mockFrame);

  assertEqual(summary.nodes.length, 3, "Should summarize all 3 visible nodes");

  const title = summary.nodes.find(n => n.id === "text-1");
  if (!title) throw new Error("Title node missing");
  assertEqual(title.fontSize, 24, "Should capture font size");
  assertEqual(title.fontWeight, "Bold", "Should capture font weight");
  assertEqual(title.fillType, "SOLID", "Should capture solid fill");
  assertEqual(title.dominantColor, "#0080ff", "Should extract dominant color");
  assertEqual(title.zIndex, 0, "First node should have zIndex 0");

  const mixed = summary.nodes.find(n => n.id === "text-mixed");
  if (!mixed) throw new Error("Mixed node missing");
  assertEqual(mixed.fontSize, "mixed", "Should handle mixed font size");
  assertEqual(mixed.fontWeight, "mixed", "Should handle mixed font weight");
  assertEqual(mixed.opacity, 0.8, "Should capture opacity");
  assertEqual(mixed.zIndex, 1, "Second node should have zIndex 1");

  const image = summary.nodes.find(n => n.id === "image-1");
  if (!image) throw new Error("Image node missing");
  assertEqual(image.fillType, "IMAGE", "Should capture image fill type");
  assertEqual(image.zIndex, 2, "Third node should have zIndex 2");
});

testCase("sanitizeAiSignals normalizes casing, confidence, and QA codes", () => {
  const sanitized = sanitizeAiSignals({
    roles: [
      { nodeId: "node-title", role: "Title", confidence: 84 },
      { nodeId: "hero-1", role: "HeroImage", confidence: 0.42 },
      { nodeId: "bad", role: "unsupported-role" }
    ],
    focalPoints: [
      { nodeId: "hero-1", x: 1.25, y: -0.2, confidence: "76%" },
      { nodeId: "ignored", x: "bad", y: 0.5 }
    ],
    qa: [
      { code: "low_contrast", severity: "error", confidence: "120.5", message: "Too little contrast" },
      { code: "excessive_text", severity: "warn", message: "Too much text" },
      { code: "missing_cta", severity: "info", message: "No CTA found" },
      { code: "aspect_mismatch", severity: "warn", message: "Bad aspect ratio" },
      { code: "unknown_code", severity: "info" }
    ]
  });

  if (!sanitized) {
    throw new Error("Expected sanitizeAiSignals to return normalized data.");
  }

  assertEqual(sanitized.roles.length, 2, "Should discard unsupported roles.");
  const [titleNode, heroNode] = sanitized.roles;
  // With universal taxonomy: "Title" → "title" → "typography", "HeroImage" → "hero_image" → "subject"
  assertEqual(titleNode.role, "typography", "Title role should normalize and map to typography.");
  assertEqual(Math.round(titleNode.confidence * 100), 84, "Title confidence should scale 84->0.84.");
  assertEqual(heroNode.role, "subject", "Hero role should normalize to subject.");

  assertEqual(sanitized.focalPoints?.length ?? 0, 1, "Should keep only valid focal points.");
  const focal = sanitized.focalPoints?.[0];
  if (!focal) throw new Error("Focal point missing");
  assertEqual(focal.x, 1, "Focal x should clamp to 1 when above bounds.");
  assertEqual(focal.y, 0, "Focal y should clamp to 0 when below bounds.");
  assertEqual(Math.round(focal.confidence * 100), 76, "Focal confidence should parse percent strings.");

  // After consolidation: low_contrast → CONTRAST_ISSUE (deduped with other contrast codes)
  // 4 input codes remain after filtering unknown_code, but low_contrast is consolidated
  assertEqual(sanitized.qa?.length ?? 0, 4, "Should keep QA entries with valid codes including new ones.");
  const contrastIssue = sanitized.qa?.find(q => q.code === "CONTRAST_ISSUE");
  if (!contrastIssue) throw new Error("CONTRAST_ISSUE QA missing (consolidated from LOW_CONTRAST)");
  assertEqual(contrastIssue.severity, "error", "Severity should preserve 'error' when provided.");
  assertEqual(Math.round((contrastIssue.confidence ?? 0) * 100), 100, "Confidence should clamp values over 1.");

  // Verify new QA codes are accepted
  const excessiveText = sanitized.qa?.find(q => q.code === "EXCESSIVE_TEXT");
  if (!excessiveText) throw new Error("EXCESSIVE_TEXT QA missing");
  assertEqual(excessiveText.code, "EXCESSIVE_TEXT", "Should accept EXCESSIVE_TEXT code.");

  const missingCta = sanitized.qa?.find(q => q.code === "MISSING_CTA");
  if (!missingCta) throw new Error("MISSING_CTA QA missing");
  assertEqual(missingCta.code, "MISSING_CTA", "Should accept MISSING_CTA code.");

  const aspectMismatch = sanitized.qa?.find(q => q.code === "ASPECT_MISMATCH");
  if (!aspectMismatch) throw new Error("ASPECT_MISMATCH QA missing");
  assertEqual(aspectMismatch.code, "ASPECT_MISMATCH", "Should accept ASPECT_MISMATCH code.");
});

testCase("sanitizeAiSignals returns undefined when no valid entries remain", () => {
  const sanitized = sanitizeAiSignals({
    roles: [{ nodeId: "node", role: "unsupported", confidence: 0.2 }],
    focalPoints: [{ nodeId: "node", x: "bad", y: 0.5 }],
    qa: [{ code: "unknown", severity: "warn" }]
  });

  if (sanitized !== undefined) {
    throw new Error("Expected sanitizeAiSignals to return undefined when nothing valid remains.");
  }
});

// Characterization test: BFS traversal and MAX_SUMMARY_NODES limit
testCase("summarizeFrame enforces MAX_SUMMARY_NODES limit with BFS traversal", () => {
  // Create frame with 70 children (exceeds MAX_SUMMARY_NODES of 60)
  const children: any[] = [];
  for (let i = 0; i < 70; i++) {
    children.push({
      id: `node-${i}`,
      type: "RECTANGLE",
      visible: true,
      name: `Node ${i}`,
      absoluteBoundingBox: { x: i * 10, y: 0, width: 10, height: 10 },
      fills: []
    });
  }

  const mockFrame = {
    id: "frame-large",
    name: "Large Frame",
    absoluteBoundingBox: { x: 0, y: 0, width: 700, height: 100 },
    width: 700,
    height: 100,
    children
  };

  // @ts-ignore - partial mock
  const summary = summarizeFrame(mockFrame);

  // Should cap at MAX_SUMMARY_NODES (60)
  assertEqual(summary.nodes.length, 60, "Should cap at MAX_SUMMARY_NODES (60)");

  // BFS order: first 60 children should be included
  assertEqual(summary.nodes[0].id, "node-0", "First node should be node-0 (BFS order)");
  assertEqual(summary.nodes[59].id, "node-59", "Last node should be node-59 (BFS order)");
});

// Characterization test: Invisible nodes are filtered
testCase("summarizeFrame filters invisible nodes", () => {
  const mockFrame = {
    id: "frame-vis",
    name: "Visibility Frame",
    absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    width: 100,
    height: 100,
    children: [
      {
        id: "visible-1",
        type: "RECTANGLE",
        visible: true,
        name: "Visible",
        absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
        fills: []
      },
      {
        id: "hidden-1",
        type: "RECTANGLE",
        visible: false,
        name: "Hidden",
        absoluteBoundingBox: { x: 50, y: 0, width: 50, height: 50 },
        fills: []
      },
      {
        id: "visible-2",
        type: "RECTANGLE",
        visible: true,
        name: "Visible 2",
        absoluteBoundingBox: { x: 0, y: 50, width: 50, height: 50 },
        fills: []
      }
    ]
  };

  // @ts-ignore - partial mock
  const summary = summarizeFrame(mockFrame);

  assertEqual(summary.nodes.length, 2, "Should only include visible nodes");
  assertEqual(summary.nodes[0].id, "visible-1", "First visible node");
  assertEqual(summary.nodes[1].id, "visible-2", "Second visible node");
});

// Characterization test: Face region sanitization
testCase("sanitizeAiSignals validates face regions with dimension bounds", () => {
  const sanitized = sanitizeAiSignals({
    roles: [],
    focalPoints: [],
    qa: [],
    faceRegions: [
      // Valid face region
      { nodeId: "hero", x: 0.5, y: 0.3, width: 0.2, height: 0.25, confidence: 0.85 },
      // Face too small (should clamp to 3% minimum)
      { nodeId: "small", x: 0.5, y: 0.5, width: 0.01, height: 0.01, confidence: 0.7 },
      // Face too large (should clamp to 80% maximum)
      { nodeId: "large", x: 0.5, y: 0.5, width: 0.95, height: 0.95, confidence: 0.8 },
      // Out of bounds coordinates (should clamp to 0-1)
      { nodeId: "oob", x: 1.5, y: -0.3, width: 0.2, height: 0.2, confidence: 0.75 },
      // Invalid entry (missing required fields)
      { nodeId: "invalid", x: "bad" },
      // Missing dimensions
      { nodeId: "partial", x: 0.5, y: 0.5 }
    ]
  });

  if (!sanitized || !sanitized.faceRegions) {
    throw new Error("Expected sanitized face regions");
  }

  assertEqual(sanitized.faceRegions.length, 4, "Should keep 4 valid face regions");

  // Check dimension clamping
  const small = sanitized.faceRegions.find(f => f.nodeId === "small");
  if (!small) throw new Error("Small face region missing");
  assertEqual(small.width, 0.03, "Width should clamp to 3% minimum");
  assertEqual(small.height, 0.03, "Height should clamp to 3% minimum");

  const large = sanitized.faceRegions.find(f => f.nodeId === "large");
  if (!large) throw new Error("Large face region missing");
  assertEqual(large.width, 0.8, "Width should clamp to 80% maximum");
  assertEqual(large.height, 0.8, "Height should clamp to 80% maximum");

  const oob = sanitized.faceRegions.find(f => f.nodeId === "oob");
  if (!oob) throw new Error("OOB face region missing");
  assertEqual(oob.x, 1, "X should clamp to 1 maximum");
  assertEqual(oob.y, 0, "Y should clamp to 0 minimum");
});

// Characterization test: Layout properties extraction
testCase("summarizeFrame extracts auto-layout properties from frames", () => {
  const mockFrame = {
    id: "frame-layout",
    name: "Layout Frame",
    absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    width: 400,
    height: 300,
    children: [
      {
        id: "auto-h",
        type: "FRAME",
        visible: true,
        name: "Horizontal Stack",
        absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
        layoutMode: "HORIZONTAL",
        primaryAxisAlignItems: "SPACE_BETWEEN",
        counterAxisAlignItems: "CENTER",
        fills: []
      },
      {
        id: "auto-v",
        type: "FRAME",
        visible: true,
        name: "Vertical Stack",
        absoluteBoundingBox: { x: 0, y: 100, width: 200, height: 200 },
        layoutMode: "VERTICAL",
        primaryAxisAlignItems: "MIN",
        counterAxisAlignItems: "MAX",
        fills: []
      },
      {
        id: "no-layout",
        type: "FRAME",
        visible: true,
        name: "No Layout",
        absoluteBoundingBox: { x: 200, y: 0, width: 200, height: 300 },
        layoutMode: "NONE",
        fills: []
      }
    ]
  };

  // @ts-ignore - partial mock
  const summary = summarizeFrame(mockFrame);

  const autoH = summary.nodes.find(n => n.id === "auto-h");
  if (!autoH) throw new Error("Horizontal auto-layout node missing");
  assertEqual(autoH.layoutMode, "HORIZONTAL", "Should capture HORIZONTAL layoutMode");
  assertEqual(autoH.primaryAxisAlignItems, "SPACE_BETWEEN", "Should capture primaryAxisAlignItems");
  assertEqual(autoH.counterAxisAlignItems, "CENTER", "Should capture counterAxisAlignItems");

  const autoV = summary.nodes.find(n => n.id === "auto-v");
  if (!autoV) throw new Error("Vertical auto-layout node missing");
  assertEqual(autoV.layoutMode, "VERTICAL", "Should capture VERTICAL layoutMode");
  assertEqual(autoV.primaryAxisAlignItems, "MIN", "Should capture MIN alignment");
  assertEqual(autoV.counterAxisAlignItems, "MAX", "Should capture MAX alignment");

  const noLayout = summary.nodes.find(n => n.id === "no-layout");
  if (!noLayout) throw new Error("No-layout node missing");
  assertEqual(noLayout.layoutMode, undefined, "Should not include layoutMode for NONE");
});

// Characterization test: Relative positioning calculation
testCase("summarizeFrame calculates relative positions from frame origin", () => {
  const mockFrame = {
    id: "frame-rel",
    name: "Relative Frame",
    absoluteBoundingBox: { x: 100, y: 200, width: 400, height: 300 },
    width: 400,
    height: 300,
    children: [
      {
        id: "offset-node",
        type: "RECTANGLE",
        visible: true,
        name: "Offset Node",
        absoluteBoundingBox: { x: 150, y: 250, width: 100, height: 50 },
        fills: []
      }
    ]
  };

  // @ts-ignore - partial mock
  const summary = summarizeFrame(mockFrame);

  const node = summary.nodes[0];
  // Relative position should be: (150-100, 250-200) = (50, 50)
  assertEqual(node.rel.x, 50, "Relative X should be 50 (150-100)");
  assertEqual(node.rel.y, 50, "Relative Y should be 50 (250-200)");
  assertEqual(node.rel.width, 100, "Width should be preserved");
  assertEqual(node.rel.height, 50, "Height should be preserved");
});
