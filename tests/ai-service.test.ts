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
  const [title, hero] = sanitized.roles;
  assertEqual(title.role, "title", "Title role should normalize casing.");
  assertEqual(Math.round(title.confidence * 100), 84, "Title confidence should scale 84->0.84.");
  assertEqual(hero.role, "hero_image", "Hero role should expand camelCase to underscores.");

  assertEqual(sanitized.focalPoints.length, 1, "Should keep only valid focal points.");
  const [focal] = sanitized.focalPoints;
  assertEqual(focal.x, 1, "Focal x should clamp to 1 when above bounds.");
  assertEqual(focal.y, 0, "Focal y should clamp to 0 when below bounds.");
  assertEqual(Math.round(focal.confidence * 100), 76, "Focal confidence should parse percent strings.");

  assertEqual(sanitized.qa.length, 4, "Should keep QA entries with valid codes including new ones.");
  const lowContrast = sanitized.qa.find(q => q.code === "LOW_CONTRAST");
  if (!lowContrast) throw new Error("LOW_CONTRAST QA missing");
  assertEqual(lowContrast.severity, "error", "Severity should preserve 'error' when provided.");
  assertEqual(Math.round((lowContrast.confidence ?? 0) * 100), 100, "Confidence should clamp values over 1.");

  // Verify new QA codes are accepted
  const excessiveText = sanitized.qa.find(q => q.code === "EXCESSIVE_TEXT");
  if (!excessiveText) throw new Error("EXCESSIVE_TEXT QA missing");
  assertEqual(excessiveText.code, "EXCESSIVE_TEXT", "Should accept EXCESSIVE_TEXT code.");

  const missingCta = sanitized.qa.find(q => q.code === "MISSING_CTA");
  if (!missingCta) throw new Error("MISSING_CTA QA missing");
  assertEqual(missingCta.code, "MISSING_CTA", "Should accept MISSING_CTA code.");

  const aspectMismatch = sanitized.qa.find(q => q.code === "ASPECT_MISMATCH");
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
