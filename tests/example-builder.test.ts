/**
 * Test for the example builder utilities
 */

import {
  createExampleBuilder,
  createFrameInputBuilder,
  createAIResponseBuilder,
  TrainingPairFactory
} from '../core/ai-examples/builders/example-builder.js';

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

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

testCase("Frame input builder works correctly", () => {
  const frameInput = createFrameInputBuilder()
    .withFrame("test-frame", "Test Frame", { width: 400, height: 300 })
    .withNodes([
      { id: "n1", name: "Title", type: "TEXT", rel: { x: 20, y: 20, width: 300, height: 30 }, text: "Test", fontSize: 24 }
    ])
    .withTargets([
      { id: "test-target", width: 800, height: 600, label: "Test Target" }
    ])
    .build();

  assertEqual(frameInput.frame.id, "test-frame", "Frame ID should match");
  assertEqual(frameInput.frame.name, "Test Frame", "Frame name should match");
  assertEqual(frameInput.frame.childCount, 1, "Child count should be 1");
  assertEqual(frameInput.targets[0].id, "test-target", "Target ID should match");
});

testCase("AI response builder works correctly", () => {
  const aiResponse = createAIResponseBuilder()
    .withSignals({
      roles: [{ nodeId: "n1", role: "typography", confidence: 0.95 }],
      focalPoints: [{ nodeId: "n1", x: 0.5, y: 0.5, confidence: 0.9 }],
      qa: [],
      faceRegions: []
    })
    .withLayoutAdvice({
      entries: [{
        targetId: "test-target",
        selectedId: "vertical-stack",
        score: 0.9,
        suggestedLayoutMode: "VERTICAL",
        description: "Test layout"
      }]
    })
    .build();

  assertEqual(aiResponse.signals.roles[0].role, "typography", "Role should be typography");
  assertEqual(aiResponse.layoutAdvice.entries[0].selectedId, "vertical-stack", "Layout should be vertical-stack");
});

testCase("Complete example builder works correctly", () => {
  const frameInput = createFrameInputBuilder()
    .withFrame("test-frame", "Test Frame", { width: 400, height: 300 })
    .withNodes([
      { id: "n1", name: "Title", type: "TEXT", rel: { x: 20, y: 20, width: 300, height: 30 }, text: "Test", fontSize: 24 }
    ])
    .withTargets([
      { id: "test-target", width: 800, height: 600, label: "Test Target" }
    ])
    .build();

  const aiResponse = createAIResponseBuilder()
    .withSignals({
      roles: [{ nodeId: "n1", role: "typography", confidence: 0.95 }],
      focalPoints: [{ nodeId: "n1", x: 0.5, y: 0.5, confidence: 0.9 }],
      qa: [],
      faceRegions: []
    })
    .withLayoutAdvice({
      entries: [{
        targetId: "test-target",
        selectedId: "vertical-stack",
        score: 0.9,
        suggestedLayoutMode: "VERTICAL",
        description: "Test layout"
      }]
    })
    .build();

  const trainingPair = createExampleBuilder()
    .withMetadata({
      id: "test-example",
      name: "Test Example",
      category: "test",
      difficulty: "simple",
      targetFormats: ["test-target"],
      featuredConcepts: ["testing"]
    })
    .withFrameInput(frameInput)
    .withAIResponse(aiResponse)
    .build();

  assertEqual(trainingPair.userMessage.role, "user", "User message role should be user");
  assertEqual(trainingPair.assistantMessage.role, "assistant", "Assistant message role should be assistant");
  assert(trainingPair.userMessage.content.includes("test-frame"), "User message should contain frame ID");
  assert(trainingPair.assistantMessage.content.includes("vertical-stack"), "Assistant message should contain layout");
});

testCase("TrainingPairFactory.createSimple works correctly", () => {
  const trainingPair = TrainingPairFactory.createSimple(
    "Simple Test",
    {
      id: "simple-test",
      name: "Simple Test Frame",
      size: { width: 400, height: 300 },
      nodes: [
        { id: "n1", name: "Title", type: "TEXT", rel: { x: 20, y: 20, width: 300, height: 30 }, text: "Test", fontSize: 24 }
      ]
    },
    [{ id: "test-target", width: 800, height: 600, label: "Test Target" }],
    {
      signals: {
        roles: [{ nodeId: "n1", role: "typography", confidence: 0.95 }],
        focalPoints: [{ nodeId: "n1", x: 0.5, y: 0.5, confidence: 0.9 }],
        qa: [],
        faceRegions: []
      },
      layoutAdvice: {
        entries: [{
          targetId: "test-target",
          selectedId: "vertical-stack",
          score: 0.9,
          suggestedLayoutMode: "VERTICAL",
          description: "Test layout"
        }]
      }
    }
  );

  assertEqual(trainingPair.input.frame.name, "Simple Test Frame", "Frame name should match");
  assertEqual(trainingPair.response.signals.roles[0].role, "typography", "Role should be typography");
});

testCase("Builder validates inputs correctly", () => {
  try {
    createExampleBuilder().build();
    throw new Error("Should have thrown validation error");
  } catch (error: unknown) {
    assert(error instanceof Error, "Should throw Error");
    if (error instanceof Error) {
      assert(error.message.includes("metadata is required"), "Should require metadata");
    }
  }
});

testCase("Frame input builder validates nodes", () => {
  try {
    createFrameInputBuilder()
      .withFrame("test", "Test", { width: 100, height: 100 })
      .withNodes([])
      .withTargets([{ id: "test", width: 100, height: 100, label: "Test" }])
      .build();
    throw new Error("Should have thrown validation error");
  } catch (error: unknown) {
    assert(error instanceof Error, "Should throw Error");
    if (error instanceof Error) {
      assert(error.message.includes("At least one frame node is required"), "Should require nodes");
    }
  }
});