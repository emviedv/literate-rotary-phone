/**
 * Contract tests for AI few-shot examples and AI service integration.
 * These tests ensure that the interface between ai-few-shot-examples.ts
 * and ai-service.ts remains stable during refactoring.
 *
 * Run: npm run test contracts/ai-examples-service-contract.test.ts
 */

import { FEW_SHOT_MESSAGES, ChatMessage } from '../../core/ai-few-shot-examples.js';

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

function assertObjectHasKeys(obj: any, requiredKeys: string[], message: string): void {
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`${message}\nMissing required key: ${key}`);
    }
  }
}

// Contract 1: ChatMessage Interface Compatibility
testCase("ChatMessage interface matches OpenAI chat completion format", () => {
  FEW_SHOT_MESSAGES.slice(0, 4).forEach((message, index) => {
    assertObjectHasKeys(message, ['role', 'content'], `Message ${index} missing OpenAI required fields`);

    const validRoles = ['system', 'user', 'assistant'];
    if (!validRoles.includes(message.role)) {
      throw new Error(`Message ${index} has invalid OpenAI role: ${message.role}`);
    }

    if (typeof message.content !== 'string') {
      throw new Error(`Message ${index} content must be string for JSON-mode requests`);
    }

    if ('name' in message && typeof message.name !== 'string') {
      throw new Error(`Message ${index} name field must be string when present`);
    }
  });
});

// Contract 2: Message Pairing Invariant
testCase("User and assistant messages form valid training pairs", () => {
  if (FEW_SHOT_MESSAGES.length % 2 !== 0) {
    throw new Error("Few-shot messages must be even number for proper user/assistant pairing");
  }

  for (let i = 0; i < FEW_SHOT_MESSAGES.length; i += 2) {
    const userMsg = FEW_SHOT_MESSAGES[i];
    const assistantMsg = FEW_SHOT_MESSAGES[i + 1];

    assertEqual(userMsg.role, 'user', `Message ${i} should be user message`);
    assertEqual(assistantMsg.role, 'assistant', `Message ${i + 1} should be assistant message`);

    const userParsed = JSON.parse(userMsg.content);
    if (!userParsed.frame || !userParsed.targets) {
      throw new Error(`User message ${i} should contain frame and targets`);
    }

    const assistantParsed = JSON.parse(assistantMsg.content);
    if (!assistantParsed.signals || !assistantParsed.layoutAdvice) {
      throw new Error(`Assistant message ${i + 1} should contain signals and layoutAdvice`);
    }
  }
});

// Contract 3: Schema Validation
testCase("User messages have valid AI service input schema", () => {
  const userMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'user');

  userMessages.slice(0, 3).forEach((message, index) => {
    const parsed = JSON.parse(message.content);

    assertObjectHasKeys(parsed, ['frame', 'targets'], `User message ${index} missing required fields`);
    assertObjectHasKeys(parsed.frame, ['id', 'name', 'size', 'childCount', 'nodes'],
      `User message ${index} frame missing required fields`);

    if (!Array.isArray(parsed.targets) || parsed.targets.length === 0) {
      throw new Error(`User message ${index} targets must be non-empty array`);
    }
  });
});

testCase("Assistant messages have valid AI service output schema", () => {
  const assistantMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'assistant');

  assistantMessages.slice(0, 3).forEach((message, index) => {
    const parsed = JSON.parse(message.content);

    assertObjectHasKeys(parsed, ['signals', 'layoutAdvice'],
      `Assistant message ${index} missing required fields`);
    assertObjectHasKeys(parsed.signals, ['roles', 'focalPoints', 'qa', 'faceRegions'],
      `Assistant message ${index} signals missing required fields`);
    assertObjectHasKeys(parsed.layoutAdvice, ['entries'],
      `Assistant message ${index} layoutAdvice missing entries`);
  });
});

// Contract 4: Backwards Compatibility
testCase("Export signature remains backwards compatible", () => {
  if (!Array.isArray(FEW_SHOT_MESSAGES)) {
    throw new Error("FEW_SHOT_MESSAGES must be exported as array");
  }

  if (FEW_SHOT_MESSAGES.length === 0) {
    throw new Error("FEW_SHOT_MESSAGES must not be empty");
  }

  const firstMessage = FEW_SHOT_MESSAGES[0];
  const chatMessage: ChatMessage = firstMessage;

  assertEqual(typeof chatMessage.role, 'string', "ChatMessage.role must be string");
  assertEqual(typeof chatMessage.content, 'string', "ChatMessage.content must be string");
});