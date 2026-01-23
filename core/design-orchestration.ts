/**
 * Design Orchestration
 *
 * Three-stage flow coordinator for the "Design for TikTok" feature.
 * Manages the full pipeline from analysis to variant creation.
 */

import { debugFixLog } from "./debug.js";
import { tryExportFrameAsBase64 } from "./ai-image-export.js";
import { summarizeFrameEnhanced, type EnhancedFrameSummary } from "./ai-frame-summary.js";
import { requestFullDesignSpecs, requestStage3Evaluation } from "./design-ai-service.js";
import { requestFullDesignSpecsWithRelationships, requestStage3EvaluationWithRelationships } from "./design-ai-service-enhanced.js";
import { createDesignVariant, applyEvaluationAdjustments } from "./design-executor.js";
import {
  ensureDesignPage,
  createDesignContainer,
  positionVariantInContainer,
  sizeContainerToFit,
  navigateToDesign,
  addContainerLabel,
  removeDesignContainer
} from "./design-page-manager.js";
import { detectRelationshipsOptimized } from "./relationship-performance.js";
import type { DesignResult, DesignStatus } from "../types/design-types.js";
import type { RelationshipConstraints } from "../types/design-relationships.js";

declare const figma: PluginAPI;

// ============================================================================
// Types
// ============================================================================

type StatusCallback = (status: DesignStatus) => void;

interface OrchestrationOptions {
  /** Callback for status updates during the process */
  readonly onStatus?: StatusCallback;
  /** Whether to run Stage 3 evaluation (default: false for speed) */
  readonly runEvaluation?: boolean;
  /** API key for OpenAI */
  readonly apiKey: string;
}

// ============================================================================
// Main Orchestration Function
// ============================================================================

/**
 * Executes the full "Design for TikTok" flow.
 *
 * Three stages:
 * 1. Vision Analysis & Planning - AI sees the frame and creates a design plan
 * 2. Detailed Specification - AI outputs node-by-node positioning specs
 * 3. Execution & Evaluation - Apply changes and optionally verify visually
 */
