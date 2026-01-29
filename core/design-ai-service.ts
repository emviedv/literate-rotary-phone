/**
 * Design AI Service
 *
 * Standalone OpenAI client for the "Design for TikTok" feature.
 * Isolated from the existing ai-openai-client.ts for clean A/B testing.
 */

import { debugFixLog } from "./debug.js";
import {
  DESIGN_SYSTEM_PROMPT,
  buildStage1Prompt,
  buildStage2Prompt,
  buildStage3Prompt,
  parseStage1Response,
  parseStage2Response,
  parseStage3Response
} from "./design-prompts.js";
import {
  USE_STRUCTURED_OUTPUTS,
  STAGE_1_SCHEMA,
  STAGE_2_SCHEMA,
  STAGE_3_SCHEMA
} from "./design-schemas.js";
import type { DesignPlan, DesignSpecs, DesignEvaluation, StageResult } from "../types/design-types.js";

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";
const OPENAI_TEMPERATURE = 0.2; // Slightly higher for creative decisions
const OPENAI_MAX_TOKENS = 8192; // Larger for detailed specs
const OPENAI_TIMEOUT_MS = 120000; // 120 seconds for complex analysis

// ============================================================================
// Types
// ============================================================================

/** Fetch request options */
type FetchInit = {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
};

/** Fetch response shape */
type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

/** Declare fetch for Figma's sandbox environment */
declare function fetch(url: string, init?: FetchInit): Promise<FetchResponse>;

/** OpenAI chat completion response */
interface ChatCompletion {
  readonly choices?: readonly [
    {
      readonly message?: {
        readonly content?: string;
      };
    }
  ];
}

/** Message content types */
type MessageContent = string | readonly MessageContentPart[];

interface MessageContentPart {
  readonly type: "text" | "image_url";
  readonly text?: string;
  readonly image_url?: {
    readonly url: string;
    readonly detail: "low" | "high" | "auto";
  };
}

interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: MessageContent;
}

/** JSON Schema configuration for structured outputs */
interface JsonSchemaConfig {
  readonly name: string;
  readonly strict: boolean;
  readonly schema: object;
}

// ============================================================================
// Core Request Function
// ============================================================================

/**
 * Makes a design-focused request to OpenAI.
 *
 * @param apiKey - OpenAI API key
 * @param messages - Chat messages to send
 * @param jsonSchema - Optional JSON Schema for structured outputs (uses json_schema format)
 */
async function makeDesignAiRequest(
  apiKey: string,
  messages: readonly ChatMessage[],
  jsonSchema?: JsonSchemaConfig
): Promise<{ success: boolean; content?: string; error?: string; durationMs?: number }> {
  const startTime = Date.now();

  // Use structured outputs when schema provided and feature enabled
  const responseFormat = USE_STRUCTURED_OUTPUTS && jsonSchema
    ? { type: "json_schema" as const, json_schema: jsonSchema }
    : { type: "json_object" as const };

  const body = {
    model: OPENAI_MODEL,
    temperature: OPENAI_TEMPERATURE,
    max_tokens: OPENAI_MAX_TOKENS,
    response_format: responseFormat,
    messages
  };

  debugFixLog("DESIGN_AI_REQUEST - Starting", {
    model: OPENAI_MODEL,
    messageCount: messages.length,
    hasImage: messages.some(
      (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
    ),
    responseFormat: responseFormat.type,
    schemaName: jsonSchema?.name ?? "none"
  });

  try {
    const response = await fetchWithTimeout(
      OPENAI_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      },
      OPENAI_TIMEOUT_MS
    );

    const durationMs = Date.now() - startTime;
    debugFixLog(`DESIGN_AI_REQUEST took ${durationMs}ms`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      const errorMessage = `OpenAI request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 500)}`;
      debugFixLog(errorMessage);
      return { success: false, error: errorMessage, durationMs };
    }

    const payload = (await response.json()) as ChatCompletion;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "OpenAI response missing content", durationMs };
    }

    debugFixLog("DESIGN_AI_RESPONSE", {
      contentLength: content.length,
      preview: content.slice(0, 500)
    });

    return { success: true, content, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugFixLog(`Design AI request error: ${errorMessage}`);
    return { success: false, error: errorMessage, durationMs };
  }
}

/**
 * Fetch with timeout using Promise.race.
 */
async function fetchWithTimeout(
  url: string,
  init: FetchInit,
  timeoutMs: number
): Promise<FetchResponse> {
  const fetchPromise = fetch(url, init);
  const timeoutPromise = new Promise<FetchResponse>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)),
      timeoutMs
    );
  });
  return Promise.race([fetchPromise, timeoutPromise]);
}

// ============================================================================
// Message Builders
// ============================================================================

function systemMessage(content: string): ChatMessage {
  return { role: "system", content };
}

