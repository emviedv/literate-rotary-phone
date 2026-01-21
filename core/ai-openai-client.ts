/**
 * OpenAI API Client
 *
 * Centralized client for making OpenAI API requests.
 * Handles fetch, timeout, response parsing, and error handling.
 */

import { debugFixLog } from "./debug.js";
import {
  OPENAI_ENDPOINT,
  OPENAI_MODEL,
  OPENAI_TIMEOUT_MS,
  OPENAI_TEMPERATURE,
  OPENAI_MAX_TOKENS
} from "./ai-system-prompt.js";

// ============================================================================
// Types
// ============================================================================

/** Fetch request options (subset used by OpenAI requests) */
export type FetchInit = {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
};

/** Fetch response shape */
export type FetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

/** Declare fetch for Figma's sandbox environment */
declare function fetch(url: string, init?: FetchInit): Promise<FetchResponse>;

/** OpenAI chat completion response structure */
export interface ChatCompletion {
  readonly choices?: readonly [
    {
      readonly message?: {
        readonly content?: string;
      };
    }
  ];
}

/** Parsed AI response shape (before sanitization) */
export interface AiResponseShape {
  readonly signals?: unknown;
  readonly layoutAdvice?: unknown;
}

/** Message content can be string or multimodal array */
export type MessageContent = string | readonly MessageContentPart[];

/** Individual content part for multimodal messages */
export interface MessageContentPart {
  readonly type: "text" | "image_url";
  readonly text?: string;
  readonly image_url?: {
    readonly url: string;
    readonly detail: "low" | "high" | "auto";
  };
}

/** Chat message structure */
export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: MessageContent;
}

/** OpenAI request configuration */
export interface OpenAiRequestConfig {
  readonly apiKey: string;
  readonly messages: readonly ChatMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

/** Result of an OpenAI request */
export interface OpenAiRequestResult {
  readonly success: boolean;
  readonly content?: string;
  readonly parsed?: AiResponseShape;
  readonly error?: string;
  readonly durationMs?: number;
}

// ============================================================================
// Core Client Functions
// ============================================================================

/**
 * Makes a request to the OpenAI API with timeout and error handling.
 * Returns parsed JSON content from the response.
 */
export async function makeOpenAiRequest(config: OpenAiRequestConfig): Promise<OpenAiRequestResult> {
  const {
    apiKey,
    messages,
    model = OPENAI_MODEL,
    temperature = OPENAI_TEMPERATURE,
    maxTokens = OPENAI_MAX_TOKENS,
    timeoutMs = OPENAI_TIMEOUT_MS
  } = config;

  const startTime = Date.now();

  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages
  };

  // Log the AI request for debugging (extract key parts to avoid excessive log size)
  const systemPrompt = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1];

  debugFixLog("AI REQUEST - System Prompt (first 500 chars)", {
    promptPreview: typeof systemPrompt?.content === "string"
      ? systemPrompt.content.slice(0, 500) + (systemPrompt.content.length > 500 ? "..." : "")
      : "[multimodal content]"
  });

  debugFixLog("AI REQUEST - User Message", {
    messageType: Array.isArray(lastUserMessage?.content) ? "multimodal" : "text",
    textContent: typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content.slice(0, 2000)
      : Array.isArray(lastUserMessage?.content)
        ? lastUserMessage.content
            .filter((p): p is { type: "text"; text?: string } => p.type === "text")
            .map(p => p.text?.slice(0, 2000))
            .join("")
        : "[unknown format]",
    hasImage: Array.isArray(lastUserMessage?.content) &&
      lastUserMessage.content.some(p => p.type === "image_url")
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
      timeoutMs
    );

    const durationMs = Date.now() - startTime;
    debugFixLog(`OPENAI_FETCH took ${durationMs}ms`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      const errorMessage = `OpenAI request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 500)}`;
      debugFixLog(errorMessage);

      return {
        success: false,
        error: errorMessage,
        durationMs
      };
    }

    const payload = (await response.json()) as ChatCompletion;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      debugFixLog("AI RESPONSE - No content received");
      return {
        success: false,
        error: "OpenAI response missing content",
        durationMs
      };
    }

    // Log the AI response for debugging
    debugFixLog("AI RESPONSE - Raw content", {
      contentLength: content.length,
      contentPreview: content.slice(0, 3000) + (content.length > 3000 ? "..." : "")
    });

    // Parse JSON content
    let parsed: AiResponseShape;
    try {
      parsed = JSON.parse(content) as AiResponseShape;
    } catch (parseError) {
      return {
        success: false,
        error: `OpenAI response was not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        content,
        durationMs
      };
    }

    // Log parsed structure for layout debugging
    debugFixLog("AI RESPONSE - Parsed structure", {
      hasSignals: !!parsed.signals,
      hasLayoutAdvice: !!parsed.layoutAdvice,
      layoutAdvicePreview: parsed.layoutAdvice
        ? JSON.stringify(parsed.layoutAdvice).slice(0, 2000)
        : "none"
    });

    return {
      success: true,
      content,
      parsed,
      durationMs
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugFixLog(`OpenAI request error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      durationMs
    };
  }
}

/**
 * Fetch with timeout using Promise.race pattern.
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
// Message Building Helpers
// ============================================================================

/**
 * Creates a system message.
 */
export function systemMessage(content: string): ChatMessage {
  return { role: "system", content };
}

/**
 * Creates a user message with text content.
 */
export function userMessage(content: string): ChatMessage {
  return { role: "user", content };
}

/**
 * Creates a user message with image and text content (multimodal).
 */
export function userMessageWithImage(
  imageBase64: string,
  textContent: string,
  detail: "low" | "high" | "auto" = "high"
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

/**
 * Creates a user message - with image if provided, otherwise text only.
 */
export function createUserMessage(
  textContent: string,
  imageBase64?: string | null
): ChatMessage {
  if (imageBase64) {
    return userMessageWithImage(imageBase64, textContent);
  }
  return userMessage(textContent);
}
