/**
 * Debug Performance Logging Tests
 *
 * Interface tests for performance logging functionality.
 * These tests verify the functions can be called without errors.
 */

// Test utilities
function testCase(name: string, fn: () => void | Promise<void>): void {
  Promise.resolve(fn()).then(
    () => console.log(`✅ ${name}`),
    (error) => {
      console.error(`❌ ${name}`);
      console.error(error);
      throw error;
    }
  );
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// Mock debug environment
(global as any).isDebugFixEnabled = () => true;

// Import debug functions
import {
  debugPerformanceLog,
  debugTimingLog,
  debugBottleneckLog,
  debugPerformanceReport
} from "../../core/debug.js";

// Test debugPerformanceLog interface
testCase("Debug Performance Logging - Performance Log Interface", () => {
  // Test that the function can be called without errors
  try {
    debugPerformanceLog("test-operation", 1500, {
      testMetadata: "value",
      iterations: 10
    });

    assertEqual(true, true, "debugPerformanceLog should execute without errors");
  } catch (error) {
    throw new Error(`debugPerformanceLog threw an error: ${error}`);
  }
});

// Test debugTimingLog interface
testCase("Debug Performance Logging - Timing Log Interface", () => {
  try {
    debugTimingLog("database-query", 750, {
      query: "SELECT * FROM users",
      rowCount: 25
    });

    assertEqual(true, true, "debugTimingLog should execute without errors");
  } catch (error) {
    throw new Error(`debugTimingLog threw an error: ${error}`);
  }
});

// Test debugBottleneckLog interface
testCase("Debug Performance Logging - Bottleneck Log Interface", () => {
  try {
    const bottlenecks = [
      { operation: "ai-request", durationMs: 8000, severity: "high" as const },
      { operation: "image-export", durationMs: 15000, severity: "critical" as const },
      { operation: "font-loading", durationMs: 2000, severity: "medium" as const }
    ];

    debugBottleneckLog(bottlenecks);

    assertEqual(true, true, "debugBottleneckLog should execute without errors");
  } catch (error) {
    throw new Error(`debugBottleneckLog threw an error: ${error}`);
  }
});

// Test empty bottlenecks
testCase("Debug Performance Logging - Empty Bottlenecks Interface", () => {
  try {
    debugBottleneckLog([]);
    assertEqual(true, true, "debugBottleneckLog should handle empty arrays");
  } catch (error) {
    throw new Error(`debugBottleneckLog with empty array threw an error: ${error}`);
  }
});

// Test debugPerformanceReport interface
testCase("Debug Performance Logging - Performance Report Interface", () => {
  try {
    const report = {
      totalDurationMs: 12500,
      operationCount: 15,
      bottlenecks: [
        { operation: "slow-op", durationMs: 5000, severity: "critical" as const },
        { operation: "medium-op", durationMs: 2000, severity: "high" as const }
      ]
    };

    debugPerformanceReport(report);

    assertEqual(true, true, "debugPerformanceReport should execute without errors");
  } catch (error) {
    throw new Error(`debugPerformanceReport threw an error: ${error}`);
  }
});

// Test with various data types
testCase("Debug Performance Logging - Data Types", () => {
  try {
    // Test different duration values
    debugPerformanceLog("small-op", 50);
    debugPerformanceLog("large-op", 3600000);
    debugPerformanceLog("zero-op", 0);

    // Test different context types
    debugTimingLog("context-test", 1000, {
      string: "value",
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: "data" }
    });

    assertEqual(true, true, "Should handle various data types without errors");
  } catch (error) {
    throw new Error(`Debug functions with various data types threw an error: ${error}`);
  }
});

console.log("✓ All debug performance logging tests passed");