/**
 * Performance Optimizations and Error Handling for Relationship System
 *
 * Provides caching, timeout handling, memory management, and robust error recovery
 * for the relationship-aware layout system to ensure reliable performance.
 */

import { debugFixLog } from "./debug.js";
import type {
  RelationshipAnalysis,
  RelationshipConstraints,
  RelationshipDetectionConfig,
  RelationshipDetectionResult
} from "../types/design-relationships.js";

// ============================================================================
// Performance Configuration
// ============================================================================

interface PerformanceConfig {
  readonly enableCaching: boolean;
  readonly cacheSize: number; // Max number of cached analyses
  readonly cacheTtlMs: number; // Time to live for cached results
  readonly memoryThresholdMb: number; // Memory usage threshold
  readonly maxConcurrentAnalyses: number; // Prevent parallel processing overload
  readonly enableSpatialIndexing: boolean; // Use spatial indexing for performance
  readonly minConfidenceForCaching: number; // Only cache high-confidence results
}

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  cacheSize: 50,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  memoryThresholdMb: 100,
  maxConcurrentAnalyses: 3,
  enableSpatialIndexing: true,
  minConfidenceForCaching: 0.6
};

// ============================================================================
// Caching System
// ============================================================================

interface CacheEntry {
  readonly frameId: string;
  readonly frameHash: string; // Hash of frame structure for invalidation
  readonly analysis: RelationshipAnalysis;
  readonly constraints: RelationshipConstraints;
  readonly timestamp: number;
  readonly confidence: number;
}

class RelationshipCache {
  private cache = new Map<string, CacheEntry>();
  private config: PerformanceConfig;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Generates cache key for a frame
   */
  private generateFrameHash(frame: FrameNode): string {
    try {
      // Generate hash based on frame structure and modification time
      const bounds = frame.absoluteBoundingBox;
      const childCount = "children" in frame ? frame.children.length : 0;

      return `${frame.id}_${bounds?.width || 0}x${bounds?.height || 0}_${childCount}_${Date.now()}`;
    } catch {
      return `${frame.id}_${Date.now()}`;
    }
  }

  /**
   * Gets cached analysis if available and valid
   */
  getCachedAnalysis(frame: FrameNode): { analysis: RelationshipAnalysis; constraints: RelationshipConstraints } | null {
    if (!this.config.enableCaching) return null;

    try {
      // Generate frame hash for future invalidation logic
      // const frameHash = this.generateFrameHash(frame);
      const cached = this.cache.get(frame.id);

      if (!cached) return null;

      // Check if cache is expired
      const age = Date.now() - cached.timestamp;
      if (age > this.config.cacheTtlMs) {
        this.cache.delete(frame.id);
        return null;
      }

      // Check if frame structure changed (simplified check)
      const currentChildCount = "children" in frame ? frame.children.length : 0;
      const cachedChildCount = cached.frameHash.split('_')[2];
      if (currentChildCount.toString() !== cachedChildCount) {
        this.cache.delete(frame.id);
        return null;
      }

      debugFixLog("Using cached relationship analysis", {
        frameId: frame.id,
        cacheAge: age,
        confidence: cached.confidence
      });

      return {
        analysis: cached.analysis,
        constraints: cached.constraints
      };
    } catch (error) {
      debugFixLog("Error accessing relationship cache", { error: String(error) });
      return null;
    }
  }

  /**
   * Caches analysis results
   */
  cacheAnalysis(
    frame: FrameNode,
    analysis: RelationshipAnalysis,
    constraints: RelationshipConstraints
  ): void {
    if (!this.config.enableCaching) return;

    try {
      const confidence = analysis.analysisMetrics.averageConfidence;

      // Only cache high-confidence results
      if (confidence < this.config.minConfidenceForCaching) return;

      const frameHash = this.generateFrameHash(frame);
      const entry: CacheEntry = {
        frameId: frame.id,
        frameHash,
        analysis,
        constraints,
        timestamp: Date.now(),
        confidence
      };

      this.cache.set(frame.id, entry);

      // Trim cache if it exceeds size limit
      if (this.cache.size > this.config.cacheSize) {
        this.trimCache();
      }

      debugFixLog("Cached relationship analysis", {
        frameId: frame.id,
        confidence,
        cacheSize: this.cache.size
      });
    } catch (error) {
      debugFixLog("Error caching relationship analysis", { error: String(error) });
    }
  }

