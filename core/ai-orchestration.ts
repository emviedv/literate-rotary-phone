/**
 * AI Orchestration Module: Two-Phase Request Coordinator
 *
 * This module implements "Prompt Chaining" - a reliability technique that splits
 * AI analysis into two sequential requests:
 *
 * Request 1 (Vision): Extract visual facts (faces, subjects) without layout reasoning
 * Request 2 (Layout): Generate layout advice using the vision facts as constraints
 *
 * Benefits:
 * - Prevents "contextual drift" where layout concerns affect visual perception
 * - Face regions become immutable facts, not suggestions
 * - Graceful fallback to single-request flow if Request 1 fails
 */

import type { AiSignals, AiFaceRegion } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";
import { sanitizeAiSignals } from "./ai-sanitization.js";
import { summarizeFrameEnhanced } from "./ai-frame-summary.js";
import {
  makeOpenAiRequest,
  systemMessage,
  userMessageWithImage,
  userMessage,
  type ChatMessage
} from "./ai-openai-client.js";
import { tryExportFrameAsBase64 } from "./ai-image-export.js";
import {
  VISION_ONLY_PROMPT,
  parseVisionResponse,
  type VisionFacts
} from "./ai-vision-prompt.js";
import {
  buildLayoutPromptWithFacts,
  buildLayoutUserMessage,
  visionFacesToAiFaces
} from "./ai-layout-prompt.js";
import { OPENAI_MODEL, buildSystemPrompt } from "./ai-system-prompt.js";

/**
 * Result of the chained AI analysis.
 */
export interface ChainedAiResult {
  /** Whether the analysis was successful */
  readonly success: boolean;
  /** Analyzed signals with face regions */
  readonly signals?: AiSignals;
  /** Layout advice for all targets */
  readonly layoutAdvice?: LayoutAdvice;
  /** Which approach was used */
  readonly approach: "chained" | "fallback" | "failed";
  /** Vision facts from phase 1 (if chained approach succeeded) */
  readonly visionFacts?: VisionFacts;
  /** Error message if failed */
  readonly error?: string;
  /** Total duration in milliseconds */
  readonly durationMs: number;
}

/**
 * Configuration for the chained request.
 */
export interface ChainedRequestConfig {
  /** OpenAI API key */
  readonly apiKey: string;
  /** Whether to skip vision phase and go straight to layout (for testing) */
  readonly skipVision?: boolean;
  /** Model to use (defaults to GPT-4o) */
  readonly model?: string;
}

/**
 * Executes the two-phase chained AI analysis.
 *
 * Phase 1: Vision-only analysis to extract face regions and subject occupancy
 * Phase 2: Layout analysis with vision facts injected as constraints
 *
 * Falls back to single-request approach if Phase 1 fails.
 */
