import { autoSelectLayoutPattern, normalizeLayoutAdvice, readLayoutAdvice, resolvePatternLabel } from "../core/layout-advice.js";

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

testCase("autoSelectLayoutPattern picks the highest-confidence option above threshold", async () => {
  const advice = {
    entries: [
      {
        targetId: "figma-cover",
        selectedId: "stacked",
        options: [
          { id: "hero-left", label: "Hero left", description: "left hero", score: 0.82 },
          { id: "stacked", label: "Stacked", description: "stacked layout", score: 0.65 }
        ]
      }
    ]
  };

  const selection = await autoSelectLayoutPattern(advice, "figma-cover", { minConfidence: 0.7 });
  if (!selection || selection.patternId !== "hero-left") {
    throw new Error("Expected hero-left to be auto-selected as highest-confidence option");
  }
  if (selection.fallback) {
    throw new Error("Did not expect a fallback when a confident option exists");
  }
  if (Math.abs((selection.confidence ?? 0) - 0.82) > 0.0001) {
    throw new Error("Should expose the confidence of the chosen pattern");
  }
});

testCase("autoSelectLayoutPattern marks fallback when no option clears the bar", async () => {
  const advice = {
    entries: [
      {
        targetId: "tiktok-vertical",
        options: [
          { id: "top-heavy", label: "Top heavy", description: "heavy hero", score: 0.42 },
          { id: "balanced", label: "Balanced", description: "balanced layout", score: 0.38 }
        ]
      }
    ]
  };

  const selection = await autoSelectLayoutPattern(advice, "tiktok-vertical", { minConfidence: 0.6 });
  if (!selection?.fallback) {
    throw new Error("Expected fallback when confidence thresholds are not met");
  }
  if (selection.patternId !== undefined) {
    throw new Error("Fallback should not select a pattern id");
  }
});

testCase("normalizeLayoutAdvice maps confidence fields into scores for auto selection", async () => {
  const advice = normalizeLayoutAdvice({
    entries: [
      {
        targetId: "figma-cover",
        options: [
          { id: "hero-left", label: "Hero left", description: "left hero", confidence: 82 },
          { id: "stacked", label: "Stacked", description: "stacked layout", confidence: 0.55 }
        ]
      }
    ]
  });

  if (!advice) {
    throw new Error("Expected advice to normalize");
  }

  const selection = await autoSelectLayoutPattern(advice, "figma-cover", { minConfidence: 0.7 });
  if (!selection || selection.patternId !== "hero-left") {
    throw new Error("Expected hero-left to be selected after normalizing confidence");
  }
  if (selection.fallback) {
    throw new Error("Did not expect fallback when confidence normalizes above threshold");
  }
  if (Math.abs((selection.confidence ?? 0) - 0.82) > 0.0001) {
    throw new Error("Confidence should convert percentage to decimal scale");
  }
});
