import type { AiSignals, EnhancedAiSignals } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";
import { FEW_SHOT_MESSAGES } from "./ai-few-shot-examples.js";
import { sanitizeAiSignals } from "./ai-sanitization.js";
import { summarizeFrameEnhanced, type EnhancedFrameSummary } from "./ai-frame-summary.js";
import { analyzeTypographyHierarchy } from "./ai-hierarchy-detector.js";
import { detectGridSystem } from "./ai-layout-grid-detector.js";
import { detectContentRelationships } from "./ai-content-relationships.js";
import { generateContextAwarePrompt, type EnhancedAiRequest } from "./ai-dynamic-prompts.js";
import { SYSTEM_PROMPT } from "./ai-system-prompt.js";
import {
  makeOpenAiRequest,
  systemMessage,
  createUserMessage,
  type ChatMessage
} from "./ai-openai-client.js";
import {
  tryExportFrameAsBase64,
  uint8ArrayToBase64 as _uint8ArrayToBase64
} from "./ai-image-export.js";
import { requestChainedAiInsights } from "./ai-orchestration.js";

export interface AiServiceResult {
  readonly signals?: AiSignals;
  readonly layoutAdvice?: LayoutAdvice;
}

export interface EnhancedAiServiceResult {
  readonly success: boolean;
  readonly signals?: EnhancedAiSignals;
  readonly layoutAdvice?: LayoutAdvice;
  readonly enhancedSummary?: EnhancedFrameSummary;
  readonly recoveryMethod?: string;
  readonly confidence?: number;
  readonly error?: string;
}

export async function requestAiInsights(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  const startTotal = Date.now();
  // 1. Summarize the frame
  const summary = summarizeFrameEnhanced(frame);

  // Export frame as image for vision analysis
  const imageBase64 = await tryExportFrameAsBase64(frame);

  // Build messages for OpenAI request
  const requestData = JSON.stringify({ frame: summary, targets: VARIANT_TARGETS });
  const messages: ChatMessage[] = [
    systemMessage(SYSTEM_PROMPT),
    ...FEW_SHOT_MESSAGES as ChatMessage[],
    createUserMessage(requestData, imageBase64)
  ];

  // Make OpenAI request using shared client
  const result = await makeOpenAiRequest({ apiKey, messages });

  // Throw on failure to maintain backward compatibility
  if (!result.success || !result.parsed) {
    throw new Error(result.error ?? "OpenAI request failed");
  }

  const signals = sanitizeAiSignals(result.parsed.signals);
  const layoutAdvice = normalizeLayoutAdvice(result.parsed.layoutAdvice);

  debugFixLog("ai service parsed response", {
    roles: signals?.roles.length ?? 0,
    qa: signals?.qa?.length ?? 0,
    faceRegions: signals?.faceRegions?.length ?? 0,
    focalPoints: signals?.focalPoints?.length ?? 0,
    layoutTargets: layoutAdvice?.entries.length ?? 0,
    ...(signals?.faceRegions?.length
      ? {
          faces: signals.faceRegions.map((f) => ({
            nodeId: f.nodeId,
            x: f.x.toFixed(2),
            y: f.y.toFixed(2),
            confidence: f.confidence.toFixed(2)
          }))
        }
      : {})
  });

  if (!signals && !layoutAdvice) {
    debugFixLog(`AI_SERVICE_TOTAL took ${Date.now() - startTotal}ms`);
    return null;
  }

  debugFixLog(`AI_SERVICE_TOTAL took ${Date.now() - startTotal}ms`);
  return {
    signals,
    layoutAdvice: layoutAdvice ?? undefined
  };
}

/**
 * Enhanced AI insights with structural analysis capabilities.
 * Uses 60-node capacity, intelligent chunking, typography hierarchy detection,
 * grid system analysis, content relationships, and dynamic prompt generation.
 */
