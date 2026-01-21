/**
 * Characterization tests for ai-few-shot-examples.ts
 * These tests LOCK current behavior and must pass before/after refactoring.
 *
 * Run: npm run test characterization/ai-few-shot-examples.test.ts
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

function assertLength(array: readonly unknown[], expectedLength: number, message: string): void {
  if (array.length !== expectedLength) {
    throw new Error(`${message}\nExpected length: ${expectedLength}\nReceived: ${array.length}`);
  }
}

function assertObjectHasKeys(obj: any, requiredKeys: string[], message: string): void {
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`${message}\nMissing required key: ${key}`);
    }
  }
}

function assertArrayContains<T>(array: T[], expectedItems: T[], message: string): void {
  for (const item of expectedItems) {
    if (!array.includes(item)) {
      throw new Error(`${message}\nExpected to contain: ${item}\nArray: ${JSON.stringify(array)}`);
    }
  }
}

function assertIsValidJSON(content: string, message: string): any {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${message}\nInvalid JSON: ${content.substring(0, 100)}...`);
  }
}

// Test 1: Array Structure
testCase("exports exactly 26 messages (13 user + 13 assistant pairs)", () => {
  assertLength(FEW_SHOT_MESSAGES, 26, "FEW_SHOT_MESSAGES should contain exactly 26 messages");
});

testCase("alternates between user and assistant messages", () => {
  for (let i = 0; i < FEW_SHOT_MESSAGES.length; i++) {
    const expectedRole = i % 2 === 0 ? 'user' : 'assistant';
    assertEqual(FEW_SHOT_MESSAGES[i].role, expectedRole, `Message at index ${i} should have role ${expectedRole}`);
  }
});

testCase("all messages have required fields and valid roles", () => {
  const validRoles = ['system', 'user', 'assistant'];
  FEW_SHOT_MESSAGES.forEach((message, index) => {
    assertObjectHasKeys(message, ['role', 'content'], `Message ${index} missing required fields`);
    if (!validRoles.includes(message.role)) {
      throw new Error(`Message ${index} has invalid role: ${message.role}`);
    }
    if (message.content.length === 0) {
      throw new Error(`Message ${index} has empty content`);
    }
  });
});

// Test 2: JSON Content Parsing
testCase("all user messages contain valid JSON with expected structure", () => {
  const userMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'user');

  userMessages.forEach((message, index) => {
    const parsed = assertIsValidJSON(message.content, `User message ${index} has invalid JSON`);

    assertObjectHasKeys(parsed, ['frame', 'targets'], `User message ${index} missing required top-level keys`);
    assertObjectHasKeys(parsed.frame, ['id', 'name', 'size', 'childCount', 'nodes'], `User message ${index} frame missing required fields`);
    assertObjectHasKeys(parsed.frame.size, ['width', 'height'], `User message ${index} frame.size missing dimensions`);

    if (!Array.isArray(parsed.frame.nodes)) {
      throw new Error(`User message ${index} frame.nodes is not an array`);
    }
    if (!Array.isArray(parsed.targets)) {
      throw new Error(`User message ${index} targets is not an array`);
    }
  });
});

testCase("all assistant messages contain valid JSON with expected structure", () => {
  const assistantMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'assistant');

  assistantMessages.forEach((message, index) => {
    const parsed = assertIsValidJSON(message.content, `Assistant message ${index} has invalid JSON`);

    assertObjectHasKeys(parsed, ['signals', 'layoutAdvice'], `Assistant message ${index} missing required top-level keys`);
    assertObjectHasKeys(parsed.signals, ['roles', 'focalPoints', 'qa', 'faceRegions'], `Assistant message ${index} signals missing required fields`);
    assertObjectHasKeys(parsed.layoutAdvice, ['entries'], `Assistant message ${index} layoutAdvice missing entries`);

    if (!Array.isArray(parsed.signals.roles)) {
      throw new Error(`Assistant message ${index} signals.roles is not an array`);
    }
    if (!Array.isArray(parsed.layoutAdvice.entries)) {
      throw new Error(`Assistant message ${index} layoutAdvice.entries is not an array`);
    }
  });
});

testCase("frame nodes have consistent structure across examples", () => {
  const userMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'user');

  userMessages.forEach((message, msgIndex) => {
    const parsed = JSON.parse(message.content);
    parsed.frame.nodes.forEach((node: any, nodeIndex: number) => {
      const nodeMsg = `Message ${msgIndex}, Node ${nodeIndex}`;
      assertObjectHasKeys(node, ['id', 'name', 'type', 'rel'], `${nodeMsg} missing required fields`);
      assertObjectHasKeys(node.rel, ['x', 'y', 'width', 'height'], `${nodeMsg} rel missing dimensions`);

      // fillType is only present on some node types
      if ('fillType' in node && typeof node.fillType !== 'string') {
        throw new Error(`${nodeMsg} fillType must be string when present`);
      }
    });
  });
});

// Test 3: Specific Example Preservation
testCase("Example 1 (Feature Card) maintains exact structure", () => {
  const firstUser = JSON.parse(FEW_SHOT_MESSAGES[0].content);
  const firstAssistant = JSON.parse(FEW_SHOT_MESSAGES[1].content);

  // Lock specific content that AI service depends on
  assertEqual(firstUser.frame.id, "ex1", "Example 1 frame ID should be ex1");
  assertEqual(firstUser.frame.name, "Feature Card", "Example 1 frame name should be Feature Card");
  assertEqual(firstUser.frame.size.width, 400, "Example 1 frame width should be 400");
  assertEqual(firstUser.frame.size.height, 300, "Example 1 frame height should be 300");
  assertEqual(firstUser.frame.childCount, 3, "Example 1 frame should have 3 children");

  // Lock role assignments
  assertEqual(firstAssistant.signals.roles[0].nodeId, "n1", "First role should be for node n1");
  assertEqual(firstAssistant.signals.roles[0].role, "logo", "First node should be classified as logo");
  assertEqual(firstAssistant.signals.roles[1].role, "title", "Second node should be classified as title");
  assertEqual(firstAssistant.signals.roles[2].role, "body", "Third node should be classified as body");
});

testCase("Example 5 (TikTok Vertical) preserves platform-specific QA signals", () => {
  const tiktokUser = JSON.parse(FEW_SHOT_MESSAGES[8].content); // 5th example, user msg
  const tiktokAssistant = JSON.parse(FEW_SHOT_MESSAGES[9].content); // 5th example, assistant msg

  assertEqual(tiktokUser.frame.name, "Product Promo Vertical", "TikTok example should have correct frame name");
  assertEqual(tiktokUser.targets[0].id, "tiktok-vertical", "TikTok example should target tiktok-vertical");

  // Lock TikTok-specific QA signal
  const ctaRiskSignal = tiktokAssistant.signals.qa.find((signal: any) => signal.code === "CTA_PLACEMENT_RISK");
  if (!ctaRiskSignal) {
    throw new Error("TikTok example should have CTA_PLACEMENT_RISK QA signal");
  }
  assertEqual(ctaRiskSignal.severity, "warn", "CTA risk signal should be warning severity");
  if (!ctaRiskSignal.message.includes("TikTok bottom bar")) {
    throw new Error("CTA risk signal should mention TikTok bottom bar");
  }
});

testCase("Example with QA Issues preserves QA signal types", () => {
  // Find the QA Issues Demo example by searching through messages
  const userMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'user');
  let qaUserIndex = -1;

  for (let i = 0; i < userMessages.length; i++) {
    const parsed = JSON.parse(userMessages[i].content);
    if (parsed.frame.name === "QA Issues Demo") {
      qaUserIndex = i * 2; // Convert to full message array index
      break;
    }
  }

  if (qaUserIndex === -1) {
    throw new Error("Could not find QA Issues Demo example");
  }

  const qaUser = JSON.parse(FEW_SHOT_MESSAGES[qaUserIndex].content);
  const qaAssistant = JSON.parse(FEW_SHOT_MESSAGES[qaUserIndex + 1].content);

  assertEqual(qaUser.frame.name, "QA Issues Demo", "QA example should have correct frame name");

  // Lock all QA signal types for accessibility example
  const qaCodes = qaAssistant.signals.qa.map((signal: any) => signal.code);
  const expectedQaCodes = [
    "TEXT_TOO_SMALL_ACCESSIBLE",
    "COLOR_CONTRAST_INSUFFICIENT",
    "INSUFFICIENT_TOUCH_TARGETS",
    "HEADING_HIERARCHY_BROKEN",
    "TYPOGRAPHY_INCONSISTENCY"
  ];

  assertArrayContains(qaCodes, expectedQaCodes, "QA example should contain all expected accessibility signals");
});

testCase("Example 11 (Extreme Transform) preserves feasibility and restructure fields", () => {
  const extremeAssistant = JSON.parse(FEW_SHOT_MESSAGES[25].content); // Last assistant msg (26 total, so last is 25)

  const leaderboardAdvice = extremeAssistant.layoutAdvice.entries.find(
    (entry: any) => entry.targetId === "display-leaderboard"
  );

  if (!leaderboardAdvice) {
    throw new Error("Example 11 should have leaderboard advice entry");
  }

  assertObjectHasKeys(leaderboardAdvice, ['feasibility', 'restructure'], "Leaderboard advice missing advanced fields");
  assertObjectHasKeys(leaderboardAdvice.feasibility, ['achievable', 'requiresRestructure', 'predictedFill'], "Feasibility missing required fields");
  assertObjectHasKeys(leaderboardAdvice.restructure, ['contentPriority', 'drop', 'keepRequired', 'arrangement'], "Restructure missing required fields");
});

// Test 4: Content Distribution Coverage
testCase("covers all major target format types", () => {
  const userMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'user');
  const allTargets = userMessages.flatMap(msg => {
    const parsed = JSON.parse(msg.content);
    return parsed.targets.map((t: any) => t.id);
  });

  // Lock coverage of major format types
  const expectedTargets = [
    'ig-story',
    'tiktok-vertical',
    'web-hero',
    'figma-thumbnail',
    'figma-cover',
    'social-carousel',
    'youtube-cover',
    'gumroad-cover',
    'gumroad-thumbnail'
  ];

  assertArrayContains(allTargets, expectedTargets, "Examples should cover all major target formats");
});

testCase("covers all major QA signal codes", () => {
  const assistantMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'assistant');
  const allQaCodes = assistantMessages.flatMap(msg => {
    const parsed = JSON.parse(msg.content);
    return parsed.signals.qa.map((signal: any) => signal.code);
  });

  // Lock QA signal type coverage
  const expectedCodes = [
    'SAFE_AREA_RISK',
    'MISSING_CTA',
    'UNCERTAIN_ROLES',
    'ASPECT_MISMATCH',
    'CTA_PLACEMENT_RISK',
    'THUMBNAIL_LEGIBILITY',
    'CONTENT_DENSITY_MISMATCH',
    'OVERLAY_CONFLICT',
    'TEXT_TOO_SMALL_ACCESSIBLE',
    'COLOR_CONTRAST_INSUFFICIENT'
  ];

  assertArrayContains(allQaCodes, expectedCodes, "Examples should cover all major QA signal types");
});

testCase("covers all layout pattern recommendations", () => {
  const assistantMessages = FEW_SHOT_MESSAGES.filter(msg => msg.role === 'assistant');
  const allPatterns = assistantMessages.flatMap(msg => {
    const parsed = JSON.parse(msg.content);
    return parsed.layoutAdvice.entries.map((entry: any) => entry.selectedId);
  });

  // Lock layout pattern coverage
  const expectedPatterns = [
    'vertical-stack',
    'centered-stack',
    'horizontal-split',
    'preserve-layout',
    'hero-first',
    'compact-vertical',
    'layered-gradient',
    'split-left',
    'horizontal-stack'
  ];

  assertArrayContains(allPatterns, expectedPatterns, "Examples should cover all major layout patterns");
});

// Test 5: Type Interface Compliance
testCase("ChatMessage interface covers all actual message properties", () => {
  FEW_SHOT_MESSAGES.forEach((message, index) => {
    // Test that our ChatMessage type actually matches reality
    const validMessage: ChatMessage = message;
    if (!validMessage.role) {
      throw new Error(`Message ${index} missing role`);
    }
    if (!validMessage.content) {
      throw new Error(`Message ${index} missing content`);
    }

    // Test optional name field handling
    if ('name' in message && typeof message.name !== 'string') {
      throw new Error(`Message ${index} has non-string name field`);
    }
  });
});