import type { AiFocalPoint, AiQaSignal, AiRole, AiRoleEvidence, AiSignals } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";
import { PLUGIN_NAME } from "./plugin-constants.js";

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

export interface FrameSummary {
  readonly id: string;
  readonly name: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly childCount: number;
  readonly nodes: readonly NodeSummary[];
}

export interface NodeSummary {
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
  readonly fontSize?: number | "mixed";
  readonly fontWeight?: string;
  readonly fillType?: string;
  readonly layoutMode?: AutoLayoutMixin["layoutMode"];
  readonly primaryAxisAlignItems?: AutoLayoutMixin["primaryAxisAlignItems"];
  readonly counterAxisAlignItems?: AutoLayoutMixin["counterAxisAlignItems"];
  readonly zIndex?: number;
  readonly opacity?: number;
  readonly dominantColor?: string;
}

export interface AiServiceResult {
  readonly signals?: AiSignals;
  readonly layoutAdvice?: LayoutAdvice;
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_SUMMARY_NODES = 24;
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
  "GENERIC",
  "EXCESSIVE_TEXT",
  "MISSING_CTA",
  "ASPECT_MISMATCH"
] as const;

declare const figma: PluginAPI;

const FEW_SHOT_MESSAGES = [
  // Example 1: Simple feature card
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex1",
        name: "Feature Card",
        size: { width: 400, height: 300 },
        childCount: 3,
        nodes: [
          { id: "n1", name: "Icon", type: "RECTANGLE", rel: { x: 20, y: 20, width: 40, height: 40 }, fillType: "IMAGE" },
          { id: "n2", name: "Title", type: "TEXT", rel: { x: 20, y: 80, width: 300, height: 30 }, text: "Analytics", fontSize: 24, fontWeight: "Bold" },
          { id: "n3", name: "Desc", type: "TEXT", rel: { x: 20, y: 120, width: 300, height: 60 }, text: "View your data.", fontSize: 16 }
        ]
      },
      targets: [{ id: "ig-story", width: 1080, height: 1920, label: "Story" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "n1", role: "logo", confidence: 0.9 },
          { nodeId: "n2", role: "title", confidence: 0.95 },
          { nodeId: "n3", role: "body", confidence: 0.8 }
        ],
        focalPoints: [{ nodeId: "n1", x: 0.1, y: 0.13, confidence: 0.9 }],
        qa: []
      },
      layoutAdvice: {
        entries: [
          {
            targetId: "ig-story",
            selectedId: "vertical-stack",
            score: 0.95,
            suggestedLayoutMode: "VERTICAL",
            description: "Stack content vertically for tall screen."
          }
        ]
      }
    })
  },
  // Example 2: Hero banner with background and CTA
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex2",
        name: "Product Launch Banner",
        size: { width: 1920, height: 960 },
        childCount: 5,
        nodes: [
          { id: "bg", name: "Background", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1920, height: 960 }, fillType: "IMAGE" },
          { id: "logo", name: "Brand Logo", type: "FRAME", rel: { x: 60, y: 40, width: 120, height: 48 }, fillType: "IMAGE" },
          { id: "headline", name: "Headline", type: "TEXT", rel: { x: 60, y: 380, width: 800, height: 80 }, text: "Introducing the Future of Design", fontSize: 64, fontWeight: "Bold" },
          { id: "sub", name: "Subheadline", type: "TEXT", rel: { x: 60, y: 480, width: 600, height: 40 }, text: "Available now on all platforms", fontSize: 24, fontWeight: "Regular" },
          { id: "cta", name: "CTA Button", type: "FRAME", rel: { x: 60, y: 560, width: 200, height: 56 }, fillType: "SOLID", layoutMode: "HORIZONTAL" }
        ]
      },
      targets: [{ id: "tiktok-vertical", width: 1080, height: 1920, label: "TikTok" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "bg", role: "hero_image", confidence: 0.95 },
          { nodeId: "logo", role: "logo", confidence: 0.92 },
          { nodeId: "headline", role: "title", confidence: 0.98 },
          { nodeId: "sub", role: "subtitle", confidence: 0.88 },
          { nodeId: "cta", role: "cta", confidence: 0.91 }
        ],
        focalPoints: [{ nodeId: "headline", x: 0.23, y: 0.48, confidence: 0.85 }],
        qa: [{ code: "SAFE_AREA_RISK", severity: "warn", message: "CTA near bottom edge for vertical targets", confidence: 0.72 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "tiktok-vertical",
          selectedId: "centered-stack",
          score: 0.88,
          suggestedLayoutMode: "VERTICAL",
          backgroundNodeId: "bg",
          description: "Stack elements vertically centered over hero background."
        }]
      }
    })
  },
  // Example 3: Social carousel tile (square, minimal)
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex3",
        name: "Carousel Slide",
        size: { width: 1080, height: 1080 },
        childCount: 2,
        nodes: [
          { id: "img", name: "Product Photo", type: "RECTANGLE", rel: { x: 0, y: 0, width: 1080, height: 800 }, fillType: "IMAGE" },
          { id: "caption", name: "Caption", type: "TEXT", rel: { x: 40, y: 840, width: 1000, height: 60 }, text: "New collection", fontSize: 32, fontWeight: "Medium" }
        ]
      },
      targets: [{ id: "web-hero", width: 1440, height: 600, label: "Web Hero" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "img", role: "hero_image", confidence: 0.94 },
          { nodeId: "caption", role: "title", confidence: 0.82 }
        ],
        focalPoints: [{ nodeId: "img", x: 0.5, y: 0.37, confidence: 0.88 }],
        qa: [{ code: "MISSING_CTA", severity: "info", message: "No clear call-to-action button", confidence: 0.75 }]
      },
      layoutAdvice: {
        entries: [{
          targetId: "web-hero",
          selectedId: "horizontal-split",
          score: 0.82,
          suggestedLayoutMode: "HORIZONTAL",
          description: "Arrange image and caption side by side for wide format."
        }]
      }
    })
  },
  // Example 4: Dense dashboard mockup
  {
    role: "system",
    name: "example_user",
    content: JSON.stringify({
      frame: {
        id: "ex4",
        name: "Dashboard Preview",
        size: { width: 1200, height: 800 },
        childCount: 12,
        nodes: [
          { id: "nav", name: "Navigation", type: "FRAME", rel: { x: 0, y: 0, width: 200, height: 800 }, fillType: "SOLID", layoutMode: "VERTICAL" },
          { id: "header", name: "Header", type: "FRAME", rel: { x: 200, y: 0, width: 1000, height: 60 }, fillType: "SOLID", layoutMode: "HORIZONTAL" },
          { id: "chart1", name: "Chart 1", type: "FRAME", rel: { x: 220, y: 80, width: 460, height: 300 }, fillType: "SOLID" },
          { id: "chart2", name: "Chart 2", type: "FRAME", rel: { x: 700, y: 80, width: 460, height: 300 }, fillType: "SOLID" },
          { id: "table", name: "Data Table", type: "FRAME", rel: { x: 220, y: 400, width: 940, height: 380 }, fillType: "SOLID", layoutMode: "VERTICAL" }
        ]
      },
      targets: [{ id: "figma-thumb", width: 480, height: 320, label: "Figma Thumbnail" }]
    })
  },
  {
    role: "system",
    name: "example_assistant",
    content: JSON.stringify({
      signals: {
        roles: [
          { nodeId: "nav", role: "decorative", confidence: 0.7 },
          { nodeId: "header", role: "decorative", confidence: 0.65 },
          { nodeId: "chart1", role: "secondary_image", confidence: 0.78 },
          { nodeId: "chart2", role: "secondary_image", confidence: 0.78 },
          { nodeId: "table", role: "list", confidence: 0.72 }
        ],
        focalPoints: [{ nodeId: "chart1", x: 0.35, y: 0.3, confidence: 0.7 }],
        qa: [
          { code: "UNCERTAIN_ROLES", severity: "info", message: "Complex UI with many similar elements", confidence: 0.68 },
          { code: "ASPECT_MISMATCH", severity: "warn", message: "Wide dashboard may lose detail in small thumbnail", confidence: 0.8 }
        ]
      },
      layoutAdvice: {
        entries: [{
          targetId: "figma-thumb",
          selectedId: "preserve-layout",
          score: 0.75,
          suggestedLayoutMode: "NONE",
          description: "Preserve original layout and scale uniformly for dashboard preview."
        }]
      }
    })
  }
];

