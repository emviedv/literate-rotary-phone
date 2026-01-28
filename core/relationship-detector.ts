/**
 * Main Relationship Detection Orchestrator
 *
 * Coordinates the complete relationship-aware analysis pipeline:
 * - Spatial relationship detection (anchors, flow, alignment, proximity)
 * - Visual relationship analysis (hierarchy, weight, contrast, scale)
 * - Compositional relationship analysis (balance, tension, breathing room)
 * - Constraint generation for AI consumption
 */

import { debugFixLog } from "./debug.js";
import { analyzeSpatialRelationships } from "./relationship-spatial-analyzer.js";
import { analyzeVisualRelationships } from "./relationship-visual-analyzer.js";
import { analyzeCompositionalRelationships } from "./relationship-compositional-analyzer.js";
import { generateRelationshipConstraints } from "./relationship-constraint-generator.js";
import type {
  RelationshipAnalysis,
  RelationshipConstraints,
  RelationshipDetectionConfig,
  RelationshipDetectionResult,
  SpatialRelationship,
  VisualRelationship,
  CompositionalRelationship,
  ElementVisualProperties
} from "../types/design-relationships.js";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DETECTION_CONFIG: RelationshipDetectionConfig = {
  enableSpatialAnalysis: true,
  enableVisualAnalysis: true,
  enableCompositionalAnalysis: true,
  confidenceThreshold: 0.4,
  maxAnalysisTimeMs: 500, // 500ms timeout to prevent pipeline blocking
  maxElementCount: 50, // Skip analysis for overly complex frames
  preserveMode: 'adaptive' // Balance between preservation and adaptation
};

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Performs complete relationship detection analysis on a frame.
 * This is the main entry point for the relationship-aware layout system.
 */
export async function detectRelationships(
  frame: FrameNode,
  config: Partial<RelationshipDetectionConfig> = {}
): Promise<RelationshipDetectionResult> {
  const fullConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
  const startTime = Date.now();

  debugFixLog("Starting relationship detection", {
    frameId: frame.id,
    frameName: frame.name,
    enableSpatial: fullConfig.enableSpatialAnalysis,
    enableVisual: fullConfig.enableVisualAnalysis,
    enableCompositional: fullConfig.enableCompositionalAnalysis,
    timeout: fullConfig.maxAnalysisTimeMs
  });

  try {
    // Quick validation checks
    const validation = validateFrameForAnalysis(frame, fullConfig);
    if (!validation.isValid) {
      return {
        success: true, // Still successful, just skipped
        fallbackMode: validation.fallbackMode,
        processingTimeMs: Date.now() - startTime,
        error: validation.reason
      };
    }

    // Create timeout promise for safety
    const timeoutPromise = new Promise<RelationshipDetectionResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          error: "Relationship detection timed out",
          fallbackMode: 'disabled',
          processingTimeMs: fullConfig.maxAnalysisTimeMs
        });
      }, fullConfig.maxAnalysisTimeMs);
    });

    // Main analysis promise
    const analysisPromise = performCompleteAnalysis(frame, fullConfig, startTime);

    // Race between analysis and timeout
    return await Promise.race([analysisPromise, timeoutPromise]);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    debugFixLog("Error in relationship detection", { error: String(error), processingTime });

    return {
      success: false,
      error: `Relationship detection failed: ${error}`,
      fallbackMode: 'disabled',
      processingTimeMs: processingTime
    };
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates frame for relationship analysis
 */
