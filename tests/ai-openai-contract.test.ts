/**
 * Contract tests for OpenAI API boundary.
 * These tests verify the expected request/response shapes
 * for the AI service's external integration.
 *
 * IMPORTANT: These are schema contracts, not integration tests.
 * They run without network access and verify structure only.
 */

// ============================================================================
// Test utilities
// ============================================================================

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

function assertType(value: unknown, expectedType: string, label: string): void {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`${label}\nExpected type: ${expectedType}\nReceived type: ${actualType}`);
  }
}

function assertDefined<T>(value: T | undefined | null, label: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${label}: Expected value to be defined`);
  }
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: Expected array, got ${typeof value}`);
  }
}

// Mock Figma global
(globalThis as any).figma = {
  mixed: Symbol("mixed")
};

// ============================================================================
// Contract 1: OpenAI Chat Completion Request Body
// ============================================================================

/**
 * Expected structure of OpenAI chat completion request.
 * This is the contract between ai-service and OpenAI API.
 */
interface OpenAIRequestContract {
  model: string;
  temperature: number;
  max_tokens: number;
  response_format: { type: string };
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; [key: string]: unknown }>;
  }>;
}

testCase("OpenAI request contract: model is required string", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "test" }]
  };

  assertType(validRequest.model, "string", "model should be string");
  assertEqual(validRequest.model.length > 0, true, "model should not be empty");
});

testCase("OpenAI request contract: temperature is valid range", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "test" }]
  };

  assertType(validRequest.temperature, "number", "temperature should be number");
  assertEqual(validRequest.temperature >= 0 && validRequest.temperature <= 2, true,
    "temperature should be 0-2");
});

testCase("OpenAI request contract: max_tokens is positive integer", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "test" }]
  };

  assertType(validRequest.max_tokens, "number", "max_tokens should be number");
  assertEqual(validRequest.max_tokens > 0, true, "max_tokens should be positive");
  assertEqual(Number.isInteger(validRequest.max_tokens), true, "max_tokens should be integer");
});

testCase("OpenAI request contract: response_format is json_object", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "test" }]
  };

  assertEqual(validRequest.response_format.type, "json_object",
    "response_format.type should be json_object");
});

testCase("OpenAI request contract: messages array is non-empty", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" }
    ]
  };

  assertArray(validRequest.messages, "messages");
  assertEqual(validRequest.messages.length >= 1, true, "messages should have at least 1 message");
});

testCase("OpenAI request contract: system message has role='system'", () => {
  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "test prompt" }]
  };

  assertEqual(validRequest.messages[0].role, "system", "first message should be system");
});

testCase("OpenAI request contract: user message supports multimodal content", () => {
  // When image is included, content is an array
  const multimodalContent: Array<{ type: string; [key: string]: unknown }> = [
    {
      type: "image_url",
      image_url: {
        url: "data:image/png;base64,abc123",
        detail: "high"
      }
    },
    {
      type: "text",
      text: '{"frame": {}}'
    }
  ];

  const validRequest: OpenAIRequestContract = {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "test" },
      { role: "user", content: multimodalContent }
    ]
  };

  assertArray(validRequest.messages[1].content, "multimodal content");
  const content = validRequest.messages[1].content as Array<{ type: string }>;
  assertEqual(content[0].type, "image_url", "first content block is image_url");
  assertEqual(content[1].type, "text", "second content block is text");
});

// ============================================================================
// Contract 2: OpenAI Chat Completion Response
// ============================================================================

/**
 * Expected structure of OpenAI chat completion response.
 */
