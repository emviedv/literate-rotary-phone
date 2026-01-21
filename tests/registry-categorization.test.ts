/**
 * Test for the new registry categorization functionality
 */

import { ExampleRegistry } from '../core/ai-examples/registry.js';

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

// Test category functionality
testCase("Registry has 5 categories", () => {
  const categories = ExampleRegistry.getCategories();
  assertEqual(categories.length, 5, "Should have 5 categories");
  assertEqual(categories[0], "simple-cards", "First category should be simple-cards");
  assertEqual(categories[1], "complex-layouts", "Second category should be complex-layouts");
  assertEqual(categories[2], "advanced-cases", "Third category should be advanced-cases");
  assertEqual(categories[3], "quality-assurance", "Fourth category should be quality-assurance");
  assertEqual(categories[4], "common-mistakes", "Fifth category should be common-mistakes");
});

testCase("Simple cards category has 6 messages", () => {
  const simpleCards = ExampleRegistry.getMessagesByCategory('simple-cards');
  assertEqual(simpleCards.length, 6, "Simple cards should have 6 messages (3 pairs)");
  assertEqual(simpleCards[0].role, "user", "First message should be user");
  assertEqual(simpleCards[1].role, "assistant", "Second message should be assistant");
});

testCase("Categories add up to total messages", () => {
  const categories = ExampleRegistry.getCategories();
  let totalCategorized = 0;

  for (const category of categories) {
    totalCategorized += ExampleRegistry.getMessagesByCategory(category).length;
  }

  assertEqual(totalCategorized, 34, "All categorized messages should equal total");
});

testCase("Registry stats include category count", () => {
  const stats = ExampleRegistry.getStats();
  assertEqual(stats.categories, 5, "Stats should show 5 categories");
  assertEqual(stats.totalMessages, 34, "Stats should show 34 total messages");
  assertEqual(stats.trainingPairs, 17, "Stats should show 17 training pairs");
});

testCase("Invalid category throws error", () => {
  try {
    ExampleRegistry.getMessagesByCategory('invalid-category');
    throw new Error("Should have thrown an error");
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown category')) {
      // Expected error
    } else {
      throw error;
    }
  }
});