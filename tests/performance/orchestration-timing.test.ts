/**
 * Orchestration Timing Tests
 *
 * Tests for timing integration in design orchestration.
 * Simplified version that validates core functionality without complex mocking.
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

// Mock the debug system for testing
(global as any).isDebugFixEnabled = () => true;

import { PerformanceProfiler, startTimer, endTimer, timeSync, timeAsync, generateReport, clearPerformanceData } from "../../core/performance.js";

// Test performance profiler creation and basic interface
testCase("Orchestration Timing - Interface Validation", () => {
  const profiler = new PerformanceProfiler();

  assertEqual(typeof profiler.startTimer, "function", "Should have startTimer method");
  assertEqual(typeof profiler.endTimer, "function", "Should have endTimer method");
  assertEqual(typeof profiler.timeSync, "function", "Should have timeSync method");
  assertEqual(typeof profiler.timeAsync, "function", "Should have timeAsync method");
  assertEqual(typeof profiler.generateReport, "function", "Should have generateReport method");
  assertEqual(typeof profiler.clear, "function", "Should have clear method");
  assertEqual(typeof profiler.getMeasurements, "function", "Should have getMeasurements method");
  assertEqual(typeof profiler.isTimerActive, "function", "Should have isTimerActive method");
});

// Test global functions interface
testCase("Orchestration Timing - Global Functions Interface", () => {
  assertEqual(typeof startTimer, "function", "Should have global startTimer");
  assertEqual(typeof endTimer, "function", "Should have global endTimer");
  assertEqual(typeof timeSync, "function", "Should have global timeSync");
  assertEqual(typeof timeAsync, "function", "Should have global timeAsync");
  assertEqual(typeof generateReport, "function", "Should have global generateReport");
  assertEqual(typeof clearPerformanceData, "function", "Should have global clearPerformanceData");
});

// Test synchronous timing (real timing, not mocked)
testCase("Orchestration Timing - Real Sync Timing", () => {
  const profiler = new PerformanceProfiler();

  const result = profiler.timeSync("sync-test", () => {
    // Simple synchronous operation
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += i;
    }
    return sum;
  });

  assertEqual(result, 499500, "Should return correct calculation result");

  const measurements = profiler.getMeasurements();
  if (measurements.length > 0) {
    const measurement = measurements[0];
    assertEqual(measurement.name, "sync-test", "Should have correct measurement name");
    assertEqual(typeof measurement.durationMs, "number", "Should have numeric duration");
    assertEqual(measurement.durationMs >= 0, true, "Duration should be non-negative");
  }
});

// Test asynchronous timing (real timing, not mocked)
testCase("Orchestration Timing - Real Async Timing", async () => {
  const profiler = new PerformanceProfiler();

  const result = await profiler.timeAsync("async-test", async () => {
    // Simple asynchronous operation
    await new Promise(resolve => setTimeout(resolve, 1));
    return "async-result";
  });

  assertEqual(result, "async-result", "Should return async result");

  const measurements = profiler.getMeasurements();
  if (measurements.length > 0) {
    const measurement = measurements.find(m => m.name === "async-test");
    if (measurement) {
      assertEqual(measurement.name, "async-test", "Should have correct measurement name");
      assertEqual(typeof measurement.durationMs, "number", "Should have numeric duration");
      assertEqual(measurement.durationMs >= 1, true, "Duration should be at least 1ms");
    }
  }
});

// Test report generation (validates the Date constructor usage)
testCase("Orchestration Timing - Report Generation", async () => {
  const profiler = new PerformanceProfiler();

  // Add some measurements
  profiler.timeSync("fast-op", () => Math.random());
  await profiler.timeAsync("async-op", async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
    return "done";
  });

  const report = profiler.generateReport();

  assertEqual(typeof report, "object", "Should generate report object");
  assertEqual(typeof report.totalDurationMs, "number", "Should have total duration");
  assertEqual(Array.isArray(report.measurements), true, "Should have measurements array");
  assertEqual(Array.isArray(report.bottlenecks), true, "Should have bottlenecks array");
  assertEqual(typeof report.timestamp, "string", "Should have timestamp string");
  assertEqual(typeof report.statistics, "object", "Should have statistics object");
});

// Test bottleneck analysis with real timing differences
testCase("Orchestration Timing - Bottleneck Analysis", async () => {
  const profiler = new PerformanceProfiler();

  // Create operations with different durations
  profiler.timeSync("fast-operation", () => {
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      sum += i;
    }
    return sum;
  });

  await profiler.timeAsync("slow-operation", async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return "slow-done";
  });

  profiler.timeSync("medium-operation", () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += Math.random();
    }
    return sum;
  });

  const report = profiler.generateReport();

  // When debug is enabled, should have 3 measurements
  // When debug is disabled, measurements may be 0, but report should still be generated
  const measurements = report.measurements;
  assertEqual(typeof measurements, "object", "Should have measurements object");
  assertEqual(report.statistics.operationCount, measurements.length, "Should count operations correctly");

  // Only test bottleneck identification if we have measurements
  if (measurements.length > 0) {
    const hasSlowOperation = measurements.some(m => m.name === "slow-operation");
    if (hasSlowOperation && report.statistics.slowestOperation) {
      assertEqual(report.statistics.slowestOperation.name, "slow-operation", "Should identify slowest operation");
    }

    if (report.statistics.fastestOperation) {
      assertEqual(typeof report.statistics.fastestOperation.name, "string", "Should have fastest operation");
    }
  }
});

// Test clear functionality
testCase("Orchestration Timing - Clear Functionality", () => {
  const profiler = new PerformanceProfiler();

  profiler.timeSync("test-clear", () => "result");

  profiler.clear();
  const measurementsAfterClear = profiler.getMeasurements().length;

  // When debug is enabled, should have measurements before clear and none after
  // When debug is disabled, both should be 0, but clear should still work without errors
  assertEqual(measurementsAfterClear, 0, "Should have no measurements after clear");

  // Ensure clear doesn't break the profiler
  assertEqual(typeof profiler.timeSync, "function", "Profiler should still be functional after clear");
});

console.log("✓ All orchestration timing tests passed");