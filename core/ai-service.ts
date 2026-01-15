import type { AiSignals, EnhancedAiSignals } from "../types/ai-signals.js";
import type { LayoutAdvice } from "../types/layout-advice.js";
import { VARIANT_TARGETS } from "../types/targets.js";
import { normalizeLayoutAdvice } from "./layout-advice.js";
import { debugFixLog } from "./debug.js";
import { PLUGIN_NAME } from "./plugin-constants.js";
import { FEW_SHOT_MESSAGES } from "./ai-few-shot-examples.js";
import { sanitizeAiSignals } from "./ai-sanitization.js";
import { summarizeFrame, summarizeFrameEnhanced, type EnhancedFrameSummary } from "./ai-frame-summary.js";
import { analyzeTypographyHierarchy } from "./ai-hierarchy-detector.js";
import { detectGridSystem } from "./ai-layout-grid-detector.js";
import { detectContentRelationships } from "./ai-content-relationships.js";
import { generateContextAwarePrompt, type EnhancedAiRequest } from "./ai-dynamic-prompts.js";

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

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

/**
 * Maximum image dimension for AI analysis.
 * Balances quality with token cost - 1024px is sufficient for layout/face detection.
 */
const MAX_IMAGE_DIMENSION = 1024;

/**
 * Exports a frame as a base64-encoded PNG for vision analysis.
 * Constrains to MAX_IMAGE_DIMENSION to control token costs.
 */
async function exportFrameAsBase64(frame: FrameNode): Promise<string> {
  const scale = Math.min(
    MAX_IMAGE_DIMENSION / frame.width,
    MAX_IMAGE_DIMENSION / frame.height,
    2 // Cap at 2x to avoid excessive file sizes
  );

  const startExport = Date.now();
  const bytes = await frame.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: scale }
  });
  debugFixLog(`EXPORT_ASYNC took ${Date.now() - startExport}ms`);

  // Convert Uint8Array to base64 (Figma sandbox doesn't have btoa)
  const startBase64 = Date.now();
  const result = uint8ArrayToBase64(bytes);
  debugFixLog(`BASE64_CONVERSION took ${Date.now() - startBase64}ms`);
  return result;
}