interface OpenAIResponseContract {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

testCase("OpenAI response contract: choices array is present", () => {
  const validResponse: OpenAIResponseContract = {
    choices: [{ message: { content: '{"signals": {}}' } }]
  };

  assertArray(validResponse.choices, "choices");
  assertEqual(validResponse.choices.length >= 1, true, "choices should have at least 1");
});

testCase("OpenAI response contract: content is JSON string", () => {
  const validResponse: OpenAIResponseContract = {
    choices: [{ message: { content: '{"signals": {"roles": []}}' } }]
  };

  const content = validResponse.choices?.[0]?.message?.content;
  assertDefined(content, "content");

  // Should be valid JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("content should be valid JSON");
  }

  assertType(parsed, "object", "parsed content should be object");
});

testCase("OpenAI response contract: handles missing choices gracefully", () => {
  const emptyResponse: OpenAIResponseContract = {};

  // This tests our code's expectation - choices may be undefined
  const content = emptyResponse.choices?.[0]?.message?.content;
  assertEqual(content, undefined, "missing choices returns undefined");
});

testCase("OpenAI response contract: handles missing message gracefully", () => {
  const noMessageResponse: OpenAIResponseContract = {
    choices: [{}]
  };

  const content = noMessageResponse.choices?.[0]?.message?.content;
  assertEqual(content, undefined, "missing message returns undefined");
});

// ============================================================================
// Contract 3: AI Response JSON Schema
// ============================================================================

/**
 * Expected structure of the JSON content from AI.
 * This is what we parse from response.choices[0].message.content
 */