export async function requestEnhancedAiInsights(
  frame: FrameNode,
  apiKey: string,
  targetId?: string
): Promise<EnhancedAiServiceResult | null> {
  const startTotal = Date.now();

  // Enhanced frame summarization with 60-node capacity and priority-based selection
  const enhancedSummary = summarizeFrameEnhanced(frame);

  // Perform structural analysis
  const structuralAnalysis = await performStructuralAnalysis(frame, enhancedSummary);

  // Generate context-aware prompt
  const dynamicPrompt = generateContextAwarePrompt(structuralAnalysis, targetId);

  // Export frame as image for vision analysis
  const imageBase64 = await tryExportFrameAsBase64(frame);

  const BATCH_SIZE = 6;
  const targetBatches = [];
  for (let i = 0; i < VARIANT_TARGETS.length; i += BATCH_SIZE) {
    targetBatches.push(VARIANT_TARGETS.slice(i, i + BATCH_SIZE));
  }

  debugFixLog(`Splitting ${VARIANT_TARGETS.length} targets into ${targetBatches.length} batches`);

  try {
    const batchPromises = targetBatches.map(async (batch, index) => {
      // Build messages for OpenAI request
      const requestData = JSON.stringify({
        frame: enhancedSummary,
        structural: structuralAnalysis,
        targets: batch
      });

      const messages: ChatMessage[] = [
        systemMessage(dynamicPrompt),
        ...FEW_SHOT_MESSAGES as ChatMessage[],
        createUserMessage(requestData, imageBase64)
      ];

      // Make OpenAI request using shared client
      return makeOpenAiRequest({ apiKey, messages });
    });

    const results = await Promise.all(batchPromises);

    // Check for failures
    const failedBatch = results.find(r => !r.success);
    if (failedBatch) {
      debugFixLog(failedBatch.error ?? "Enhanced AI request batch failed");
      return {
        success: false,
        error: failedBatch.error
      };
    }

    // Merge results
    // Signals: Use the first valid one (should be consistent across batches)
    const firstValidResult = results.find(r => r.parsed);
    if (!firstValidResult?.parsed) {
      debugFixLog("Enhanced AI response missing content in all batches");
      return null;
    }

    const rawSignals = firstValidResult.parsed.signals;
    const allEntries = results.flatMap(r => 
      (r.parsed?.layoutAdvice as { entries?: unknown[] })?.entries ?? []
    );

    // Sanitize and enhance signals
    const signals = sanitizeAiSignals(rawSignals);
    const layoutAdvice = normalizeLayoutAdvice({ entries: allEntries });

    // Debug: Log after normalization
    debugFixLog("AI normalized results", {
      signalsValid: !!signals,
      layoutAdviceValid: !!layoutAdvice,
      normalizedEntriesCount: layoutAdvice?.entries?.length ?? 0
    });

    // Create enhanced AI signals with structural analysis
    const enhancedSignals: EnhancedAiSignals | undefined = signals ? {
      ...signals,
      layoutStructure: structuralAnalysis.layoutStructure,
      contentRelationships: structuralAnalysis.contentRelationships,
      colorTheme: structuralAnalysis.colorTheme,
      analysisDepth: structuralAnalysis.analysisMetadata
    } : undefined;

    if (!enhancedSignals && !layoutAdvice) {
      debugFixLog(`ENHANCED_AI_SERVICE_TOTAL took ${Date.now() - startTotal}ms`);
      return null;
    }

    debugFixLog(`ENHANCED_AI_SERVICE_TOTAL took ${Date.now() - startTotal}ms`);
    return {
      success: true,
      signals: enhancedSignals,
      layoutAdvice: layoutAdvice ?? undefined,
      enhancedSummary
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugFixLog(`Enhanced AI batch request error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Performs comprehensive structural analysis of a frame.
 */
async function performStructuralAnalysis(
  frame: FrameNode,
  enhancedSummary: EnhancedFrameSummary
): Promise<EnhancedAiRequest["structuralAnalysis"]> {
  // Collect all visible nodes for analysis
  const allNodes = collectAllVisibleNodes(frame);
  const textNodes = allNodes.filter(node => node.type === "TEXT") as TextNode[];

  // Typography hierarchy analysis
  const typographyHierarchy = analyzeTypographyHierarchy(textNodes);

  // Grid system detection
  const gridSystem = detectGridSystem(frame);

  // Content relationship mapping
  const contentRelationships = detectContentRelationships(
    allNodes,
    frame.width,
    frame.height
  );

  // TODO: Add color theme analysis
  // const colorTheme = analyzeColorTheme(allNodes);

  return {
    layoutStructure: {
      gridSystem: gridSystem.hasGridSystem ? {
        type: gridSystem.gridType,
        columnCount: gridSystem.columnCount,
        gutterWidth: gridSystem.gutterWidth,
        alignment: gridSystem.alignment
      } : undefined,
      sections: [], // TODO: Implement section detection
      typographyScale: [...typographyHierarchy.levels],
      proximityGroups: contentRelationships.map(rel => ({
        nodeIds: rel.nodeIds,
        relationship: rel.type,
        confidence: rel.confidence
      })),
      readingFlow: {
        primaryDirection: "left-to-right", // TODO: Implement reading flow detection
        visualAnchors: []
      }
    },
    typographyHierarchy,
    contentRelationships,
    gridSystem,
    // colorTheme, // TODO: Implement color theme analysis
    analysisMetadata: enhancedSummary.analysisDepth
  };
}

/**
 * Collects all visible nodes from a frame recursively.
 */
function collectAllVisibleNodes(frame: FrameNode): readonly SceneNode[] {
  const nodes: SceneNode[] = [];
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (!node.visible) continue;

    nodes.push(node);

    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return nodes;
}

/**
 * Main AI analysis entry point with robust error recovery.
 * Replaces direct calls to requestAiInsights/requestEnhancedAiInsights.
 */
export async function requestAiInsightsWithRecovery(
  frame: FrameNode,
  apiKey: string,
  targetId?: string
): Promise<EnhancedAiServiceResult> {
  try {
    // 1. Try the new "Chained" (Vision -> Layout) analysis flow FIRST.
    // This provides the highest quality results with "Fact Injection".
    const chainedResult = await requestChainedAiInsights(frame, { apiKey });

    if (chainedResult.success) {
        return {
            success: true,
            signals: chainedResult.signals as EnhancedAiSignals,
            layoutAdvice: chainedResult.layoutAdvice,
            recoveryMethod: "chained-analysis",
            confidence: 0.95 // High confidence for full AI analysis
        };
    }

    // 2. If Chained Analysis failed, fall back to the robust error recovery system.
    // This system can try simplified prompts, rule-based heuristics, or legacy methods.
    debugFixLog(`Chained analysis failed: ${chainedResult.error}. Attempting recovery...`);

    // Import error recovery system dynamically to avoid circular dependencies
    const { analyzeFrameWithRecovery } = await import('./ai-error-recovery.js');

    // Use the robust error recovery system
    const recoveryResult = await analyzeFrameWithRecovery(frame, apiKey, targetId);

    if (recoveryResult.success && recoveryResult.signals) {
      // Convert basic AiSignals to EnhancedAiSignals if needed
      const enhancedSignals: EnhancedAiSignals = recoveryResult.signals as EnhancedAiSignals;

      return {
        success: true,
        signals: enhancedSignals,
        layoutAdvice: recoveryResult.layoutAdvice,
        recoveryMethod: recoveryResult.recoveryMethod,
        confidence: recoveryResult.confidence,
      };
    }

    // Recovery failed, return error result
    return {
      success: false,
      recoveryMethod: recoveryResult.recoveryMethod,
      confidence: recoveryResult.confidence || 0,
      error: recoveryResult.error || "AI analysis failed with no specific error"
    };

  } catch (error) {
    // Absolute fallback if even the recovery system fails
    console.error('[AI Service] Critical failure in recovery system:', error);

    return {
      success: false,
      recoveryMethod: "critical-failure",
      confidence: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Legacy compatibility wrapper for existing code.
 * @deprecated Use requestAiInsightsWithRecovery for better reliability.
 */
export async function requestAiInsightsLegacy(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  console.warn('[AI Service] Using legacy AI service - consider upgrading to requestAiInsightsWithRecovery');

  try {
    const result = await requestAiInsightsWithRecovery(frame, apiKey);

    if (result.success) {
      return {
        signals: result.signals,
        layoutAdvice: result.layoutAdvice
      };
    }

    return null;
  } catch (error) {
    console.error('[AI Service] Legacy wrapper failed:', error);
    return null;
  }
}

// Re-export for backwards compatibility
export { sanitizeAiSignals } from "./ai-sanitization.js";
export { summarizeFrame, type FrameSummary, type NodeSummary } from "./ai-frame-summary.js";

// Internal exports for testing (prefixed with underscore to indicate internal use)
export { _uint8ArrayToBase64 };
export { collectAllVisibleNodes as _collectAllVisibleNodes };
export { performStructuralAnalysis as _performStructuralAnalysis };

// Re-export chained AI analysis for two-phase request flow
export {
  requestChainedAiInsights,
  type ChainedAiResult,
  type ChainedRequestConfig
} from "./ai-orchestration.js";
