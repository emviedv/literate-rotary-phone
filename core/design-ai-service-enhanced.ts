/**
 * Enhanced Design AI Service with Relationship-Aware Prompts
 *
 * Enhanced version of design AI service that includes relationship constraints
 * in the prompts for sophisticated design preservation during TikTok transformation.
 */

import { debugFixLog } from "./debug.js";
import {
  buildStage1PromptWithRelationships,
  buildStage2PromptWithRelationships,
  buildStage3PromptWithRelationships
} from "./design-prompts-enhanced.js";
import {
  DESIGN_SYSTEM_PROMPT,
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

// JSON Schema configuration interface
interface JsonSchemaConfig {
  readonly name: string;
  readonly strict: boolean;
  readonly schema: object;
}
import type {
  DesignPlan,
  DesignSpecs,
  DesignEvaluation,
  StageResult
} from "../types/design-types.js";
import type { RelationshipConstraints } from "../types/design-relationships.js";

// ============================================================================
// Configuration - Same as base service
// ============================================================================

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";
const OPENAI_TEMPERATURE = 0.2;
const OPENAI_MAX_TOKENS = 8192;
const OPENAI_TIMEOUT_MS = 120000;

// ============================================================================
// Types - Same as base service
// ============================================================================

type FetchInit = {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
};

type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

declare function fetch(url: string, init?: FetchInit): Promise<FetchResponse>;

interface ChatCompletion {
  readonly choices?: readonly {
    readonly message?: {
      readonly content?: string;
    };
  }[];
}

interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content:
    | string
    | readonly {
        readonly type: "text" | "image_url";
        readonly text?: string;
        readonly image_url?: {
          readonly url: string;
          readonly detail?: "low" | "high" | "auto";
        };
      }[];
}

// ============================================================================
// Enhanced Main Functions
// ============================================================================

/**
 * Enhanced version of requestFullDesignSpecs with relationship awareness
 */
export async function requestFullDesignSpecsWithRelationships(
  apiKey: string,
  imageBase64: string,
  nodeTreeJson: string,
  relationshipConstraints?: RelationshipConstraints
): Promise<StageResult<DesignSpecs>> {

  debugFixLog("Starting enhanced design specs request", {
    hasImage: !!imageBase64,
    nodeTreeLength: nodeTreeJson.length,
    hasConstraints: !!relationshipConstraints,
    constraintCount: relationshipConstraints?.constraints.length || 0,
    criticalConstraints: relationshipConstraints?.adaptationGuidance.criticalConstraintCount || 0
  });

  // Stage 1: Enhanced vision analysis with relationship context
  const stage1Result = await requestStage1AnalysisWithRelationships(
    apiKey,
    imageBase64,
    nodeTreeJson,
    relationshipConstraints
  );

  if (!stage1Result.success || !stage1Result.data) {
    return {
      success: false,
      error: stage1Result.error || "Enhanced Stage 1 analysis failed",
      durationMs: stage1Result.durationMs
    };
  }

  // Stage 2: Enhanced detailed specifications with relationship constraints
  const stage2Result = await requestStage2SpecsWithRelationships(
    apiKey,
    nodeTreeJson,
    JSON.stringify(stage1Result.data),
    relationshipConstraints
  );

  if (!stage2Result.success || !stage2Result.data) {
    return {
      success: false,
      error: stage2Result.error || "Enhanced Stage 2 specifications failed",
      durationMs: (stage1Result.durationMs || 0) + (stage2Result.durationMs || 0)
    };
  }

  const totalDuration = (stage1Result.durationMs || 0) + (stage2Result.durationMs || 0);

  debugFixLog("Enhanced design specs complete", {
    stage1Duration: stage1Result.durationMs,
    stage2Duration: stage2Result.durationMs,
    totalDuration,
    nodeSpecs: stage2Result.data.nodes.length,
    hasRelationshipContext: !!relationshipConstraints
  });

  return {
    success: true,
    data: stage2Result.data,
    durationMs: totalDuration
  };
}

/**
 * Enhanced Stage 1: Vision analysis with relationship context
 */
