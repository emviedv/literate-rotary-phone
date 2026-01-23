/**
 * Performance Profiling Infrastructure
 *
 * Provides comprehensive timing measurements with zero overhead when debugging is disabled.
 * Integrates with the existing debug system and supports nested timing operations.
 */

import { isDebugFixEnabled } from "./debug.js";

// Declare performance global for environments that have it
declare const performance: { now(): number } | undefined;

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Safe high-precision timing that works in both Node.js and Figma plugin environments.
 * Falls back to Date.now() if getHighPrecisionTime() is not available.
 */
function getHighPrecisionTime(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

// ============================================================================
// Types
// ============================================================================

export interface PerformanceTimer {
  /** Name identifier for this timer */
  readonly name: string;
  /** High-precision start timestamp */
  readonly startTime: number;
  /** Optional metadata for context */
  readonly metadata?: Record<string, unknown>;
  /** Parent timer for nested operations */
  readonly parent?: string;
}

export interface PerformanceMeasurement {
  /** Timer name */
  readonly name: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** ISO timestamp when measurement was taken */
  readonly timestamp: string;
  /** Optional metadata for context */
  readonly metadata?: Record<string, unknown>;
  /** Child measurements for nested operations */
  readonly children?: PerformanceMeasurement[];
  /** Parent timer name for nested operations */
  readonly parent?: string;
}

export interface PerformanceReport {
  /** Total execution time */
  readonly totalDurationMs: number;
  /** All measurements in chronological order */
  readonly measurements: PerformanceMeasurement[];
  /** Bottleneck analysis */
  readonly bottlenecks: BottleneckAnalysis[];
  /** Report generation timestamp */
  readonly timestamp: string;
  /** Performance statistics */
  readonly statistics: PerformanceStatistics;
}

export interface BottleneckAnalysis {
  /** Operation name */
  readonly operation: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Percentage of total execution time */
  readonly percentageOfTotal: number;
  /** Severity level */
  readonly severity: "low" | "medium" | "high" | "critical";
  /** Optimization recommendations */
  readonly recommendations: string[];
}

export interface PerformanceStatistics {
  /** Number of operations measured */
  readonly operationCount: number;
  /** Average operation duration */
  readonly averageDurationMs: number;
  /** Longest operation */
  readonly slowestOperation: { name: string; durationMs: number } | null;
  /** Fastest operation */
  readonly fastestOperation: { name: string; durationMs: number } | null;
  /** Operations taking > 1 second */
  readonly longOperations: Array<{ name: string; durationMs: number }>;
}

// ============================================================================
// Performance Profiler Class
// ============================================================================

export class PerformanceProfiler {
  private timers: Map<string, PerformanceTimer> = new Map();
  private measurements: PerformanceMeasurement[] = [];
  private sessionStartTime: number = Date.now();

  /**
   * Start timing an operation.
   * Has zero overhead when debugging is disabled.
   */
  startTimer(name: string, metadata?: Record<string, unknown>, parent?: string): void {
    if (!isDebugFixEnabled()) {
      return; // Zero overhead when debugging disabled
    }

    if (this.timers.has(name)) {
      // Timer already exists, end it first
      this.endTimer(name);
    }

    const timer: PerformanceTimer = {
      name,
      startTime: getHighPrecisionTime(),
      metadata,
      parent
    };

    this.timers.set(name, timer);
  }

  /**
   * End timing an operation and record the measurement.
   * Returns null when debugging is disabled to maintain zero overhead.
   */
  endTimer(name: string, metadata?: Record<string, unknown>): PerformanceMeasurement | null {
    if (!isDebugFixEnabled()) {
      return null; // Zero overhead when debugging disabled
    }

    const timer = this.timers.get(name);
    if (!timer) {
      return null;
    }

    const endTime = getHighPrecisionTime();
    const durationMs = Math.round((endTime - timer.startTime) * 100) / 100; // Round to 2 decimal places

    const measurement: PerformanceMeasurement = {
      name: timer.name,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: { ...timer.metadata, ...metadata },
      parent: timer.parent
    };

    this.measurements.push(measurement);
    this.timers.delete(name);

    return measurement;
  }

  /**
   * Time a synchronous operation with automatic cleanup.
   */
  timeSync<T>(name: string, operation: () => T, metadata?: Record<string, unknown>): T {
    if (!isDebugFixEnabled()) {
      return operation(); // Zero overhead when debugging disabled
    }

    this.startTimer(name, metadata);
    try {
      const result = operation();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name, { error: String(error) });
      throw error;
    }
  }

  /**
   * Time an asynchronous operation with automatic cleanup.
   */
  async timeAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!isDebugFixEnabled()) {
      return operation(); // Zero overhead when debugging disabled
    }

    this.startTimer(name, metadata);
    try {
      const result = await operation();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name, { error: String(error) });
      throw error;
    }
  }

  /**
   * Generate a comprehensive performance report.
   */
  generateReport(): PerformanceReport {
    if (!isDebugFixEnabled()) {
      // Return minimal report when debugging disabled
      return {
        totalDurationMs: 0,
        measurements: [],
        bottlenecks: [],
        timestamp: new Date().toISOString(),
        statistics: {
          operationCount: 0,
          averageDurationMs: 0,
          slowestOperation: null,
          fastestOperation: null,
          longOperations: []
        }
      };
    }

    const totalDurationMs = Date.now() - this.sessionStartTime;
    const bottlenecks = this.analyzeBottlenecks();
    const statistics = this.calculateStatistics();

    return {
      totalDurationMs,
      measurements: [...this.measurements], // Create copy
      bottlenecks,
      timestamp: new Date().toISOString(),
      statistics
    };
  }

  /**
   * Clear all timing data.
   */
  clear(): void {
    if (!isDebugFixEnabled()) {
      return; // Zero overhead when debugging disabled
    }

    this.timers.clear();
    this.measurements = [];
    this.sessionStartTime = Date.now();
  }

  /**
   * Get current measurements (for ongoing analysis).
   */
  getMeasurements(): PerformanceMeasurement[] {
    if (!isDebugFixEnabled()) {
      return [];
    }
    return [...this.measurements]; // Return copy
  }

  /**
   * Check if a timer is currently running.
   */
  isTimerActive(name: string): boolean {
    if (!isDebugFixEnabled()) {
      return false;
    }
    return this.timers.has(name);
  }

  // ============================================================================
  // Private Analysis Methods
  // ============================================================================

  private analyzeBottlenecks(): BottleneckAnalysis[] {
    if (this.measurements.length === 0) {
      return [];
    }

    const totalTime = this.measurements.reduce((sum, m) => sum + m.durationMs, 0);

    return this.measurements
      .map(measurement => {
        const percentageOfTotal = totalTime > 0 ? (measurement.durationMs / totalTime) * 100 : 0;

        let severity: BottleneckAnalysis["severity"] = "low";
        const recommendations: string[] = [];

        if (measurement.durationMs > 30000) {
          severity = "critical";
          recommendations.push("Operation exceeds 30s - consider breaking into smaller chunks");
          recommendations.push("Add progress indicators for better user experience");
        } else if (measurement.durationMs > 10000) {
          severity = "high";
          recommendations.push("Long operation - consider optimization or async processing");
          recommendations.push("Add status updates during execution");
        } else if (measurement.durationMs > 5000) {
          severity = "medium";
          recommendations.push("Consider caching or optimization opportunities");
        }

        if (percentageOfTotal > 50) {
          recommendations.push("Dominant operation - primary optimization target");
        }

        // Add operation-specific recommendations
        if (measurement.name.includes("ai") || measurement.name.includes("openai")) {
          recommendations.push("Consider request caching or batching for AI operations");
        }

        if (measurement.name.includes("export") || measurement.name.includes("image")) {
          recommendations.push("Consider image size optimization or quality adjustment");
        }

        if (measurement.name.includes("font")) {
          recommendations.push("Consider font preloading or caching strategies");
        }

        return {
          operation: measurement.name,
          durationMs: measurement.durationMs,
          percentageOfTotal: Math.round(percentageOfTotal * 100) / 100,
          severity,
          recommendations: recommendations.length > 0 ? recommendations : ["Operation performance is acceptable"]
        };
      })
      .filter(bottleneck => bottleneck.severity !== "low" || bottleneck.durationMs > 1000)
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10); // Top 10 bottlenecks
  }

  private calculateStatistics(): PerformanceStatistics {
    if (this.measurements.length === 0) {
      return {
        operationCount: 0,
        averageDurationMs: 0,
        slowestOperation: null,
        fastestOperation: null,
        longOperations: []
      };
    }

    const durations = this.measurements.map(m => m.durationMs);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    const sortedMeasurements = [...this.measurements].sort((a, b) => b.durationMs - a.durationMs);

    return {
      operationCount: this.measurements.length,
      averageDurationMs: Math.round((totalDuration / this.measurements.length) * 100) / 100,
      slowestOperation: {
        name: sortedMeasurements[0].name,
        durationMs: sortedMeasurements[0].durationMs
      },
      fastestOperation: {
        name: sortedMeasurements[sortedMeasurements.length - 1].name,
        durationMs: sortedMeasurements[sortedMeasurements.length - 1].durationMs
      },
      longOperations: sortedMeasurements
        .filter(m => m.durationMs > 1000)
        .slice(0, 5)
        .map(m => ({ name: m.name, durationMs: m.durationMs }))
    };
  }
}

// ============================================================================
// Global Instance
// ============================================================================

/** Global performance profiler instance */
export const globalProfiler = new PerformanceProfiler();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Start timing an operation using the global profiler.
 */
export function startTimer(name: string, metadata?: Record<string, unknown>, parent?: string): void {
  globalProfiler.startTimer(name, metadata, parent);
}

/**
 * End timing an operation using the global profiler.
 */
export function endTimer(name: string, metadata?: Record<string, unknown>): PerformanceMeasurement | null {
  return globalProfiler.endTimer(name, metadata);
}

/**
 * Time a synchronous operation using the global profiler.
 */
export function timeSync<T>(name: string, operation: () => T, metadata?: Record<string, unknown>): T {
  return globalProfiler.timeSync(name, operation, metadata);
}

/**
 * Time an asynchronous operation using the global profiler.
 */
export async function timeAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return globalProfiler.timeAsync(name, operation, metadata);
}

/**
 * Generate performance report using the global profiler.
 */
export function generateReport(): PerformanceReport {
  return globalProfiler.generateReport();
}

/**
 * Clear all performance data from the global profiler.
 */
export function clearPerformanceData(): void {
  globalProfiler.clear();
}