export async function executeDesignFlow(
  sourceFrame: FrameNode,
  options: OrchestrationOptions
): Promise<DesignResult> {
  const startTime = Date.now();
  const { onStatus, runEvaluation = false, apiKey } = options;

  const stageDurations: {
    relationshipDetection?: number;
    stage1?: number;
    stage2?: number;
    stage3?: number;
    execution?: number;
  } = {};

  // Track font cache across operations
  const fontCache = new Set<string>();

  debugFixLog("Starting Design for TikTok flow", {
    sourceId: sourceFrame.id,
    sourceName: sourceFrame.name,
    sourceDimensions: `${sourceFrame.width}x${sourceFrame.height}`,
    runEvaluation
  });

  // ===========================================================================
  // Stage 0: Export frame image and build node tree
  // ===========================================================================

  onStatus?.({ stage: "analyzing", message: "Preparing frame for analysis..." });

  const imageBase64 = await tryExportFrameAsBase64(sourceFrame);
  if (!imageBase64) {
    return {
      success: false,
      error: "Failed to export frame image for AI analysis",
      totalDurationMs: Date.now() - startTime
    };
  }

  const frameSummary = summarizeFrameEnhanced(sourceFrame);
  const nodeTreeJson = formatNodeTreeForAi(frameSummary);

  debugFixLog("Frame prepared for AI", {
    imageSize: imageBase64.length,
    nodeCount: frameSummary.nodes.length,
    analysisDepth: frameSummary.analysisDepth
  });

  // ===========================================================================
  // Stage 0.5: Relationship Detection (Relationship-Aware Layout System)
  // ===========================================================================

  onStatus?.({ stage: "analyzing", message: "Analyzing design relationships..." });

  const relationshipStart = Date.now();
  let relationshipConstraints: RelationshipConstraints | undefined;

  try {
    const relationshipResult = await detectRelationshipsOptimized(sourceFrame, {
      preserveMode: 'adaptive', // Balance preservation with adaptation for TikTok
      maxAnalysisTimeMs: 500 // Quick timeout to prevent blocking pipeline
    });

    stageDurations.relationshipDetection = Date.now() - relationshipStart;

    if (relationshipResult.success && relationshipResult.constraints) {
      relationshipConstraints = relationshipResult.constraints;
      debugFixLog("Relationship detection complete", {
        relationships: relationshipResult.analysis?.analysisMetrics.relationshipCount || 0,
        constraints: relationshipConstraints.constraints.length,
        criticalConstraints: relationshipConstraints.adaptationGuidance.criticalConstraintCount,
        fallbackMode: relationshipResult.fallbackMode,
        confidence: relationshipResult.analysis?.analysisMetrics.averageConfidence || 0
      });
    } else {
      debugFixLog("Relationship detection skipped", {
        reason: relationshipResult.error || "No relationships detected",
        fallbackMode: relationshipResult.fallbackMode
      });
    }
  } catch (error) {
    stageDurations.relationshipDetection = Date.now() - relationshipStart;
    debugFixLog("Relationship detection error, continuing without", { error: String(error) });
    // Continue without relationship constraints - graceful degradation
  }

  // ===========================================================================
  // Stages 1 & 2: AI Design Specification
  // ===========================================================================

  onStatus?.({ stage: "planning", message: "AI is analyzing your design..." });

  const stage1Start = Date.now();

  // Use enhanced AI service with relationship constraints if available
  debugFixLog("AI Service Selection", {
    useEnhancedService: !!relationshipConstraints,
    constraintCount: relationshipConstraints?.constraints.length || 0
  });

  const specsResult = relationshipConstraints
    ? await requestFullDesignSpecsWithRelationships(apiKey, imageBase64, nodeTreeJson, relationshipConstraints)
    : await requestFullDesignSpecs(apiKey, imageBase64, nodeTreeJson);
  stageDurations.stage1 = Date.now() - stage1Start;

  if (!specsResult.success || !specsResult.data) {
    return {
      success: false,
      error: specsResult.error || "AI failed to generate design specifications",
      totalDurationMs: Date.now() - startTime,
      stageDurations
    };
  }

  const specs = specsResult.data;
  stageDurations.stage2 = specsResult.durationMs;

  debugFixLog("AI specs received", {
    strategy: specs.plan.designStrategy,
    nodeSpecCount: specs.nodes.length,
    confidence: specs.confidence,
    warnings: specs.warnings
  });

  // ===========================================================================
  // Stage 3: Execution
  // ===========================================================================

  onStatus?.({ stage: "executing", message: "Creating TikTok variant..." });

  const executionStart = Date.now();

  // Create page and container
  const page = ensureDesignPage();
  const container = createDesignContainer(page, sourceFrame.name);

  // Create the variant
  const executionResult = await createDesignVariant(sourceFrame, specs, fontCache);
  stageDurations.execution = Date.now() - executionStart;

  if (!executionResult.variant) {
    removeDesignContainer(container);
    return {
      success: false,
      error: "Failed to create variant frame",
      totalDurationMs: Date.now() - startTime,
      stageDurations
    };
  }

  const variant = executionResult.variant;

  // Position variant in container
  container.appendChild(variant);
  positionVariantInContainer(container, variant);
  sizeContainerToFit(container, variant);

  // Extract font from source frame for the label
  const sourceFont = findFirstFont(sourceFrame);
  await addContainerLabel(container, sourceFrame.name, specs.confidence, sourceFont);

  debugFixLog("Variant created", {
    variantId: variant.id,
    appliedSpecs: executionResult.appliedSpecs,
    skippedSpecs: executionResult.skippedSpecs,
    errors: executionResult.errors
  });

  // ===========================================================================
  // Stage 4 (Optional): Evaluation
  // ===========================================================================

  let evaluation: DesignResult["evaluation"] = undefined;

  if (runEvaluation) {
    onStatus?.({ stage: "evaluating", message: "AI is reviewing the result..." });

    const stage3Start = Date.now();

    // Export the generated variant for evaluation
    const variantImage = await tryExportFrameAsBase64(variant);
    if (variantImage) {
      // Use enhanced evaluation with relationship validation if constraints available
      const evalResult = relationshipConstraints
        ? await requestStage3EvaluationWithRelationships(apiKey, variantImage, specs, relationshipConstraints)
        : await requestStage3Evaluation(apiKey, variantImage, specs);
      stageDurations.stage3 = Date.now() - stage3Start;

      if (evalResult.success && evalResult.data) {
        evaluation = evalResult.data;

        debugFixLog("Evaluation complete", {
          passed: evaluation.passed,
          issueCount: evaluation.issues?.length ?? 0
        });

        // Apply adjustments if evaluation found issues
        if (!evaluation.passed && evaluation.adjustments?.length) {
          debugFixLog("Applying evaluation adjustments", {
            adjustmentCount: evaluation.adjustments.length
          });

          const adjustmentResult = await applyEvaluationAdjustments(
            variant,
            evaluation.adjustments,
            fontCache
          );

          debugFixLog("Evaluation adjustments applied", {
            applied: adjustmentResult.applied,
            skipped: adjustmentResult.skipped,
            errors: adjustmentResult.errors
          });
        }
      }
    }
  }

  // ===========================================================================
  // Final: Navigate to result
  // ===========================================================================

  onStatus?.({ stage: "complete", message: "TikTok variant created!" });

  navigateToDesign(page, variant);

  const totalDurationMs = Date.now() - startTime;

  debugFixLog("Design for TikTok flow complete", {
    totalDurationMs,
    stageDurations,
    variantId: variant.id,
    pageId: page.id
  });

  return {
    success: true,
    variant,
    page,
    specs,
    evaluation,
    totalDurationMs,
    stageDurations
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats the enhanced frame summary for AI consumption.
 * Creates a JSON structure that's easy for the AI to parse.
 *
 * IMPORTANT: Includes parent-child relationship info (parentId, hasChildren, childCount)
 * so the AI understands Figma's visibility inheritance - hiding a parent hides all children.
 */
function formatNodeTreeForAi(summary: EnhancedFrameSummary): string {
  const simplified = {
    frameId: summary.id,
    frameName: summary.name,
    frameDimensions: summary.size,
    totalChildren: summary.childCount,
    analysisDepth: summary.analysisDepth,
    nodes: summary.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      position: { x: node.rel.x, y: node.rel.y },
      size: { width: node.rel.width, height: node.rel.height },
      // Parent-child relationship info for hierarchy awareness
      ...(node.parentId ? { parentId: node.parentId } : {}),
      ...(node.hasChildren ? { hasChildren: true } : {}),
      ...(node.childCount !== undefined ? { childCount: node.childCount } : {}),
      // Content info
      ...(node.text ? { text: node.text } : {}),
      ...(node.fontSize ? { fontSize: node.fontSize } : {}),
      ...(node.fillType ? { fillType: node.fillType } : {}),
      ...(node.layoutMode ? { layoutMode: node.layoutMode } : {}),
      ...(node.isDirectChild ? { isDirectChild: true } : {}),
      ...(node.dominantColor ? { color: node.dominantColor } : {})
    }))
  };

  return JSON.stringify(simplified, null, 2);
}

/**
 * Finds the first font used in a frame's text nodes.
 */
function findFirstFont(frame: FrameNode): FontName | undefined {
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (node.type === "TEXT") {
      const textNode = node as TextNode;
      if (textNode.fontName !== figma.mixed) {
        return textNode.fontName as FontName;
      }
    }

    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return undefined;
}

/**
 * Validates that a frame is suitable for the design flow.
 */
export function validateSourceFrame(frame: FrameNode): {
  valid: boolean;
  error?: string;
} {
  if (frame.removed) {
    return { valid: false, error: "Frame has been removed" };
  }

  if (frame.width < 100 || frame.height < 100) {
    return { valid: false, error: "Frame is too small (minimum 100x100)" };
  }

  if (frame.children.length === 0) {
    return { valid: false, error: "Frame has no children to transform" };
  }

  return { valid: true };
}