async function requestStage1AnalysisWithRelationships(
  apiKey: string,
  imageBase64: string,
  nodeTreeJson: string,
  relationshipConstraints?: RelationshipConstraints
): Promise<StageResult<DesignPlan>> {

  debugFixLog("Starting enhanced Stage 1: Vision analysis with relationships");

  const messages: ChatMessage[] = [
    { role: "system", content: DESIGN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail: "low"
          }
        },
        {
          type: "text",
          text: buildStage1PromptWithRelationships(nodeTreeJson, relationshipConstraints)
        }
      ]
    }
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_1_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "Enhanced Stage 1 request failed",
      durationMs: result.durationMs
    };
  }

  const parseResult = parseStage1Response(result.content);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error || "Enhanced Stage 1 parsing failed",
      durationMs: result.durationMs
    };
  }

  debugFixLog("Enhanced Stage 1 complete", {
    strategy: parseResult.plan?.designStrategy,
    hasRelationshipContext: !!relationshipConstraints
  });

  return {
    success: true,
    data: parseResult.plan!,
    durationMs: result.durationMs
  };
}

/**
 * Enhanced Stage 2: Detailed specifications with relationship constraints
 */
async function requestStage2SpecsWithRelationships(
  apiKey: string,
  nodeTreeJson: string,
  designPlanJson: string,
  relationshipConstraints?: RelationshipConstraints
): Promise<StageResult<DesignSpecs>> {

  debugFixLog("Starting enhanced Stage 2: Specifications with relationship constraints");

  const messages: ChatMessage[] = [
    { role: "system", content: DESIGN_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildStage2PromptWithRelationships(
        nodeTreeJson,
        designPlanJson,
        relationshipConstraints
      )
    }
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_2_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "Enhanced Stage 2 request failed",
      durationMs: result.durationMs
    };
  }

  const parseResult = parseStage2Response(result.content);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error || "Enhanced Stage 2 parsing failed",
      durationMs: result.durationMs
    };
  }

  debugFixLog("Enhanced Stage 2 complete", {
    nodeSpecs: parseResult.specs?.nodes.length,
    confidence: parseResult.specs?.confidence,
    hasRelationshipContext: !!relationshipConstraints
  });

  return {
    success: true,
    data: parseResult.specs!,
    durationMs: result.durationMs
  };
}

/**
 * Enhanced Stage 3: Evaluation with relationship validation
 */
export async function requestStage3EvaluationWithRelationships(
  apiKey: string,
  generatedImageBase64: string,
  designSpecs: DesignSpecs,
  relationshipConstraints?: RelationshipConstraints
): Promise<StageResult<DesignEvaluation>> {

  debugFixLog("Starting enhanced Stage 3: Evaluation with relationship validation");

  const messages: ChatMessage[] = [
    { role: "system", content: DESIGN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${generatedImageBase64}`,
            detail: "low"
          }
        },
        {
          type: "text",
          text: buildStage3PromptWithRelationships(
            "", // Original image not needed for this version
            generatedImageBase64,
            JSON.stringify(designSpecs),
            relationshipConstraints
          )
        }
      ]
    }
  ];

  const result = await makeDesignAiRequest(apiKey, messages, STAGE_3_SCHEMA);

  if (!result.success || !result.content) {
    return {
      success: false,
      error: result.error || "Enhanced Stage 3 request failed",
      durationMs: result.durationMs
    };
  }

  const parseResult = parseStage3Response(result.content);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error || "Enhanced Stage 3 parsing failed",
      durationMs: result.durationMs
    };
  }

  debugFixLog("Enhanced Stage 3 complete", {
    passed: parseResult.evaluation?.passed,
    issueCount: parseResult.evaluation?.issues?.length,
    hasRelationshipValidation: !!relationshipConstraints
  });

  return {
    success: true,
    data: parseResult.evaluation!,
    durationMs: result.durationMs
  };
}

// ============================================================================
// Utility Functions - Same as base service
// ============================================================================

/**
 * Makes design AI request with timeout and error handling
 */
async function makeDesignAiRequest(
  apiKey: string,
  messages: readonly ChatMessage[],
  jsonSchema?: JsonSchemaConfig
): Promise<{ success: boolean; content?: string; error?: string; durationMs?: number }> {
  const startTime = Date.now();

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

  debugFixLog("ENHANCED_DESIGN_AI_REQUEST - Starting", {
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
    debugFixLog(`ENHANCED_DESIGN_AI_REQUEST took ${durationMs}ms`);

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

    debugFixLog("ENHANCED_DESIGN_AI_RESPONSE", {
      contentLength: content.length,
      preview: content.slice(0, 500)
    });

    return { success: true, content, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugFixLog(`Enhanced design AI request error: ${errorMessage}`);
    return { success: false, error: errorMessage, durationMs };
  }
}

/**
 * Fetch with timeout using Promise.race
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