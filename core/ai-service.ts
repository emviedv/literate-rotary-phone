import type { AiFocalPoint, AiQaSignal, AiRole, AiRoleEvidence, AiSignals } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";

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

interface AiResponseShape {
  readonly signals?: unknown;
  readonly layoutAdvice?: unknown;
}

interface ChatCompletion {
  readonly choices?: readonly [
    {
      readonly message?: {
        readonly content?: string;
      };
    }
  ];
}

interface FrameSummary {
  readonly id: string;
  readonly name: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly childCount: number;
  readonly nodes: readonly NodeSummary[];
}

interface NodeSummary {
  readonly id: string;
  readonly name: string;
  readonly type: SceneNode["type"];
  readonly rel: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly text?: string;
  readonly layoutMode?: AutoLayoutMixin["layoutMode"];
  readonly primaryAxisAlignItems?: AutoLayoutMixin["primaryAxisAlignItems"];
  readonly counterAxisAlignItems?: AutoLayoutMixin["counterAxisAlignItems"];
}

export interface AiServiceResult {
  readonly signals?: AiSignals;
  readonly layoutAdvice?: LayoutAdvice;
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_SUMMARY_NODES = 32;
const VALID_ROLES: readonly AiRole[] = [
  "logo",
  "hero_image",
  "secondary_image",
  "title",
  "subtitle",
  "body",
  "cta",
  "badge",
  "list",
  "decorative",
  "unknown"
] as const;
const VALID_QA_CODES: readonly AiQaSignal["code"][] = [
  "LOW_CONTRAST",
  "LOGO_TOO_SMALL",
  "TEXT_OVERLAP",
  "UNCERTAIN_ROLES",
  "SALIENCE_MISALIGNED",
  "SAFE_AREA_RISK",
  "GENERIC"
] as const;

export async function requestAiInsights(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  const summary = summarizeFrame(frame);
  const body = {
    model: OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are Biblio Layout AI. Analyze a marketing frame summary and respond ONLY with JSON object {\"signals\":{roles,focalPoints,qa},\"layoutAdvice\":{entries}}. roles array must include nodeId, role, confidence 0-1. Focal points require x,y,confidence 0-1. QA codes should match LOW_CONTRAST, LOGO_TOO_SMALL, TEXT_OVERLAP, UNCERTAIN_ROLES, SALIENCE_MISALIGNED, SAFE_AREA_RISK, GENERIC. Layout advice entries list targetId from provided list with options (id,label,description,score 0-1) ranked by score. Return stack-friendly options for vertical targets. Keep JSON compact without commentary."
      },
      {
        role: "user",
        content: JSON.stringify({
          frame: summary,
          targets: VARIANT_TARGETS
        })
      }
    ]
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status} ${response.statusText}): ${message.slice(0, 200)}`);
  }

  const payload = (await response.json()) as ChatCompletion;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing content.");
  }

  let parsed: AiResponseShape;
  try {
    parsed = JSON.parse(content) as AiResponseShape;
  } catch (error) {
    throw new Error(`OpenAI response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const signals = sanitizeAiSignals(parsed.signals);
  const layoutAdvice = normalizeLayoutAdvice(parsed.layoutAdvice);

  debugFixLog("ai service parsed response", {
    roles: signals?.roles.length ?? 0,
    qa: signals?.qa.length ?? 0,
    layoutTargets: layoutAdvice?.entries.length ?? 0
  });

  if (!signals && !layoutAdvice) {
    return null;
  }

  return {
    signals,
    layoutAdvice: layoutAdvice ?? undefined
  };
}

function summarizeFrame(frame: FrameNode): FrameSummary {
  const frameBounds = frame.absoluteBoundingBox;
  const originX = frameBounds?.x ?? 0;
  const originY = frameBounds?.y ?? 0;

  const nodes: NodeSummary[] = [];
  const queue: SceneNode[] = [...frame.children];

  while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
    const node = queue.shift();
    if (!node || !node.visible) {
      continue;
    }
    const description = describeNode(node, originX, originY);
    if (description) {
      nodes.push(description);
    }
    if ("children" in node) {
      queue.push(...node.children);
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    size: {
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    },
    childCount: frame.children.length,
    nodes
  };
}

