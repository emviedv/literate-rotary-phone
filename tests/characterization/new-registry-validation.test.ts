/**
 * Validation test for the new modular registry system.
 * This test ensures the new system produces identical results to the original.
 *
 * Run: npm run test characterization/new-registry-validation.test.ts
 */

// Test that the new modular system produces identical results to the backup
import { ALL_ORIGINAL_EXAMPLES } from '../../core/ai-examples/categories/all-original-examples.js';
import { FEW_SHOT_MESSAGES as NEW_MESSAGES } from '../../core/ai-few-shot-examples.js';

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

// Removed unused assertDeepEqual function

testCase("New registry has same message count as original", () => {
  assertEqual(NEW_MESSAGES.length, ALL_ORIGINAL_EXAMPLES.length, "Message counts should match");
});

testCase("New registry messages have identical structure to original", () => {
  for (let i = 0; i < ALL_ORIGINAL_EXAMPLES.length; i++) {
    const oldMsg = ALL_ORIGINAL_EXAMPLES[i];
    const newMsg = NEW_MESSAGES[i];

    assertEqual(newMsg.role, oldMsg.role, `Message ${i} role should match`);
    assertEqual(newMsg.content, oldMsg.content, `Message ${i} content should match`);

    if (oldMsg.name !== undefined) {
      assertEqual(newMsg.name, oldMsg.name, `Message ${i} name should match`);
    }
  }
});

testCase("New registry produces identical JSON serialization", () => {
  const oldSerialized = JSON.stringify(ALL_ORIGINAL_EXAMPLES);
  const newSerialized = JSON.stringify(NEW_MESSAGES);

  assertEqual(newSerialized, oldSerialized, "JSON serialization should be identical");
});