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

  assertEqual(sanitized.qa.length, 1, "Should keep QA entries with valid codes.");
  const [qa] = sanitized.qa;
  assertEqual(qa.code, "LOW_CONTRAST", "QA code should normalize to uppercase.");
  assertEqual(qa.severity, "error", "Severity should preserve 'error' when provided.");
  assertEqual(Math.round((qa.confidence ?? 0) * 100), 100, "Confidence should clamp values over 1.");
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