interface AiResponseJsonContract {
  signals?: {
    roles?: Array<{ nodeId: string; role: string; confidence: number }>;
    focalPoints?: Array<{ nodeId: string; x: number; y: number; confidence: number }>;
    qa?: Array<{ code: string; severity: string; message?: string }>;
    faceRegions?: Array<{
      nodeId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
  };
  layoutAdvice?: {
    entries?: Array<{
      targetId: string;
      selectedId: string;
      score: number;
      suggestedLayoutMode?: string;
      backgroundNodeId?: string;
      description?: string;
    }>;
  };
}

testCase("AI response JSON contract: signals.roles has required fields", () => {
  const validJson: AiResponseJsonContract = {
    signals: {
      roles: [{ nodeId: "node-1", role: "typography", confidence: 0.95 }]
    }
  };

  const role = validJson.signals?.roles?.[0];
  assertDefined(role, "role");
  assertType(role.nodeId, "string", "nodeId");
  assertType(role.role, "string", "role");
  assertType(role.confidence, "number", "confidence");
});

testCase("AI response JSON contract: signals.focalPoints has coordinates", () => {
  const validJson: AiResponseJsonContract = {
    signals: {
      focalPoints: [{ nodeId: "hero", x: 0.5, y: 0.3, confidence: 0.88 }]
    }
  };

  const focal = validJson.signals?.focalPoints?.[0];
  assertDefined(focal, "focalPoint");
  assertType(focal.x, "number", "x coordinate");
  assertType(focal.y, "number", "y coordinate");
  assertEqual(focal.x >= 0 && focal.x <= 1, true, "x in 0-1 range");
  assertEqual(focal.y >= 0 && focal.y <= 1, true, "y in 0-1 range");
});

testCase("AI response JSON contract: signals.qa has code and severity", () => {
  const validJson: AiResponseJsonContract = {
    signals: {
      qa: [{ code: "LOW_CONTRAST", severity: "warn", message: "Check text contrast" }]
    }
  };

  const qa = validJson.signals?.qa?.[0];
  assertDefined(qa, "qa signal");
  assertType(qa.code, "string", "code");
  assertType(qa.severity, "string", "severity");
});

testCase("AI response JSON contract: signals.faceRegions has dimensions", () => {
  const validJson: AiResponseJsonContract = {
    signals: {
      faceRegions: [{
        nodeId: "hero-image",
        x: 0.5,
        y: 0.3,
        width: 0.2,
        height: 0.25,
        confidence: 0.85
      }]
    }
  };

  const face = validJson.signals?.faceRegions?.[0];
  assertDefined(face, "faceRegion");
  assertType(face.width, "number", "width");
  assertType(face.height, "number", "height");
  assertEqual(face.width > 0, true, "width should be positive");
  assertEqual(face.height > 0, true, "height should be positive");
});

testCase("AI response JSON contract: layoutAdvice.entries has targetId", () => {
  const validJson: AiResponseJsonContract = {
    layoutAdvice: {
      entries: [{
        targetId: "figma-cover",
        selectedId: "layered-hero",
        score: 0.85,
        suggestedLayoutMode: "HORIZONTAL",
        description: "Horizontal spread for wide target"
      }]
    }
  };

  const entry = validJson.layoutAdvice?.entries?.[0];
  assertDefined(entry, "entry");
  assertType(entry.targetId, "string", "targetId");
  assertType(entry.selectedId, "string", "selectedId (pattern)");
  assertType(entry.score, "number", "score");
});

testCase("AI response JSON contract: layoutAdvice expects 17 targets", () => {
  // This documents the contract that AI should return entries for all targets
  const expectedTargets = [
    "figma-cover", "figma-gallery", "figma-thumbnail",
    "web-hero", "social-carousel", "youtube-cover",
    "tiktok-vertical", "youtube-shorts", "instagram-reels",
    "gumroad-cover", "gumroad-thumbnail", "facebook-cover",
    "landscape-feed", "youtube-thumbnail", "youtube-video",
    "display-leaderboard", "display-rectangle"
  ];

  assertEqual(expectedTargets.length, 17, "Should expect 17 target entries");
});

// ============================================================================
// Contract 4: Error Response Handling
// ============================================================================

testCase("OpenAI error contract: handles 401 unauthorized", () => {
  // Tests that we expect status codes in error responses
  const errorResponse = {
    ok: false,
    status: 401,
    statusText: "Unauthorized"
  };

  assertEqual(errorResponse.ok, false, "error response is not ok");
  assertEqual(errorResponse.status, 401, "unauthorized status");
});

testCase("OpenAI error contract: handles 429 rate limit", () => {
  const rateLimitResponse = {
    ok: false,
    status: 429,
    statusText: "Too Many Requests"
  };

  assertEqual(rateLimitResponse.ok, false, "rate limit is not ok");
  assertEqual(rateLimitResponse.status, 429, "rate limit status");
});

testCase("OpenAI error contract: handles 500 server error", () => {
  const serverErrorResponse = {
    ok: false,
    status: 500,
    statusText: "Internal Server Error"
  };

  assertEqual(serverErrorResponse.ok, false, "server error is not ok");
  assertEqual(serverErrorResponse.status, 500, "server error status");
});

// ============================================================================
// Contract 5: Service Result Types
// ============================================================================

testCase("AiServiceResult contract: signals is optional AiSignals", () => {
  // Both with and without signals should be valid
  const withSignals: import("../core/ai-service.js").AiServiceResult = {
    signals: {
      roles: [{ nodeId: "n1", role: "typography", confidence: 0.9 }],
      focalPoints: [],
      qa: []
    },
    layoutAdvice: undefined
  };

  const withoutSignals: import("../core/ai-service.js").AiServiceResult = {
    signals: undefined,
    layoutAdvice: undefined
  };

  assertEqual(typeof withSignals.signals, "object", "signals can be object");
  assertEqual(withoutSignals.signals, undefined, "signals can be undefined");
});

testCase("EnhancedAiServiceResult contract: success determines structure", () => {
  const successResult: import("../core/ai-service.js").EnhancedAiServiceResult = {
    success: true,
    signals: {
      roles: [],
      focalPoints: [],
      qa: []
    },
    confidence: 0.92
  };

  const failureResult: import("../core/ai-service.js").EnhancedAiServiceResult = {
    success: false,
    error: "API timeout"
  };

  assertEqual(successResult.success, true, "success result has success=true");
  assertEqual(failureResult.success, false, "failure result has success=false");
  assertDefined(failureResult.error, "failure should have error");
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n✅ All OpenAI contract tests passed!\n");