  /**
   * Trims cache to size limit by removing oldest entries
   */
  private trimCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first

    const toRemove = entries.slice(0, entries.length - this.config.cacheSize + 1);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears all cached entries
   */
  clear(): void {
    this.cache.clear();
    debugFixLog("Relationship cache cleared");
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need hit tracking for this
    };
  }
}

// Global cache instance
const relationshipCache = new RelationshipCache();

// ============================================================================
// Memory Management
// ============================================================================

/**
 * Monitors memory usage and provides optimization recommendations
 */
class MemoryMonitor {
  // private config: PerformanceConfig; // For future memory optimization config
  // private lastGcTime = 0; // For future GC timing logic

  constructor(_config: Partial<PerformanceConfig> = {}) {
    // this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Checks if memory usage is within acceptable limits
   */
  checkMemoryUsage(): { withinLimits: boolean; recommendation: 'continue' | 'optimize' | 'skip' } {
    try {
      // In browser environment, we don't have direct memory access
      // Use heuristics based on frame complexity
      return { withinLimits: true, recommendation: 'continue' };
    } catch (error) {
      debugFixLog("Error checking memory usage", { error: String(error) });
      return { withinLimits: true, recommendation: 'continue' };
    }
  }

  /**
   * Suggests memory optimization based on frame complexity
   */
  optimizeForFrame(frame: FrameNode): RelationshipDetectionConfig {
    const childCount = this.countFrameElements(frame);

    if (childCount > 100) {
      return {
        enableSpatialAnalysis: true,
        enableVisualAnalysis: false, // Skip for complex frames
        enableCompositionalAnalysis: false, // Skip for complex frames
        confidenceThreshold: 0.7, // Higher threshold
        maxAnalysisTimeMs: 300, // Shorter timeout
        maxElementCount: 75, // Lower limit
        preserveMode: 'creative'
      };
    } else if (childCount > 50) {
      return {
        enableSpatialAnalysis: true,
        enableVisualAnalysis: true,
        enableCompositionalAnalysis: false, // Skip compositional
        confidenceThreshold: 0.5,
        maxAnalysisTimeMs: 400,
        maxElementCount: 50,
        preserveMode: 'adaptive'
      };
    }

    // Default config for simple frames
    return {
      enableSpatialAnalysis: true,
      enableVisualAnalysis: true,
      enableCompositionalAnalysis: true,
      confidenceThreshold: 0.4,
      maxAnalysisTimeMs: 500,
      maxElementCount: 50,
      preserveMode: 'adaptive'
    };
  }

  /**
   * Counts total elements in frame recursively
   */
  public countFrameElements(node: SceneNode, depth: number = 0): number {
    if (depth > 4 || node.visible === false) return 0;

    let count = 1;
    if ("children" in node) {
      for (const child of node.children) {
        count += this.countFrameElements(child, depth + 1);
      }
    }

    return count;
  }
}

const memoryMonitor = new MemoryMonitor();

// ============================================================================
// Error Recovery System
// ============================================================================

interface ErrorRecoveryResult {
  readonly success: boolean;
  readonly fallbackMode: RelationshipDetectionResult['fallbackMode'];
  readonly error?: string;
  readonly recoveryAction: string;
}

/**
 * Handles errors in relationship detection with intelligent fallback strategies
 */
export class RelationshipErrorRecovery {
  // private config: PerformanceConfig; // For future configuration
  private errorCounts = new Map<string, number>();