export async function requestChainedAiInsights(
  frame: FrameNode,
  config: ChainedRequestConfig
): Promise<ChainedAiResult> {
  const startTime = Date.now();
  const { apiKey, model = OPENAI_MODEL } = config;

  debugFixLog("Starting chained AI analysis", {
    frameId: frame.id,
    frameName: frame.name,
    model
  });

  // Export frame as image for vision analysis
  const imageBase64 = await tryExportFrameAsBase64(frame);

  if (!imageBase64) {
    debugFixLog("Failed to export frame image, falling back to text-only analysis");
    return {
      success: false,
      approach: "failed",
      error: "Could not export frame as image",
      durationMs: Date.now() - startTime
    };
  }

  // Get frame summary for both phases
  const frameSummary = summarizeFrameEnhanced(frame);
  // Note: frameSummary is used by executeLayoutPhase; JSON serialization happens there

  // Phase 1: Vision-only analysis
  let visionFacts: VisionFacts | null = null;

  if (!config.skipVision) {
    const visionStart = Date.now();

    try {
      visionFacts = await executeVisionPhase(imageBase64, apiKey, model);

      debugFixLog("Vision phase completed", {
        durationMs: Date.now() - visionStart,
        faceCount: visionFacts?.faceRegions.length ?? 0,
        subjectOccupancy: visionFacts?.subjectOccupancy,
        intent: visionFacts?.intent
      });
    } catch (error) {
      debugFixLog("Vision phase failed, will proceed with fallback", {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue to layout phase without vision facts
    }
  }

  // Phase 2: Layout analysis (with or without vision facts)
  const layoutStart = Date.now();

  try {
    const layoutResult = await executeLayoutPhase(
      frameSummary, // Pass raw object for batching
      imageBase64,
      visionFacts,
      apiKey,
      model
    );

    const durationMs = Date.now() - startTime;

    debugFixLog("Layout phase completed", {
      durationMs: Date.now() - layoutStart,
      hasSignals: !!layoutResult.signals,
      hasLayoutAdvice: !!layoutResult.layoutAdvice,
      approach: visionFacts ? "chained" : "fallback"
    });

    // Merge vision facts into signals if we have them
    let signals = layoutResult.signals;
    if (visionFacts && signals) {
      signals = mergeVisionFactsIntoSignals(signals, visionFacts);
    }

    return {
      success: true,
      signals,
      layoutAdvice: layoutResult.layoutAdvice,
      approach: visionFacts ? "chained" : "fallback",
      visionFacts: visionFacts ?? undefined,
      durationMs
    };
  } catch (error) {
    return {
      success: false,
      approach: "failed",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime
    };
  }
}

/**
 * Executes Phase 1: Vision-only analysis.
 */
async function executeVisionPhase(
  imageBase64: string,
  apiKey: string,
  model: string
): Promise<VisionFacts | null> {
  const messages: ChatMessage[] = [
    systemMessage(VISION_ONLY_PROMPT),
    userMessageWithImage(
      imageBase64,
      "Analyze this marketing frame. Extract face regions, subject occupancy, subject type, and intent. Return JSON only."
    )
  ];

  const result = await makeOpenAiRequest({
    apiKey,
    messages,
    model,
    temperature: 0.1,
    maxTokens: 1000 // Vision response is small
  });

  if (!result.success || !result.content) {
    throw new Error(result.error ?? "Vision phase returned no content");
  }

  // Parse the vision response
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    throw new Error("Vision response was not valid JSON");
  }

  const facts = parseVisionResponse(parsed);

  if (!facts) {
    throw new Error("Could not parse vision facts from response");
  }

  return facts;
}

/**
 * Executes Phase 2: Layout analysis (Batched).
 *
 * Splits the targets into batches to prevent timeouts and token limits.
 * Runs batches in parallel and merges the results.
 */
async function executeLayoutPhase(
  frameSummary: any, // Raw summary object, not string
  imageBase64: string,
  visionFacts: VisionFacts | null,
  apiKey: string,
  model: string
): Promise<{ signals?: AiSignals; layoutAdvice?: LayoutAdvice }> {
  const BATCH_SIZE = 6;
  const targetBatches = [];

  for (let i = 0; i < VARIANT_TARGETS.length; i += BATCH_SIZE) {
    targetBatches.push(VARIANT_TARGETS.slice(i, i + BATCH_SIZE));
  }

  debugFixLog(`Splitting ${VARIANT_TARGETS.length} targets into ${targetBatches.length} batches`);

  const batchPromises = targetBatches.map(async (batch, index) => {
    const batchSummaryJson = JSON.stringify({ frame: frameSummary, targets: batch });
    let messages: ChatMessage[];

    if (visionFacts) {
      // Use fact-injected prompt
      const systemPrompt = buildLayoutPromptWithFacts(visionFacts, batch);
      const userContent = buildLayoutUserMessage(batchSummaryJson, visionFacts, batch.length);

      messages = [
        systemMessage(systemPrompt),
        userMessage(userContent)
      ];
    } else {
      // Fallback: Use combined prompt
      const systemPrompt = buildSystemPrompt(batch);
      messages = [
        systemMessage(systemPrompt),
        userMessageWithImage(imageBase64, batchSummaryJson)
      ];
    }

    debugFixLog(`Executing layout batch ${index + 1}/${targetBatches.length}`, {
      targets: batch.map(t => t.id).join(", ")
    });

    const result = await makeOpenAiRequest({
      apiKey,
      messages,
      model,
      temperature: 0.1,
      maxTokens: 8192
    });

    if (!result.success || !result.parsed) {
      debugFixLog(`Batch ${index + 1} failed (non-fatal): ${result.error}`);
      return null;
    }

    return {
      signals: sanitizeAiSignals(result.parsed.signals),
      layoutAdvice: normalizeLayoutAdvice(result.parsed.layoutAdvice)
    };
  });

  const resultsRaw = await Promise.all(batchPromises);
  const results = resultsRaw.filter((r): r is NonNullable<typeof r> => r !== null);

  if (results.length === 0) {
    throw new Error("All AI batches failed.");
  }

  // Merge results
  // Signals: Take the first valid one (they should be identical/similar)
  const signals = results.find(r => r.signals)?.signals;

  // Layout Advice: Flatten all entries
  const allEntries = results.flatMap(r => r.layoutAdvice?.entries ?? []);

  debugFixLog("Merged layout batches", {
    totalEntries: allEntries.length,
    batches: results.length
  });

  return {
    signals,
    layoutAdvice: { entries: allEntries }
  };
}

/**
 * Merges vision facts into the signals object.
 * Vision face regions take precedence over any the layout phase might have detected.
 */
function mergeVisionFactsIntoSignals(
  signals: AiSignals,
  facts: VisionFacts
): AiSignals {
  // Convert vision face regions to AI face region format
  const visionFaceRegions: AiFaceRegion[] = visionFacesToAiFaces(facts.faceRegions);

  // If vision detected faces, use those; otherwise keep what layout detected
  const mergedFaceRegions = visionFaceRegions.length > 0
    ? visionFaceRegions
    : signals.faceRegions ?? [];

  return {
    ...signals,
    faceRegions: mergedFaceRegions,
    subjectOccupancy: facts.subjectOccupancy !== "none" ? facts.subjectOccupancy : signals.subjectOccupancy,
    intent: facts.intent
  };
}

/**
 * Checks if chained analysis is available (has required modules).
 */
export function isChainedAnalysisAvailable(): boolean {
  return true; // All modules are bundled together
}