export async function requestAiInsights(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  const summary = summarizeFrame(frame);
  const body = {
    model: OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are ${PLUGIN_NAME} Layout AI. Analyze marketing frame JSON and return ONLY JSON: {"signals":{roles,focalPoints,qa},"layoutAdvice":{entries}}.

ROLE CLASSIFICATION (confidence 0-1):
- logo: brand marks, usually top-left/right, small (<10% frame area)
- hero_image: largest visual, IMAGE fill, >40% frame area
- title: largest text by fontSize, typically <50 chars
- subtitle: second-largest text, near title, lighter weight
- body: paragraph text, fontSize 14-18px typically
- cta: buttons with SOLID fill containing text, action-oriented
- badge: small overlay chips at corners
- list: repeated similar elements
- decorative: shapes/gradients without semantic content

FOCAL POINTS: x,y normalized 0-1 from top-left. Place on primary visual interest (faces, products, logo center).

QA SIGNALS (emit only when confident):
- LOW_CONTRAST: text over similar-color background
- LOGO_TOO_SMALL: logo <3% of frame area
- TEXT_OVERLAP: text nodes with overlapping bounds
- SAFE_AREA_RISK: important content near edges
- EXCESSIVE_TEXT: body text >200 chars may be hard to read at small sizes
- MISSING_CTA: marketing frame without clear call-to-action
- ASPECT_MISMATCH: source layout poorly suited for target aspect ratio

LAYOUT ADVICE: For vertical targets (aspectRatio<0.6), suggest VERTICAL stacking. For wide targets (>2.0), use HORIZONTAL. Set backgroundNodeId when a node covers >90% area and should stay absolute. Keep JSON compact.`
      },
      ...FEW_SHOT_MESSAGES,
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

export function summarizeFrame(frame: FrameNode): FrameSummary {
  const frameBounds = frame.absoluteBoundingBox;
  const originX = frameBounds?.x ?? 0;
  const originY = frameBounds?.y ?? 0;

  const nodes: NodeSummary[] = [];
  const queue: SceneNode[] = [...frame.children];
  let zIndex = 0;

  while (queue.length > 0 && nodes.length < MAX_SUMMARY_NODES) {
    const node = queue.shift();
    if (!node || !node.visible) {
      continue;
    }
    const description = describeNode(node, originX, originY, zIndex);
    zIndex++;
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

function describeNode(node: SceneNode, originX: number, originY: number, zIndex: number): NodeSummary | null {
  if (!("absoluteBoundingBox" in node) || !node.absoluteBoundingBox) {
    return null;
  }
  const bounds = node.absoluteBoundingBox;
  const isText = node.type === "TEXT";
  const text = isText
    ? (node as TextNode).characters
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
    : undefined;

  let fontSize: number | "mixed" | undefined;
  let fontWeight: string | undefined;

  if (isText) {
    const tNode = node as TextNode;
    fontSize = tNode.fontSize === figma.mixed ? "mixed" : Math.round(tNode.fontSize as number);
    fontWeight = tNode.fontName === figma.mixed ? "mixed" : (tNode.fontName as FontName).style;
  }

  let fillType: string | undefined;
  let dominantColor: string | undefined;
  if ("fills" in node && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[];
    if (fills.some((f) => f.type === "IMAGE")) {
      fillType = "IMAGE";
    } else if (fills.some((f) => f.type === "SOLID")) {
      fillType = "SOLID";
      // Extract dominant color from first visible solid fill
      const solidFill = fills.find((f) => f.type === "SOLID" && f.visible !== false) as SolidPaint | undefined;
      if (solidFill) {
        const c = solidFill.color;
        const r = Math.round(c.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(c.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(c.b * 255).toString(16).padStart(2, "0");
        dominantColor = `#${r}${g}${b}`;
      }
    } else if (fills.length > 0) {
      fillType = "OTHER";
    }
  }

  // Extract opacity
  let opacity: number | undefined;
  if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
    opacity = round(node.opacity);
  }

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
    zIndex,
    ...(text ? { text } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(fillType ? { fillType } : {}),
    ...(dominantColor ? { dominantColor } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
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
