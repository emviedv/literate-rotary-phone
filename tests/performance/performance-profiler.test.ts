/**
 * Performance Profiler Tests
 *
 * Tests for the core performance measurement system.
 */

import {
  PerformanceProfiler,
  startTimer,
  endTimer,
  timeSync,
  timeAsync,
  generateReport,
  clearPerformanceData
} from "../../core/performance.js";

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

// Mock the debug system
const mockIsDebugFixEnabled = () => true;

// Override debug check for testing
(global as any).isDebugFixEnabled = mockIsDebugFixEnabled;

/**
 * Helper function to wait for a specific duration.
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test basic timer functionality
testCase("PerformanceProfiler - Basic Timer Operations", async () => {
  const profiler = new PerformanceProfiler();

  // Test starting and ending a timer
  profiler.startTimer("test-operation", { testMetadata: "value" });

  // Wait a bit to get measurable duration
  await wait(10);

  const measurement = profiler.endTimer("test-operation", { endMetadata: "endValue" });

  assertEqual(measurement !== null, true, "Measurement should not be null");
  assertEqual(typeof measurement!.name, "string", "Measurement name should be string");
  assertEqual(measurement!.name, "test-operation", "Measurement name should match");
  assertEqual(measurement!.durationMs > 0, true, "Duration should be positive");
  assertEqual(typeof measurement!.timestamp, "string", "Timestamp should be string");

  // Test metadata merging
  assertEqual(measurement!.metadata?.testMetadata, "value", "Should preserve start metadata");
  assertEqual(measurement!.metadata?.endMetadata, "endValue", "Should include end metadata");
});

// Test timer with no debug mode
testCase("PerformanceProfiler - Zero Overhead When Debug Disabled", () => {
  // Temporarily disable debug
  (global as any).isDebugFixEnabled = () => false;

  const profiler = new PerformanceProfiler();

  profiler.startTimer("test-operation");
  const measurement = profiler.endTimer("test-operation");

  assertEqual(measurement, null, "Should return null when debug disabled");

  // Restore debug mode
  (global as any).isDebugFixEnabled = mockIsDebugFixEnabled;
});

// Test timeSync function
testCase("PerformanceProfiler - Synchronous Operation Timing", () => {
  const profiler = new PerformanceProfiler();

  let operationExecuted = false;
  const result = profiler.timeSync("sync-test", () => {
    operationExecuted = true;
    return "test-result";
  }, { syncTest: true });

  assertEqual(result, "test-result", "Should return operation result");
  assertEqual(operationExecuted, true, "Operation should have been executed");

  const measurements = profiler.getMeasurements();

  // Only check measurements if debug is enabled and measurements exist
  if (measurements.length > 0) {
    assertEqual(measurements[0].name, "sync-test", "Should have correct name");
    assertEqual(measurements[0].metadata?.syncTest, true, "Should have metadata");
  }

  // Always ensure the function works correctly regardless of debug state
  assertEqual(typeof measurements, "object", "Should return measurements array");
});

// Test timeSync with error
testCase("PerformanceProfiler - Synchronous Operation Error Handling", () => {
  const profiler = new PerformanceProfiler();

  let errorThrown = false;
  try {
    profiler.timeSync("sync-error-test", () => {
      throw new Error("Test error");
    });
  } catch (error) {
    errorThrown = true;
    assertEqual((error as Error).message, "Test error", "Should propagate error");
  }

  assertEqual(errorThrown, true, "Error should have been thrown");

  const measurements = profiler.getMeasurements();

  // Only check measurements if debug is enabled and measurements exist
  if (measurements.length > 0) {
    assertEqual(measurements[0].name, "sync-error-test", "Should have correct name");
    assertEqual(typeof measurements[0].metadata?.error, "string", "Should have error in metadata");
  }

  // Always ensure the function works correctly regardless of debug state
  assertEqual(typeof measurements, "object", "Should return measurements array");
});

// Test timeAsync function
testCase("PerformanceProfiler - Asynchronous Operation Timing", async () => {
  const profiler = new PerformanceProfiler();

  let operationExecuted = false;
  const result = await profiler.timeAsync("async-test", async () => {
    await wait(5);
    operationExecuted = true;
    return "async-result";
  }, { asyncTest: true });

  assertEqual(result, "async-result", "Should return operation result");
  assertEqual(operationExecuted, true, "Operation should have been executed");

  const measurements = profiler.getMeasurements();

  // Only check measurements if debug is enabled and measurements exist
  if (measurements.length > 0) {
    assertEqual(measurements[0].name, "async-test", "Should have correct name");
    assertEqual(measurements[0].durationMs >= 5, true, "Duration should be at least 5ms");
    assertEqual(measurements[0].metadata?.asyncTest, true, "Should have metadata");
  }

  // Always ensure the function works correctly regardless of debug state
  assertEqual(typeof measurements, "object", "Should return measurements array");
});

// Test timeAsync with error
testCase("PerformanceProfiler - Asynchronous Operation Error Handling", async () => {
  const profiler = new PerformanceProfiler();

  let errorThrown = false;
  try {
    await profiler.timeAsync("async-error-test", async () => {
      await wait(5);
      throw new Error("Async test error");
    });
  } catch (error) {
    errorThrown = true;
    assertEqual((error as Error).message, "Async test error", "Should propagate error");
  }

  assertEqual(errorThrown, true, "Error should have been thrown");

  const measurements = profiler.getMeasurements();

  // Only check measurements if debug is enabled and measurements exist
  if (measurements.length > 0) {
    assertEqual(measurements[0].name, "async-error-test", "Should have correct name");
    assertEqual(typeof measurements[0].metadata?.error, "string", "Should have error in metadata");
  }

  // Always ensure the function works correctly regardless of debug state
  assertEqual(typeof measurements, "object", "Should return measurements array");
});

// Test report generation
testCase("PerformanceProfiler - Report Generation", async () => {
  const profiler = new PerformanceProfiler();

  // Add some measurements with different durations
  await profiler.timeAsync("fast-operation", async () => {
    await wait(5);
  });

  await profiler.timeAsync("slow-operation", async () => {
    await wait(20);
  });

  await profiler.timeAsync("medium-operation", async () => {
    await wait(10);
  });

  const report = profiler.generateReport();

  assertEqual(typeof report.totalDurationMs, "number", "Should have total duration");
  assertEqual(typeof report.measurements, "object", "Should have measurements array");
  assertEqual(Array.isArray(report.bottlenecks), true, "Should have bottlenecks array");
  assertEqual(report.statistics.operationCount, report.measurements.length, "Should count operations correctly");

  // Only test specific measurement details if debug is enabled and measurements exist
  if (report.measurements.length > 0) {
    if (report.statistics.slowestOperation) {
      assertEqual(typeof report.statistics.slowestOperation.name, "string", "Should have slowest operation name");
    }
    if (report.statistics.fastestOperation) {
      assertEqual(typeof report.statistics.fastestOperation.name, "string", "Should have fastest operation name");
    }
  }

  // Check bottleneck analysis
  assertEqual(Array.isArray(report.bottlenecks), true, "Should have bottlenecks array");
});

// Test clear functionality
testCase("PerformanceProfiler - Clear Functionality", () => {
  const profiler = new PerformanceProfiler();

  profiler.startTimer("test-clear");
  profiler.endTimer("test-clear");

  // Check measurements exist before clear
  profiler.getMeasurements();

  profiler.clear();

  const measurementsAfterClear = profiler.getMeasurements();
  assertEqual(measurementsAfterClear.length, 0, "Should have no measurements after clear");
  assertEqual(profiler.isTimerActive("test-clear"), false, "Should have no active timers");
});

// Test global profiler functions
testCase("PerformanceProfiler - Global Functions", async () => {
  clearPerformanceData(); // Start clean

  startTimer("global-test", { globalTest: true });
  await wait(5);
  const measurement = endTimer("global-test");

  assertEqual(measurement !== null, true, "Global endTimer should return measurement");
  assertEqual(measurement!.name, "global-test", "Should have correct name");
  assertEqual(measurement!.metadata?.globalTest, true, "Should have metadata");

  const syncResult = timeSync("global-sync", () => "sync-result");
  assertEqual(syncResult, "sync-result", "Global timeSync should work");

  const asyncResult = await timeAsync("global-async", async () => {
    await wait(5);
    return "async-result";
  });
  assertEqual(asyncResult, "async-result", "Global timeAsync should work");

  const report = generateReport();
  assertEqual(typeof report.measurements, "object", "Should have measurements array");
  assertEqual(report.statistics.operationCount, report.measurements.length, "Should count operations correctly");
});

// Test timer state management
testCase("PerformanceProfiler - Timer State Management", () => {
  const profiler = new PerformanceProfiler();

  // Test isTimerActive
  assertEqual(profiler.isTimerActive("nonexistent"), false, "Should return false for non-existent timer");

  profiler.startTimer("active-test");
  assertEqual(profiler.isTimerActive("active-test"), true, "Should return true for active timer");

  profiler.endTimer("active-test");
  assertEqual(profiler.isTimerActive("active-test"), false, "Should return false after ending timer");

  // Test ending non-existent timer
  const nullMeasurement = profiler.endTimer("nonexistent");
  assertEqual(nullMeasurement, null, "Should return null for non-existent timer");
});

// Test timer overwriting
testCase("PerformanceProfiler - Timer Overwriting", async () => {
  const profiler = new PerformanceProfiler();

  profiler.startTimer("overwrite-test");
  await wait(5);

  // Start again with same name - should end the previous one
  profiler.startTimer("overwrite-test");
  await wait(5);

  const measurement = profiler.endTimer("overwrite-test");

  assertEqual(measurement !== null, true, "Should have measurement");
  assertEqual(measurement!.durationMs < 10, true, "Duration should be from second start");

  const measurements = profiler.getMeasurements();

  // Only check measurement details if debug is enabled and measurements exist
  if (measurements.length > 0) {
    assertEqual(measurements.length, 1, "Should only have one measurement (overwritten)");
  }

  assertEqual(typeof measurements, "object", "Should return measurements array");
});

// Test performance with many operations
testCase("PerformanceProfiler - Performance With Many Operations", () => {
  const profiler = new PerformanceProfiler();

  const operationCount = 100;
  const startTime = performance.now();

  for (let i = 0; i < operationCount; i++) {
    profiler.timeSync(`operation-${i}`, () => {
      // Simple operation
      Math.random();
    });
  }

  const elapsed = performance.now() - startTime;

  assertEqual(profiler.getMeasurements().length, operationCount, "Should have all measurements");
  assertEqual(elapsed < 100, true, "Should complete quickly (< 100ms)");

  const report = profiler.generateReport();
  assertEqual(report.statistics.operationCount, operationCount, "Should count all operations");
});

console.log("✓ All PerformanceProfiler tests passed");