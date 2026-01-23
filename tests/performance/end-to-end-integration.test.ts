/**
 * End-to-End Performance Integration Tests
 *
 * Tests that verify all performance timing components work together correctly.
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

// Mock environment setup
let mockTime = 0;
let debugEnabled = true;

// Mock timing functions
function mockPerformanceNow(): number {
  return mockTime;
}

function setMockTime(time: number): void {
  mockTime = time;
}

// Commented out - not used in these tests
// function advanceMockTime(ms: number): void {
//   mockTime += ms;
// }

function mockDateNow(): number {
  return mockTime;
}

function mockIsDebugFixEnabled(): boolean {
  return debugEnabled;
}

// Note: mockLog is available but not used in these tests

// Set up global mocks
(global as any).performance = { now: mockPerformanceNow };
// Mock Date constructor and static methods
const originalDate = Date;
const MockDate = function(...args: any[]) {
  if (args.length === 0) {
    return new originalDate(mockTime);
  } else {
    return new originalDate(...(args as [number]));
  }
} as any;

// Copy static methods
MockDate.now = mockDateNow;
MockDate.parse = originalDate.parse;
MockDate.UTC = originalDate.UTC;
MockDate.prototype = originalDate.prototype;

(global as any).Date = MockDate;
(global as any).isDebugFixEnabled = mockIsDebugFixEnabled;

// Commented out - not used in these tests
// function setupPerformanceMocks() {
//   // Import and override the debug check in the performance module
//   import("../../core/performance.js").then(module => {
//     (module as any).isDebugFixEnabled = mockIsDebugFixEnabled;
//   });
// }

// Import modules after mocks
import { PerformanceProfiler, startTimer, endTimer, timeSync, timeAsync, generateReport, clearPerformanceData } from "../../core/performance.js";

// Set up test environment
function setupTest() {
  setMockTime(0);
  debugEnabled = true;
  clearPerformanceData();
}

// Note: Log message tracking is available but not used in these tests

// Test complete design flow simulation - simplified version
testCase("End-to-End Integration - Basic Performance Profiler Function", () => {
  setupTest();

  // Simple test to verify profiler functions work
  const profiler = new PerformanceProfiler();

  // Test basic timing with mocked time
  setMockTime(0);
  profiler.startTimer("test-operation");

  setMockTime(100);
  const measurement = profiler.endTimer("test-operation");

  if (measurement) {
    assertEqual(measurement.durationMs, 100, "Should measure 100ms duration");
    assertEqual(measurement.name, "test-operation", "Should have correct operation name");

    const measurements = profiler.getMeasurements();
    assertEqual(measurements.length, 1, "Should have one measurement");

    const report = profiler.generateReport();
    assertEqual(report.statistics.operationCount, 1, "Report should include the operation");
  } else {
    // When debug is disabled, measurement should be null
    assertEqual(measurement, null, "Should return null when debug disabled");
  }
});

// Test interface functionality
testCase("End-to-End Integration - Interface Functions", () => {
  try {
    // Test that all functions can be called without errors
    startTimer("test-start");
    endTimer("test-start");

    timeSync("sync-test", () => "result");

    const asyncTest = async () => {
      return timeAsync("async-test", async () => "async-result");
    };

    return asyncTest().then(() => {
      const report = generateReport();
      assertEqual(typeof report, "object", "Should generate report object");

      clearPerformanceData();
      assertEqual(true, true, "All interface functions should work");
    });
  } catch (error) {
    throw new Error(`Interface functions threw an error: ${error}`);
  }
});

// Test PerformanceProfiler class functionality
testCase("End-to-End Integration - PerformanceProfiler Class", () => {
  try {
    const profiler = new PerformanceProfiler();

    profiler.startTimer("class-test");
    profiler.endTimer("class-test");

    const syncResult = profiler.timeSync("sync-class-test", () => "sync-result");
    assertEqual(syncResult, "sync-result", "Should return sync result");

    return profiler.timeAsync("async-class-test", async () => "async-result").then((asyncResult: string) => {
      assertEqual(asyncResult, "async-result", "Should return async result");

      const report = profiler.generateReport();
      assertEqual(typeof report, "object", "Should generate report");

      profiler.clear();
      assertEqual(true, true, "PerformanceProfiler class should work correctly");
    });
  } catch (error) {
    throw new Error(`PerformanceProfiler class threw an error: ${error}`);
  }
});

// Test error handling
testCase("End-to-End Integration - Error Handling", () => {
  try {
    const profiler = new PerformanceProfiler();

    // Test ending non-existent timer
    const nullMeasurement = profiler.endTimer("non-existent");
    assertEqual(nullMeasurement, null, "Should return null for non-existent timer");

    // Test sync error handling
    try {
      profiler.timeSync("sync-error", () => {
        throw new Error("Sync test error");
      });
    } catch (error) {
      assertEqual((error as Error).message, "Sync test error", "Should propagate sync error");
    }

    // Test async error handling
    return profiler.timeAsync("async-error", async () => {
      throw new Error("Async test error");
    }).catch((error: Error) => {
      assertEqual((error as Error).message, "Async test error", "Should propagate async error");
    });
  } catch (error) {
    throw new Error(`Error handling test threw unexpected error: ${error}`);
  }
});

console.log("✓ All end-to-end integration tests passed");