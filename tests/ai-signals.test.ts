import { deriveWarningsFromAiSignals, readAiSignals, resolvePrimaryFocalPoint } from "../core/ai-signals.js";
import type { AiSignals } from "../types/ai-signals.js";

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

testCase("readAiSignals returns null for missing or invalid data", () => {
  const emptyNode = { getPluginData() { return ""; } } as unknown as FrameNode;
  const malformedNode = { getPluginData() { return "{bad json"; } } as unknown as FrameNode;
  const validNode = {
    getPluginData() {
      return JSON.stringify({ roles: [], focalPoints: [], qa: [] });
    }
  } as unknown as FrameNode;

  if (readAiSignals(emptyNode) !== null) {
    throw new Error("Expected null when no plugin data is present");
  }
  if (readAiSignals(malformedNode) !== null) {
    throw new Error("Expected null when plugin data cannot be parsed");
  }
  const parsed = readAiSignals(validNode);
  if (!parsed || parsed.qa.length !== 0) {
    throw new Error("Expected parsed signals with empty QA entries");
  }
});

testCase("deriveWarningsFromAiSignals maps AI QA signals into VariantWarnings", () => {
  const signals: AiSignals = {
    roles: [],
    focalPoints: [],
    qa: [
      { code: "LOW_CONTRAST", severity: "warn", message: "Low contrast", confidence: 0.9 },
      { code: "LOGO_TOO_SMALL", severity: "error", confidence: 0.7 },
      { code: "UNCERTAIN_ROLES", severity: "info", confidence: 0.2 },
      { code: "GENERIC", severity: "warn" }
    ]
  };

  const warnings = deriveWarningsFromAiSignals(signals);
  assertEqual(warnings.length, 3, "Should include only high-confidence QA signals");
  const [first, second, third] = warnings;

  assertEqual(first.code, "AI_LOW_CONTRAST", "Maps low contrast to AI_LOW_CONTRAST");
  assertEqual(first.severity, "warn", "Preserves warn severity");

  assertEqual(second.code, "AI_LOGO_VISIBILITY", "Maps logo size to AI_LOGO_VISIBILITY");
  assertEqual(second.severity, "warn", "Errors downgrade to warn severity");

  assertEqual(third.code, "AI_GENERIC", "Falls back to AI_GENERIC for generic QA");
  assertEqual(third.severity, "warn", "Warn severity remains warn");
});

testCase("resolvePrimaryFocalPoint returns the highest-confidence focal within bounds", () => {
  const signals: AiSignals = {
    roles: [],
    focalPoints: [
      { nodeId: "focal-weak", x: -0.4, y: 1.3, confidence: 0.48 },
      { nodeId: "focal-strong", x: 0.72, y: 0.15, confidence: 0.83 }
    ],
    qa: []
  };

  const focal = resolvePrimaryFocalPoint(signals);
  if (!focal) {
    throw new Error("Expected to resolve the strongest focal point above confidence threshold");
  }
  assertEqual(Math.round(focal.x * 100) / 100, 0.72, "Should clamp and expose x coordinate");
  assertEqual(Math.round(focal.y * 100) / 100, 0.15, "Should clamp and expose y coordinate");
});

testCase("resolvePrimaryFocalPoint returns null when no focal clears confidence threshold", () => {
  const signals: AiSignals = {
    roles: [],
    focalPoints: [{ nodeId: "soft", x: 0.5, y: 0.5, confidence: 0.33 }],
    qa: []
  };

  const focal = resolvePrimaryFocalPoint(signals);
  if (focal !== null) {
    throw new Error("Expected null when focal points are below minimum confidence");
  }
});