/**
 * Converts Uint8Array to base64 string without using btoa.
 * Works in Figma's sandboxed plugin environment.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const len = bytes.length;
  const result: string[] = [];
  
  // Pre-allocate array to avoid resizing overhead (approximate)
  // result.length = Math.ceil(len / 3); 
  // Note: Direct assignment in loop is faster than push in some engines, 
  // but push is safer if we don't want to manage index manually. 
  // Let's use push for clarity as it's much faster than string += anyway.

  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = chars[b1 >> 2];
    const c2 = chars[((b1 & 3) << 4) | (b2 >> 4)];
    const c3 = i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    const c4 = i + 2 < len ? chars[b3 & 63] : "=";

    result.push(c1 + c2 + c3 + c4);
  }

  return result.join("");
}

export async function requestAiInsights(frame: FrameNode, apiKey: string): Promise<AiServiceResult | null> {
  const startTotal = Date.now();
  const summary = summarizeFrame(frame);

  // Export frame as image for vision analysis
  let imageBase64: string | null = null;
  try {
    const startExport = Date.now();
    imageBase64 = await exportFrameAsBase64(frame);
    debugFixLog(`EXPORT_FRAME took ${Date.now() - startExport}ms`);
    debugFixLog("frame exported for vision analysis", {
      frameId: frame.id,
      imageSize: imageBase64.length
    });
  } catch (error) {
    debugFixLog("frame export failed, continuing without image", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
  const body = {
    model: OPENAI_MODEL,
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are ${PLUGIN_NAME} Layout AI. Analyze Figma marketing frames and provide intelligent layout adaptation recommendations for multiple target formats.

## OUTPUT FORMAT
Return ONLY valid JSON with this exact structure:
{
  "signals": {
    "roles": [{nodeId, role, confidence}],
    "focalPoints": [{nodeId, x, y, confidence}],
    "qa": [{code, severity, message, confidence}],
    "faceRegions": [{nodeId, x, y, width, height, confidence}]
  },
  "layoutAdvice": {
    "entries": [{
      targetId, selectedId, score, suggestedLayoutMode, backgroundNodeId?, description,
      feasibility?: {achievable, requiresRestructure, predictedFill, uniformScaleResult?},
      restructure?: {contentPriority, drop?, keepRequired, arrangement?, textTreatment?},
      positioning?: {[nodeId]: {region, size?, maxLines?}},
      warnings?: [{code, message, severity}]
    }]
  }
}
CRITICAL REQUIREMENTS:
1. layoutAdvice.entries MUST contain exactly 17 entries, one for each target ID: figma-cover, figma-gallery, figma-thumbnail, web-hero, social-carousel, youtube-cover, tiktok-vertical, youtube-shorts, instagram-reels, gumroad-cover, gumroad-thumbnail, facebook-cover, landscape-feed, youtube-thumbnail, youtube-video, display-leaderboard, display-rectangle
2. Always include faceRegions array (empty [] if no faces detected)

## ROLE CLASSIFICATION (confidence 0-1)
Classify each node by semantic role:
- logo: Brand marks. <10% frame area, corner positioned, IMAGE fill
- hero_image: Primary visual. IMAGE fill, >40% area, often lowest z-index
- hero_bleed: Image/element that INTENTIONALLY extends beyond or is cropped by frame bounds. Patterns include: (1) device mockups at angles with edges cut off, (2) portrait photos cropped at head/shoulders, (3) landscape photos bleeding to frame edges, (4) any image positioned so part is "outside" the frame. Recognizable by: off-center near edge, visually "cut off", often large scale. CRITICAL: preserve edge-relative position when scaling - do not try to fit entirely within safe area
- background: Full-bleed layer. >90% coverage, bottom z-index, no text children
- secondary_image: Supporting visual. Smaller than hero_image
- title: Primary headline. Largest fontSize, Bold weight, <60 chars
- subtitle: Secondary text. Second-largest fontSize, near title, lighter weight
- body: Paragraph content. fontSize 14-18px, >60 chars
- caption: Small text near images. fontSize <14px
- cta: Action buttons. Rounded shape, SOLID fill, short action text ("Get Started", "Learn More")
- cta_secondary: Secondary actions. Outline style or lighter fill
- icon: Small symbolic images. <64px square, near text labels
- badge: Overlay chips. Small, corner-positioned ("New", "Sale")
- price: Pricing info. Contains "$" or currency, medium fontSize
- testimonial: Quotes with attribution
- rating: Star ratings, numeric scores
- list: Repeated similar structures
- feature_item: Single item in a feature list
- divider: Thin separators
- container: Grouping frames
- decorative: Non-semantic shapes, gradients

## CONFIDENCE CALIBRATION
- 0.90-1.00: Unambiguous match (e.g., text with "Get Started" in button = cta)
- 0.75-0.89: Strong match with minor ambiguity
- 0.60-0.74: Likely match but competing interpretations possible
- <0.60: Weak match, use "unknown" or omit

## FOCAL POINTS
Identify 1-2 primary visual attention points (x,y normalized 0-1 from top-left):
- Face/eyes in photos
- Product centers
- Logo center for brand-focused content
- Title start for text-heavy content

## FACE DETECTION
For frames containing photographs with people, detect face regions and report in signals.faceRegions:
{
  "nodeId": "node containing the face",
  "x": 0.5,        // Face center X (0-1 from frame left)
  "y": 0.3,        // Face center Y (0-1 from frame top)
  "width": 0.2,    // Face width as frame ratio
  "height": 0.25,  // Face height as frame ratio
  "confidence": 0.85
}

Face detection guidelines:
- Report faces ONLY in IMAGE fills (photos, not illustrations unless clearly a portrait)
- Minimum face size: 5% of frame area (ignore tiny background faces)
- For headshots/portraits, face region should encompass head through shoulders
- For group photos, report up to 3 most prominent faces
- For product photos with model, focus on faces near product

When to report face regions:
- Profile photos, headshots, team photos
- Product photography with human models
- Marketing imagery featuring people
- Tutorial/creator content with visible presenter
Do NOT report: icons, avatars <64px, cartoon illustrations, hands-only shots

## TRANSFORMATION FEASIBILITY (CRITICAL - analyze for EACH target)

Before recommending a pattern, calculate whether the transformation is achievable:

1. ASPECT RATIO DELTA
   - Source AR = source_width / source_height
   - Target AR = target_width / target_height
   - Delta = max(Source AR, Target AR) / min(Source AR, Target AR)
   - If delta > 4x AND source has vertically stacked elements → MAJOR restructuring required

2. UNIFORM SCALE SIMULATION
   - Calculate: uniform_scale = min(target_width/source_width, target_height/source_height)
   - Scaled content width = source_width × uniform_scale
   - Scaled content height = source_height × uniform_scale
   - predictedFill = (scaled_width × scaled_height) / (target_safe_area)
   - If predictedFill < 0.4 → Content will cluster in center, emit CONTENT_DENSITY_MISMATCH

3. HEIGHT CONSTRAINT CHECK (critical for targets with height < 200px)
   - Count vertically stacked content elements in source
   - If stacked_count > 2 AND target_height < 150px → Elements won't fit vertically
   - MUST specify elements to drop in restructure.drop

Report feasibility in EACH layoutAdvice entry:
{
  "feasibility": {
    "achievable": true,
    "requiresRestructure": true,
    "predictedFill": 0.82,
    "uniformScaleResult": "10% scale would create 60×90 content in 728×90 frame (8% width coverage)"
  }
}

## RESTRUCTURING PLAN (required when feasibility.requiresRestructure = true)

When transformation requires dropping elements or changing arrangement, specify:

{
  "restructure": {
    "contentPriority": ["logo", "title", "cta"],
    "drop": ["hero_image", "subtitle"],
    "keepRequired": ["logo", "title"],
    "arrangement": "horizontal",
    "textTreatment": "single-line"
  }
}

Content Priority Guidelines (in order):
1. logo - Brand identity, always try to keep
2. title - Primary message, essential
3. cta - Conversion action, important for marketing
4. subtitle - Supporting message, can drop if needed
5. hero_image - DROP FIRST for extreme horizontal targets (height < 200px)
6. secondary_image, body text - Drop for small/constrained targets

Arrangement options:
- "horizontal": Spread elements left-to-right (for wide targets)
- "vertical": Stack top-to-bottom (for tall targets)
- "stacked": Overlay elements (for layered patterns)

textTreatment options:
- "single-line": Force text to one line (for leaderboards)
- "wrap": Allow natural wrapping
- "truncate": Cut off with ellipsis if needed

## PLUGIN CAPABILITIES (understand what transformations are possible)

The plugin CAN:
- Change layoutMode (HORIZONTAL/VERTICAL/NONE)
- Adjust alignment (MIN/CENTER/MAX/SPACE_BETWEEN)
- Scale all content uniformly
- Set spacing and padding
- Move backgrounds to absolute positioning
- HIDE elements marked in restructure.drop (sets visible: false)

The plugin CANNOT:
- Reorder elements (z-order is fixed)
- Move elements between containers
- Split text into multiple boxes
- Change font sizes independently per element

If your recommendation requires hiding elements to make transformation work:
- Add node IDs/names to restructure.drop
- The plugin will set visible: false on those elements
- Emit ASPECT_MISMATCH QA signal to warn user

## QA SIGNALS (emit only when confident)
Existing:
- LOW_CONTRAST: Text color too similar to background
- LOGO_TOO_SMALL: Logo <3% of frame area
- TEXT_OVERLAP: Text nodes with intersecting bounds
- SAFE_AREA_RISK: Important content within 5% of edges
- EXCESSIVE_TEXT: Body text >200 chars
- MISSING_CTA: Marketing frame without call-to-action
- ASPECT_MISMATCH: Source poorly suited for target aspect ratio

Target-specific:
- TEXT_TOO_SMALL_FOR_TARGET: Text will be <9px after scaling to small targets
- THUMBNAIL_LEGIBILITY: Fine details won't render at 480x320
- CONTENT_DENSITY_MISMATCH: Too much/little content for target
- OVERLAY_CONFLICT: Content in platform UI zones (TikTok/YouTube)
- CTA_PLACEMENT_RISK: CTA in platform-obscured zone
- HIERARCHY_UNCLEAR: No clear size/weight differentiation

Accessibility signals (WCAG compliance):
- COLOR_CONTRAST_INSUFFICIENT: Text-background contrast below WCAG AA (4.5:1 normal, 3:1 large text)
- TEXT_TOO_SMALL_ACCESSIBLE: Text smaller than 12px accessibility threshold
- INSUFFICIENT_TOUCH_TARGETS: Interactive elements smaller than 44x44px (mobile accessibility)
- HEADING_HIERARCHY_BROKEN: H1→H3 skips or improper heading nesting order
- POOR_FOCUS_INDICATORS: Buttons/links lack visible focus states or contrast
- MOTION_SENSITIVITY_RISK: Rapid animations that may trigger vestibular disorders
- MISSING_ALT_EQUIVALENT: Images without nearby descriptive text
- POOR_READING_ORDER: Elements don't follow logical left-to-right, top-to-bottom sequence

Design quality signals:
- TYPOGRAPHY_INCONSISTENCY: Mixed font families, conflicting weights, or inconsistent scales
- COLOR_HARMONY_POOR: Clashing colors, poor palette coherence, or excessive color variety
- SPACING_INCONSISTENCY: Irregular padding, margins, or misaligned grid elements
- VISUAL_WEIGHT_IMBALANCED: Poor focal hierarchy, competing visual elements, unbalanced composition
- BRAND_CONSISTENCY_WEAK: Inconsistent brand colors, logo usage, or style deviations
- CONTENT_HIERARCHY_FLAT: No clear information hierarchy or visual flow guidance

## TARGET-SPECIFIC LAYOUT GUIDANCE (ALL 15 TARGETS - provide advice for EACH)

figma-cover (1920x960): Room for horizontal spreading. Patterns: layered-hero, split-left, horizontal-stack, banner-spread.

figma-gallery (1600x960): Similar to cover. Patterns: layered-hero, split-left, horizontal-stack.

figma-thumbnail (480x320): Legibility critical. Patterns: compact-vertical, centered-stack, preserve-layout. Min fontSize after scale: 9px.

web-hero (1440x600): Ultra-wide, spread elements across width. Patterns: banner-spread, split-left, split-right, layered-gradient. Avoid centered-stack.

social-carousel (1080x1080): Balanced square composition. Patterns: centered-stack, layered-hero, text-first, hero-first.

youtube-cover (2560x1440): Keep critical content in center safe zone, avoid bottom 240px. Patterns: layered-hero, banner-spread, centered-stack.

tiktok-vertical (1080x1920): Extreme vertical, large text (24px+). Top 108px and bottom 320px are platform UI zones. Patterns: centered-stack, vertical-stack, hero-first, text-first.

youtube-shorts (1080x1920): Extreme vertical like TikTok. Top 200px and bottom 200px are platform UI zones. Patterns: centered-stack, vertical-stack, hero-first, text-first.

instagram-reels (1080x1920): Extreme vertical. Top 108px and bottom 280px are platform UI zones. Patterns: centered-stack, vertical-stack, hero-first, text-first.

gumroad-cover (1280x720): Product display 16:9. Patterns: split-left, layered-hero, horizontal-stack.

gumroad-thumbnail (600x600): Small square, max impact. Patterns: centered-stack, compact-vertical, hero-first. 1-2 elements for clarity.

facebook-cover (820x312): Wide banner (AR=2.63). HEIGHT CONSTRAINT: Only ~250px usable height.
  - If source has >3 stacked elements, drop secondary images
  - Patterns: banner-spread, split-left, horizontal-stack
  - Keep content in center 70%, set feasibility.requiresRestructure if source is vertical

landscape-feed (1200x628): Standard feed aspect ~1.9:1. Patterns: split-left, split-right, layered-hero, horizontal-stack.

youtube-thumbnail (1280x720): Video preview 16:9, needs high impact. Patterns: layered-hero, split-left, centered-stack. Large readable text.

youtube-video (1920x1080): Full HD 16:9. Patterns: layered-hero, split-left, horizontal-stack, banner-spread.

display-leaderboard (728x90): EXTREME horizontal (AR=8.09). HEIGHT CONSTRAINT CRITICAL - only ~70px usable.
  - Max 2 elements can stack vertically (logo ~32px + text ~32px)
  - MUST DROP hero_image/screenshots - they will not fit
  - Text MUST be single-line (set textTreatment: "single-line")
  - Patterns: horizontal-stack, banner-spread
  - ALWAYS set feasibility.requiresRestructure = true if source has >2 stacked elements
  - ALWAYS emit ASPECT_MISMATCH if source has images that won't fit

display-rectangle (300x250): Compact display ad (AR=1.2). Limited space but more height than leaderboard.
  - Can fit 3-4 stacked elements if they're compact
  - Patterns: compact-vertical, centered-stack, vertical-stack
  - Maximize legibility, drop secondary content if needed

## LAYOUT ADVICE OUTPUT
CRITICAL: You MUST provide exactly 17 entries in layoutAdvice.entries, one for each target ID above.

For EACH target provide:
- selectedId: Best-fit pattern (horizontal-stack, vertical-stack, centered-stack, split-left, split-right, layered-hero, layered-gradient, hero-first, text-first, compact-vertical, banner-spread, preserve-layout)
- score: Confidence 0-1
- suggestedLayoutMode: HORIZONTAL, VERTICAL, or NONE
- backgroundNodeId: Node ID for >90% coverage layer (if applicable)
- description: 1-sentence rationale explaining the recommendation

For EXTREME aspect ratio targets (leaderboard, facebook-cover, web-hero, tiktok-vertical, youtube-shorts, instagram-reels), ALSO provide:
- feasibility: {achievable, requiresRestructure, predictedFill (0-1), uniformScaleResult}
- restructure: {contentPriority, drop (node IDs to hide), keepRequired, arrangement, textTreatment} - REQUIRED if requiresRestructure=true
- positioning: {nodeId: {region, size}} for elements that need specific placement

ALWAYS emit feasibility for these extreme targets even if achievable=true and requiresRestructure=false.`
      },
      ...FEW_SHOT_MESSAGES,
      {
        role: "user",
        content: imageBase64
          ? [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: "high" as const
                }
              },
              {
                type: "text",
                text: JSON.stringify({
                  frame: summary,
                  targets: VARIANT_TARGETS
                })
              }
            ]
          : JSON.stringify({
              frame: summary,
              targets: VARIANT_TARGETS
            })
      }
    ]
  };

  const fetchPromise = fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const timeoutPromise = new Promise<FetchResponse>((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out after 60s")), 60000);
  });

  const startFetch = Date.now();
  const response = await Promise.race([fetchPromise, timeoutPromise]);
    debugFixLog(`OPENAI_FETCH took ${Date.now() - startFetch}ms`);

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
      faceRegions: signals?.faceRegions?.length ?? 0,
      focalPoints: signals?.focalPoints.length ?? 0,
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
  let imageBase64: string | null = null;
  try {
    const startExport = Date.now();
    imageBase64 = await exportFrameAsBase64(frame);
    debugFixLog(`ENHANCED_EXPORT_FRAME took ${Date.now() - startExport}ms`);
  } catch (error) {
    debugFixLog("enhanced frame export failed, continuing without image", {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Prepare enhanced AI request using the same proven format as the original
  const enhancedRequestData = {
    frame: enhancedSummary,
    structural: structuralAnalysis,
    targets: VARIANT_TARGETS
  };

  const body = {
    model: OPENAI_MODEL,
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: dynamicPrompt
      },
      ...FEW_SHOT_MESSAGES,
      {
        role: "user",
        content: imageBase64
          ? [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                  detail: "high" as const
                }
              },
              {
                type: "text",
                text: JSON.stringify(enhancedRequestData)
              }
            ]
          : JSON.stringify(enhancedRequestData)
      }
    ]
  };

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error response");
      const errorMessage = `Enhanced AI request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 500)}`;
      debugFixLog(errorMessage);

      // Return detailed error for debugging
      return {
        success: false,
        error: errorMessage
      };
    }

    const data = (await response.json()) as ChatCompletion;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      debugFixLog("Enhanced AI response missing content");
      return null;
    }

    const parsedResponse = JSON.parse(content) as AiResponseShape;

    // Debug: Log raw AI response structure (cast to any for debug inspection)
    const rawSignals = parsedResponse.signals as { roles?: unknown[]; qa?: unknown[] } | undefined;
    const rawLayoutAdvice = parsedResponse.layoutAdvice as { entries?: unknown[] } | undefined;
    debugFixLog("AI raw response structure", {
      hasSignals: !!parsedResponse.signals,
      signalsRolesCount: rawSignals?.roles?.length ?? 0,
      signalsQaCount: rawSignals?.qa?.length ?? 0,
      hasLayoutAdvice: !!parsedResponse.layoutAdvice,
      layoutAdviceEntriesCount: rawLayoutAdvice?.entries?.length ?? 0,
      rawLayoutAdviceKeys: parsedResponse.layoutAdvice ? Object.keys(parsedResponse.layoutAdvice as object) : [],
      firstEntryPreview: rawLayoutAdvice?.entries?.[0]
        ? JSON.stringify(rawLayoutAdvice.entries[0]).slice(0, 500)
        : "no entries"
    });

    // Sanitize and enhance signals
    const signals = sanitizeAiSignals(parsedResponse.signals);
    const layoutAdvice = normalizeLayoutAdvice(parsedResponse.layoutAdvice);

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
    debugFixLog("Enhanced AI request failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
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