function userMessageWithImage(
  imageBase64: string,
  textContent: string,
  detail: "low" | "high" | "auto" = "low"
): ChatMessage {
  return {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${imageBase64}`,
          detail
        }
      },
      {
        type: "text",
        text: textContent
      }
    ]
  };
}

// ============================================================================
// Stage-Specific Request Functions
// ============================================================================

/**
 * Stage 1: Vision Analysis & Planning
 * AI sees the frame image and node tree, outputs a design plan.
 */
export async function requestStage1Analysis(
  apiKey: string,
  imageBase64: string,
  nodeTreeJson: string
): Promise<StageResult<DesignPlan>> {
  const startTime = Date.now();

  const messages: ChatMessage[] = [
    systemMessage(DESIGN_SYSTEM_PROMPT),
    userMessageWithImage(imageBase64, buildStage1Prompt(nodeTreeJson))
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_1_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "No content received from Stage 1",
      durationMs: Date.now() - startTime
    };
  }

  // Pass nodeTreeJson for container visibility validation
  const parsed = parseStage1Response(result.content, nodeTreeJson);

  // Log any warnings about container visibility
  if (parsed.warnings && parsed.warnings.length > 0) {
    debugFixLog("Stage 1 container visibility warnings", { warnings: parsed.warnings });
  }

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      durationMs: Date.now() - startTime
    };
  }

  return {
    success: true,
    data: parsed.plan,
    durationMs: Date.now() - startTime
  };
}

/**
 * Stage 2: Detailed Specification
 * Uses the plan to generate node-by-node positioning specs.
 */
export async function requestStage2Specification(
  apiKey: string,
  imageBase64: string,
  nodeTreeJson: string,
  designPlan: DesignPlan
): Promise<StageResult<DesignSpecs>> {
  const startTime = Date.now();

  const messages: ChatMessage[] = [
    systemMessage(DESIGN_SYSTEM_PROMPT),
    userMessageWithImage(
      imageBase64,
      buildStage2Prompt(nodeTreeJson, JSON.stringify(designPlan, null, 2))
    )
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_2_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "No content received from Stage 2",
      durationMs: Date.now() - startTime
    };
  }

  // Pass nodeTreeJson for container visibility validation
  const parsed = parseStage2Response(result.content, nodeTreeJson);

  // Log any warnings about container visibility
  if (parsed.warnings && parsed.warnings.length > 0) {
    debugFixLog("Stage 2 container visibility warnings", { warnings: parsed.warnings });
  }

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      durationMs: Date.now() - startTime
    };
  }

  return {
    success: true,
    data: parsed.specs,
    durationMs: Date.now() - startTime
  };
}

/**
 * Stage 3: Evaluation (Optional)
 * Re-analyzes the generated variant to catch issues.
 */
export async function requestStage3Evaluation(
  apiKey: string,
  variantImageBase64: string,
  appliedSpecs: DesignSpecs
): Promise<StageResult<DesignEvaluation>> {
  const startTime = Date.now();

  const messages: ChatMessage[] = [
    systemMessage(DESIGN_SYSTEM_PROMPT),
    userMessageWithImage(
      variantImageBase64,
      buildStage3Prompt(JSON.stringify(appliedSpecs, null, 2))
    )
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_3_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "No content received from Stage 3",
      durationMs: Date.now() - startTime
    };
  }

  const parsed = parseStage3Response(result.content);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      durationMs: Date.now() - startTime
    };
  }

  return {
    success: true,
    data: parsed.evaluation,
    durationMs: Date.now() - startTime
  };
}

/**
 * Combined Stage 1+2 for simpler cases.
 * Does both analysis and specification in a single request flow.
 */
export async function requestFullDesignSpecs(
  apiKey: string,
  imageBase64: string,
  nodeTreeJson: string
): Promise<StageResult<DesignSpecs>> {
  // Stage 1: Get design plan
  debugFixLog("Starting Stage 1: Vision Analysis");
  const stage1Result = await requestStage1Analysis(apiKey, imageBase64, nodeTreeJson);

  if (!stage1Result.success || !stage1Result.data) {
    return {
      success: false,
      error: `Stage 1 failed: ${stage1Result.error}`,
      durationMs: stage1Result.durationMs
    };
  }

  debugFixLog("Stage 1 complete, design plan created", {
    strategy: stage1Result.data.designStrategy,
    keepCount: stage1Result.data.elements.keep.length,
    hideCount: stage1Result.data.elements.hide.length
  });

  // Stage 2: Get detailed specs
  debugFixLog("Starting Stage 2: Detailed Specification");
  const stage2Result = await requestStage2Specification(
    apiKey,
    imageBase64,
    nodeTreeJson,
    stage1Result.data
  );

  if (!stage2Result.success || !stage2Result.data) {
    return {
      success: false,
      error: `Stage 2 failed: ${stage2Result.error}`,
      durationMs: (stage1Result.durationMs ?? 0) + (stage2Result.durationMs ?? 0)
    };
  }

  debugFixLog("Stage 2 complete, specs generated", {
    nodeCount: stage2Result.data.nodes.length,
    confidence: stage2Result.data.confidence
  });

  return {
    success: true,
    data: stage2Result.data,
    durationMs: (stage1Result.durationMs ?? 0) + (stage2Result.durationMs ?? 0)
  };
}