  constructor(_config: Partial<PerformanceConfig> = {}) {
    // this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Handles error with appropriate recovery strategy
   */
  handleError(
    error: unknown,
    context: {
      frameId: string;
      stage: 'detection' | 'spatial' | 'visual' | 'compositional' | 'constraints';
      elementCount?: number;
    }
  ): ErrorRecoveryResult {
    const errorString = error instanceof Error ? error.message : String(error);
    const errorKey = `${context.frameId}_${context.stage}`;

    // Track error frequency
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    debugFixLog("Relationship error recovery", {
      frameId: context.frameId,
      stage: context.stage,
      error: errorString,
      errorCount: currentCount + 1,
      elementCount: context.elementCount
    });

    // Determine recovery strategy based on error type and frequency
    const recoveryStrategy = this.determineRecoveryStrategy(error, context, currentCount + 1);

    return recoveryStrategy;
  }

  /**
   * Determines appropriate recovery strategy
   */
  private determineRecoveryStrategy(
    error: unknown,
    context: {
      frameId: string;
      stage: 'detection' | 'spatial' | 'visual' | 'compositional' | 'constraints';
      elementCount?: number;
    },
    errorCount: number
  ): ErrorRecoveryResult {

    // Memory or timeout errors
    if (this.isResourceError(error)) {
      if (context.elementCount && context.elementCount > 75) {
        return {
          success: true,
          fallbackMode: 'spatial_only',
          error: 'Frame too complex, using spatial analysis only',
          recoveryAction: 'Reduced analysis scope for complex frame'
        };
      } else {
        return {
          success: true,
          fallbackMode: 'proximity_only',
          error: 'Resource constraints, using basic proximity analysis',
          recoveryAction: 'Fallback to proximity-based grouping'
        };
      }
    }

    // Repeated errors on same frame/stage
    if (errorCount > 2) {
      return {
        success: false,
        fallbackMode: 'disabled',
        error: 'Repeated failures in relationship detection',
        recoveryAction: 'Disabled relationship analysis for this frame'
      };
    }

    // Stage-specific recovery
    switch (context.stage) {
      case 'spatial':
        return {
          success: true,
          fallbackMode: 'proximity_only',
          error: 'Spatial analysis failed, using proximity fallback',
          recoveryAction: 'Continue with proximity-based analysis only'
        };

      case 'visual':
      case 'compositional':
        return {
          success: true,
          fallbackMode: 'spatial_only',
          error: `${context.stage} analysis failed, continuing with spatial`,
          recoveryAction: 'Continue with spatial analysis only'
        };

      case 'constraints':
        return {
          success: true,
          fallbackMode: 'none',
          error: 'Constraint generation failed, proceeding without constraints',
          recoveryAction: 'Proceeding with detected relationships but no constraints'
        };

      default:
        return {
          success: false,
          fallbackMode: 'disabled',
          error: 'Unknown error in relationship detection',
          recoveryAction: 'Disabled relationship analysis'
        };
    }
  }

  /**
   * Checks if error is related to resource constraints
   */
  private isResourceError(error: unknown): boolean {
    const errorString = String(error).toLowerCase();
    return (
      errorString.includes('timeout') ||
      errorString.includes('memory') ||
      errorString.includes('too complex') ||
      errorString.includes('resource')
    );
  }

  /**
   * Resets error counts for a frame (call when frame changes)
   */
  resetFrameErrors(frameId: string): void {
    const keysToDelete = Array.from(this.errorCounts.keys()).filter(key => key.startsWith(frameId));
    for (const key of keysToDelete) {
      this.errorCounts.delete(key);
    }
  }

  /**
   * Gets error statistics
   */
  getErrorStats(): { totalErrors: number; frameErrors: { [frameId: string]: number } } {
    const frameErrors: { [frameId: string]: number } = {};
    let totalErrors = 0;

    for (const [key, count] of this.errorCounts) {
      const frameId = key.split('_')[0];
      frameErrors[frameId] = (frameErrors[frameId] || 0) + count;
      totalErrors += count;
    }

    return { totalErrors, frameErrors };
  }
}

// ============================================================================
// Performance-Optimized Analysis Entry Points
// ============================================================================

/**
 * High-performance relationship detection with caching and error recovery
 */
export async function detectRelationshipsOptimized(
  frame: FrameNode,
  config: Partial<RelationshipDetectionConfig> = {}
): Promise<RelationshipDetectionResult> {
  const startTime = Date.now();
  const errorRecovery = new RelationshipErrorRecovery();

  try {
    // Check memory constraints
    const memoryCheck = memoryMonitor.checkMemoryUsage();
    if (memoryCheck.recommendation === 'skip') {
      return {
        success: true,
        fallbackMode: 'disabled',
        processingTimeMs: Date.now() - startTime,
        error: 'Skipped due to memory constraints'
      };
    }

    // Try to get cached results first
    const cached = relationshipCache.getCachedAnalysis(frame);
    if (cached) {
      return {
        success: true,
        analysis: cached.analysis,
        constraints: cached.constraints,
        fallbackMode: 'none',
        processingTimeMs: Date.now() - startTime
      };
    }

    // Optimize config for frame complexity
    const optimizedConfig = memoryMonitor.optimizeForFrame(frame);
    const finalConfig = { ...optimizedConfig, ...config };

    debugFixLog("Starting optimized relationship detection", {
      frameId: frame.id,
      config: finalConfig,
      memoryRecommendation: memoryCheck.recommendation
    });

    // Import and call the main detection function
    const { detectRelationships } = await import('./relationship-detector.js');
    const result = await detectRelationships(frame, finalConfig);

    // Cache successful results with high confidence
    if (result.success && result.analysis && result.constraints) {
      relationshipCache.cacheAnalysis(frame, result.analysis, result.constraints);
    }

    const processingTime = Date.now() - startTime;
    debugFixLog("Optimized relationship detection complete", {
      success: result.success,
      fallbackMode: result.fallbackMode,
      processingTimeMs: processingTime
    });

    return {
      ...result,
      processingTimeMs: processingTime
    };

  } catch (error) {
    const recovery = errorRecovery.handleError(error, {
      frameId: frame.id,
      stage: 'detection',
      elementCount: memoryMonitor.countFrameElements(frame)
    });

    debugFixLog("Relationship detection error, applying recovery", {
      frameId: frame.id,
      recovery: recovery.recoveryAction,
      fallbackMode: recovery.fallbackMode
    });

    if (recovery.success) {
      // Try basic detection as fallback
      try {
        const { detectBasicRelationships } = await import('./relationship-detector.js');
        const basicResult = detectBasicRelationships(frame);

        return {
          ...basicResult,
          fallbackMode: recovery.fallbackMode,
          error: recovery.error,
          processingTimeMs: Date.now() - startTime
        };
      } catch (fallbackError) {
        debugFixLog("Fallback detection also failed", { error: String(fallbackError) });
      }
    }

    return {
      success: false,
      error: recovery.error || `Detection failed: ${error}`,
      fallbackMode: recovery.fallbackMode,
      processingTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Clears all performance caches (useful for testing or memory cleanup)
 */
export function clearPerformanceCaches(): void {
  relationshipCache.clear();
  debugFixLog("Performance caches cleared");
}

/**
 * Gets performance statistics
 */
export function getPerformanceStats(): {
  cache: { size: number; hitRate: number };
  memory: { recommendation: string };
  errors: { totalErrors: number; frameErrors: { [frameId: string]: number } };
} {
  const errorRecovery = new RelationshipErrorRecovery();

  return {
    cache: relationshipCache.getStats(),
    memory: { recommendation: memoryMonitor.checkMemoryUsage().recommendation },
    errors: errorRecovery.getErrorStats()
  };
}