function validateFrameForAnalysis(
  frame: FrameNode,
  config: RelationshipDetectionConfig
): { isValid: boolean; reason?: string; fallbackMode: RelationshipDetectionResult['fallbackMode'] } {

  // Check if frame has absolute bounds
  if (!frame.absoluteBoundingBox) {
    return {
      isValid: false,
      reason: "Frame missing absolute bounds",
      fallbackMode: 'disabled'
    };
  }

  // Count visible children for complexity check
  const elementCount = countVisibleElements(frame);

  if (elementCount < 2) {
    return {
      isValid: false,
      reason: "Insufficient elements for relationship analysis",
      fallbackMode: 'disabled'
    };
  }

  if (elementCount > config.maxElementCount) {
    debugFixLog("Frame too complex for full analysis", { elementCount, maxAllowed: config.maxElementCount });

    // For very complex frames, fall back to spatial-only analysis
    if (elementCount > config.maxElementCount * 1.5) {
      return {
        isValid: false,
        reason: "Frame too complex for any relationship analysis",
        fallbackMode: 'proximity_only'
      };
    } else {
      // Partial analysis mode - spatial only
      return {
        isValid: true, // We'll handle this in the analysis function
        fallbackMode: 'spatial_only'
      };
    }
  }

  return { isValid: true, fallbackMode: 'none' };
}

/**
 * Counts visible elements in a frame recursively
 */
function countVisibleElements(node: SceneNode, depth: number = 0): number {
  if (depth > 4 || node.visible === false) return 0;

  let count = 1; // Count this node

  if ("children" in node) {
    for (const child of node.children) {
      count += countVisibleElements(child, depth + 1);
    }
  }

  return count;
}

// ============================================================================
// Complete Analysis Pipeline
// ============================================================================

/**
 * Performs the complete relationship analysis pipeline
 */
