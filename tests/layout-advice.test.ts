import { readLayoutAdvice, resolvePatternLabel } from "../core/layout-advice.js";

function testCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

testCase("readLayoutAdvice returns null when absent or malformed", () => {
  const emptyNode = { getPluginData() { return ""; } } as unknown as FrameNode;
  const badNode = { getPluginData() { return "{oops"; } } as unknown as FrameNode;
  if (readLayoutAdvice(emptyNode) !== null) {
    throw new Error("Expected null when no layout advice stored");
  }
  if (readLayoutAdvice(badNode) !== null) {
    throw new Error("Expected null when layout advice is malformed");
  }
});

testCase("resolvePatternLabel finds labels for a target/pattern pair", () => {
  const advice = {
    entries: [
      {
        targetId: "figma-cover",
        selectedId: "hero-left",
        options: [
          { id: "hero-left", label: "Hero left", description: "left hero", score: 0.9 },
          { id: "stacked", label: "Stacked", description: "stacked layout", score: 0.6 }
        ]
      }
    ]
  };
  const label = resolvePatternLabel(advice, "figma-cover", "hero-left");
  if (label !== "Hero left") {
    throw new Error("Expected to resolve Hero left label");
  }
  const missing = resolvePatternLabel(advice, "figma-cover", "unknown");
  if (missing !== undefined) {
    throw new Error("Expected undefined for unknown pattern");
  }
});