function describeNode(node: SceneNode, originX: number, originY: number): NodeSummary | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }
  const bounds = node.absoluteBoundingBox;
  const text =
    node.type === "TEXT"
      ? node.characters
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160)
      : undefined;

  const layoutDetails =
    "layoutMode" in node && node.layoutMode && node.layoutMode !== "NONE"
      ? {
          layoutMode: node.layoutMode,
          primaryAxisAlignItems: node.primaryAxisAlignItems,
          counterAxisAlignItems: node.counterAxisAlignItems
        }
      : {};

  return {
    id: node.id,
    name: node.name || node.type,
    type: node.type,
    rel: {
      x: round(bounds.x - originX),
      y: round(bounds.y - originY),
      width: round(bounds.width),
      height: round(bounds.height)
    },
    ...(text ? { text } : {}),
    ...layoutDetails
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sanitizeAiSignals(raw: unknown): AiSignals | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const roles = Array.isArray((raw as { roles?: unknown[] }).roles)
    ? (raw as { roles: unknown[] }).roles
        .map((entry) => sanitizeRole(entry))
        .filter((entry): entry is AiRoleEvidence => Boolean(entry))
    : [];
  const focalPoints = Array.isArray((raw as { focalPoints?: unknown[] }).focalPoints)
    ? (raw as { focalPoints: unknown[] }).focalPoints
        .map((entry) => sanitizeFocal(entry))
        .filter((entry): entry is AiFocalPoint => Boolean(entry))
    : [];
  const qa = Array.isArray((raw as { qa?: unknown[] }).qa)
    ? (raw as { qa: unknown[] }).qa.map((entry) => sanitizeQa(entry)).filter((entry): entry is AiQaSignal => Boolean(entry))
    : [];

  if (roles.length === 0 && focalPoints.length === 0 && qa.length === 0) {
    return undefined;
  }

  return {
    roles,
    focalPoints,
    qa
  };
}

function sanitizeRole(entry: unknown): AiRoleEvidence | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const role = (entry as { role?: unknown }).role;
  if (typeof nodeId !== "string" || typeof role !== "string") {
    return null;
  }

  const normalizedRole = role
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase() as AiRole;
  if (!VALID_ROLES.includes(normalizedRole)) {
    return null;
  }

  const confidence = clampToUnit((entry as { confidence?: unknown }).confidence);
  return {
    nodeId,
    role: normalizedRole,
    confidence: confidence ?? 0.5
  };
}

function sanitizeFocal(entry: unknown): AiFocalPoint | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const nodeId = (entry as { nodeId?: unknown }).nodeId;
  const rawX = (entry as { x?: unknown }).x;
  const rawY = (entry as { y?: unknown }).y;
  if (typeof rawX !== "number" || typeof rawY !== "number") {
    return null;
  }
  return {
    nodeId: typeof nodeId === "string" ? nodeId : "",
    x: clampValue(rawX),
    y: clampValue(rawY),
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence) ?? 0.5
  };
}

function sanitizeQa(entry: unknown): AiQaSignal | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const code = (entry as { code?: unknown }).code;
  if (typeof code !== "string") {
    return null;
  }
  const normalizedCode = code.trim().toUpperCase() as AiQaSignal["code"];
  if (!VALID_QA_CODES.includes(normalizedCode)) {
    return null;
  }
  const severityRaw = (entry as { severity?: unknown }).severity;
  const severity = severityRaw === "info" ? "info" : severityRaw === "error" ? "error" : "warn";
  const message = (entry as { message?: unknown }).message;
  return {
    code: normalizedCode,
    severity,
    message: typeof message === "string" ? message : undefined,
    confidence: clampToUnit((entry as { confidence?: unknown }).confidence)
  };
}

function clampToUnit(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const normalized = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.min(Math.max(normalized, 0), 1);
}

function clampValue(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