async function performCompleteAnalysis(
  frame: FrameNode,
  config: RelationshipDetectionConfig,
  startTime: number
): Promise<RelationshipDetectionResult> {

  const analysis: {
    frameId: string;
    analysisTimestamp: number;
    spatialRelationships: SpatialRelationship[];
    visualRelationships: VisualRelationship[];
    compositionalRelationships: CompositionalRelationship[];
    elementProperties: ElementVisualProperties[];
    analysisMetrics: {
      processingTimeMs: number;
      elementCount: number;
      relationshipCount: number;
      averageConfidence: number;
    };
  } = {
    frameId: frame.id,
    analysisTimestamp: Date.now(),
    spatialRelationships: [],
    visualRelationships: [],
    compositionalRelationships: [],
    elementProperties: [],
    analysisMetrics: {
      processingTimeMs: 0,
      elementCount: 0,
      relationshipCount: 0,
      averageConfidence: 0
    }
  };

  let fallbackMode: RelationshipDetectionResult['fallbackMode'] = 'none';

  try {
    // Stage 1: Spatial relationship analysis
    if (config.enableSpatialAnalysis) {
      try {
        analysis.spatialRelationships = analyzeSpatialRelationships(frame);
        debugFixLog("Spatial analysis complete", {
          relationships: analysis.spatialRelationships.length
        });
      } catch (error) {
        debugFixLog("Spatial analysis failed, continuing without", { error: String(error) });
        fallbackMode = 'spatial_only'; // Actually means "without spatial"
      }
    }

    // Stage 2: Visual relationship analysis (if not too complex)
    const elementCount = countVisibleElements(frame);
    if (config.enableVisualAnalysis && elementCount <= config.maxElementCount) {
      try {
        analysis.visualRelationships = analyzeVisualRelationships(frame);
        debugFixLog("Visual analysis complete", {
          relationships: analysis.visualRelationships.length
        });
      } catch (error) {
        debugFixLog("Visual analysis failed, continuing without", { error: String(error) });
        if (fallbackMode === 'none') fallbackMode = 'spatial_only';
      }
    }

    // Stage 3: Compositional relationship analysis (if not too complex)
    if (config.enableCompositionalAnalysis && elementCount <= config.maxElementCount) {
      try {
        analysis.compositionalRelationships = analyzeCompositionalRelationships(frame);
        debugFixLog("Compositional analysis complete", {
          relationships: analysis.compositionalRelationships.length
        });
      } catch (error) {
        debugFixLog("Compositional analysis failed, continuing without", { error: String(error) });
        if (fallbackMode === 'none') fallbackMode = 'spatial_only';
      }
    }

    // Calculate final metrics
    const totalRelationships = analysis.spatialRelationships.length +
                              analysis.visualRelationships.length +
                              analysis.compositionalRelationships.length;

    const allConfidences = [
      ...analysis.spatialRelationships.map(r => r.confidence),
      ...analysis.visualRelationships.map(r => r.confidence),
      ...analysis.compositionalRelationships.map(r => r.confidence)
    ];

    const averageConfidence = allConfidences.length > 0
      ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length
      : 0;

    analysis.analysisMetrics = {
      processingTimeMs: Date.now() - startTime,
      elementCount,
      relationshipCount: totalRelationships,
      averageConfidence
    };

    // Stage 4: Generate constraints if we have relationships
    let constraints: RelationshipConstraints | undefined;

    if (totalRelationships > 0) {
      try {
        constraints = generateRelationshipConstraints(analysis, {
          adaptationMode: config.preserveMode === 'strict' ? 'preserve' :
                         config.preserveMode === 'adaptive' ? 'adapt' : 'simplify'
        });
        debugFixLog("Constraint generation complete", {
          constraints: constraints.constraints.length,
          criticalConstraints: constraints.adaptationGuidance.criticalConstraintCount
        });
      } catch (error) {
        debugFixLog("Constraint generation failed", { error: String(error) });
        // Continue without constraints rather than failing entirely
      }
    }

    // Filter constraints by confidence threshold
    if (constraints) {
      constraints = {
        ...constraints,
        constraints: constraints.constraints.filter(c => c.confidence >= config.confidenceThreshold)
      };
    }

    const finalProcessingTime = Date.now() - startTime;

    debugFixLog("Relationship detection complete", {
      totalRelationships,
      constraints: constraints?.constraints.length || 0,
      averageConfidence,
      processingTimeMs: finalProcessingTime,
      fallbackMode
    });

    return {
      success: true,
      analysis,
      constraints,
      fallbackMode,
      processingTimeMs: finalProcessingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    debugFixLog("Error in analysis pipeline", { error: String(error), processingTime });

    return {
      success: false,
      error: `Analysis pipeline failed: ${error}`,
      fallbackMode: 'disabled',
      processingTimeMs: processingTime
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick relationship detection for simple cases (used as fallback)
 */
export function detectBasicRelationships(frame: FrameNode): RelationshipDetectionResult {
  const startTime = Date.now();

  try {
    // Just do spatial analysis as a minimal fallback
    const spatialRelationships = analyzeSpatialRelationships(frame, {
      confidenceThreshold: 0.6, // Higher threshold for basic mode
      anchorDetectionThreshold: 0.5
    });

    if (spatialRelationships.length > 0) {
      const analysis: RelationshipAnalysis = {
        frameId: frame.id,
        analysisTimestamp: Date.now(),
        spatialRelationships,
        visualRelationships: [],
        compositionalRelationships: [],
        elementProperties: [],
        analysisMetrics: {
          processingTimeMs: Date.now() - startTime,
          elementCount: countVisibleElements(frame),
          relationshipCount: spatialRelationships.length,
          averageConfidence: spatialRelationships.reduce((sum, r) => sum + r.confidence, 0) / spatialRelationships.length
        }
      };

      const constraints = generateRelationshipConstraints(analysis, {
        adaptationMode: 'simplify'
      });

      return {
        success: true,
        analysis,
        constraints,
        fallbackMode: 'spatial_only',
        processingTimeMs: Date.now() - startTime
      };
    }

    return {
      success: true,
      fallbackMode: 'disabled',
      processingTimeMs: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: `Basic relationship detection failed: ${error}`,
      fallbackMode: 'disabled',
      processingTimeMs: Date.now() - startTime
    };
  }
}