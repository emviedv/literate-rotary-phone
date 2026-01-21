# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ScaleResizer** is a Figma plugin that automates transformation of marketing frames into multiple format variants (covers, banners, social tiles, YouTube, TikTok, etc.) while preserving original assets and branding.

- **Type:** TypeScript Figma plugin with ESBuild compilation
- **Entry Point:** `core/main.ts` → bundles to `dist/main.js` (IIFE format)
- **Architecture:** Message-driven plugin core + UI template injected into Figma iframe
- **Testing:** Custom Node.js-based test runner (no external test framework)

## Development Commands

```bash
# Development workflow
npm install          # Install dependencies
npm run dev          # Watch mode - rebuilds on file changes
npm run build        # Full ESBuild compilation to dist/main.js

# Testing & validation
npm run test         # Run custom test suite (tests/run-tests.mjs)
npm run typecheck    # TypeScript validation without emit
npm run check        # typecheck + test combined

# Utilities
npm run clean        # Remove dist/ and build-tests/
npm run size         # LOC analysis via tools/loc-top20.js
```

## Core Architecture

### Message-Driven Plugin System
- **Core ↔ UI Communication:** Via `figma.ui.postMessage()` / `onmessage` handlers
- **Protocol Types:** `ToCoreMessage` and `ToUIMessage` in `types/messages.ts`
- **Entry Point:** `core/main.ts` orchestrates all plugin operations

### Key Architectural Modules

| Module | Responsibility | Key Functions |
|--------|----------------|---------------|
| `core/main.ts` | Plugin entry, message dispatch, orchestration | Entry point, state management |
| `core/variant-scaling.ts` | Core scaling engine with aspect ratio handling | `scaleNodeTree()`, `AutoLayoutSnapshot` |
| `core/auto-layout-adapter.ts` | Layout restructuring for extreme aspect ratios | `createLayoutAdaptationPlan()`, `applyLayoutAdaptation()` |
| `core/ai-orchestration.ts` | Two-phase AI request coordinator | `requestChainedAiInsights()` |
| `core/ai-openai-client.ts` | Centralized OpenAI API client | `makeOpenAiRequest()` |
| `core/ai-system-prompt.ts` | System prompt templates (VERSION 9) | `buildSystemPrompt()`, `OPENAI_MODEL` |
| `core/ai-vision-prompt.ts` | Phase 1 vision-only prompts | `VISION_ONLY_PROMPT`, `parseVisionResponse()` |
| `core/ai-layout-prompt.ts` | Phase 2 layout generation prompts | `buildLayoutPromptWithFacts()` |
| `core/ai-image-export.ts` | Frame-to-base64 export for vision | `tryExportFrameAsBase64()` |
| `core/ai-error-recovery.ts` | AI failure recovery mechanisms | Graceful degradation handling |
| `core/ai-service.ts` | Legacy AI integration (fallback) | `requestAiInsights()`, `summarizeFrame()` |
| `core/collision-validator.ts` | Collision detection system | Validates text/subject overlap |
| `core/auto-layout-management.ts` | Layout management utilities | Auto-layout state management |
| `core/leaderboard-kill-switch.ts` | Feature toggle for extreme banners | Handles <115px height targets |
| `core/layout-profile.ts` | Target aspect ratio classification | `resolveLayoutProfile()` |
| `core/content-analyzer.ts` | Frame content analysis and hierarchy | `analyzeContent()` |
| `core/run-ops.ts` | Staging page and variant organization | `ensureStagingPage()`, `createRunContainer()` |

### Data Architecture
- **Plugin Data Storage:** All state persisted via `node.setPluginData(key, value)`
- **Data Keys:** Prefixed with `biblioscale:` (see `plugin-constants.ts`)
- **AI Results:** Cached on frame nodes to avoid redundant API calls
- **Run Organization:** Variants grouped in timestamped containers on dedicated staging page

## Supported Variant Targets (17 Formats)

From `types/targets.ts`:

### Figma Community
- `figma-cover`: 1920×960 (Community cover)
- `figma-gallery`: 1600×960 (Gallery preview)
- `figma-thumbnail`: 480×320 (Thumbnail)

### Web & Social
- `web-hero`: 1440×600 (Responsive hero banner)
- `social-carousel`: 1080×1080 (Square carousel tile)
- `landscape-feed`: 1200×628 (Facebook/LinkedIn/Twitter feed)

### YouTube
- `youtube-cover`: 2560×1440 (Channel cover)
- `youtube-thumbnail`: 1280×720 (Video thumbnail)
- `youtube-video`: 1920×1080 (Standard video)
- `youtube-shorts`: 1080×1920 (Vertical short)

### Vertical Video
- `tiktok-vertical`: 1080×1920 (TikTok portrait)
- `instagram-reels`: 1080×1920 (Instagram Reels)

### E-commerce
- `gumroad-cover`: 1280×720 (Product cover)
- `gumroad-thumbnail`: 600×600 (Store thumbnail)

### Social & Display Ads
- `facebook-cover`: 820×312 (Page cover)
- `display-leaderboard`: 728×90 (Banner ad)
- `display-rectangle`: 300×250 (Medium rectangle ad)

## Layout System

### 11 Semantic Layout Patterns (`types/layout-patterns.ts`)
1. `horizontal-stack` - Left-to-right flow
2. `vertical-stack` - Top-to-bottom flow
3. `centered-stack` - Centered vertical (logo→title→subtitle→cta)
4. `split-left` - Image left, text right
5. `split-right` - Text left, image right
6. `layered-hero` - Text overlaid on hero image
7. `layered-gradient` - Text over gradient overlay
8. `hero-first` - Large hero at top, content below
9. `text-first` - Title/text top, image below
10. `compact-vertical` - Tight layout for small thumbnails
11. `preserve-layout` - Scale-only (no restructuring)

### AI-Powered Analysis
- **Node Role Classification:** 7-role taxonomy (see below)
- **QA Signal Detection:** Automated warnings for contrast, sizing, overlap, accessibility
- **Layout Recommendations:** Confidence-scored pattern suggestions per target
- **Vision Analysis:** OpenAI GPT-4o integration with two-phase orchestration

## AI Integration

### Two-Phase Orchestration (`core/ai-orchestration.ts`)

ScaleResizer uses **Prompt Chaining** - a reliability technique that splits AI analysis into two sequential requests:

**Phase 1 (Vision):** Extract visual facts without layout reasoning
- Face region detection with normalized coordinates
- Subject occupancy classification (left/right/center)
- Compositional intent detection
- No layout decisions made

**Phase 2 (Layout):** Generate layout advice using vision facts as constraints
- Vision facts injected as immutable constraints
- Per-target layout pattern recommendations
- Positioning advice with face avoidance
- Restructuring suggestions (hide/show nodes)

**Benefits:**
- Prevents "contextual drift" where layout concerns affect visual perception
- Face regions become immutable facts, not suggestions
- Graceful fallback to single-request flow if Phase 1 fails

### AI Modules

| Module | Purpose |
|--------|---------|
| `ai-orchestration.ts` | Two-phase request coordinator |
| `ai-openai-client.ts` | Centralized OpenAI API client with retry logic |
| `ai-system-prompt.ts` | System prompt templates (VERSION 9) |
| `ai-vision-prompt.ts` | Phase 1 vision-only prompt |
| `ai-layout-prompt.ts` | Phase 2 layout generation prompt |
| `ai-image-export.ts` | Frame-to-base64 PNG export |
| `ai-error-recovery.ts` | Failure recovery and graceful degradation |
| `ai-sanitization.ts` | Response validation and cleanup |
| `ai-frame-summary.ts` | Node tree traversal for context |
| `ai-few-shot-examples.ts` | Example-based prompt engineering |
| `ai-dynamic-prompts.ts` | Runtime prompt customization |

### OpenAI Configuration (`core/ai-system-prompt.ts`)
```typescript
OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o"
MAX_IMAGE_DIMENSION = 1024
OPENAI_TEMPERATURE = 0.1
OPENAI_MAX_TOKENS = 4096
OPENAI_TIMEOUT_MS = 60000
```

### Simplified Role Taxonomy (7 Roles)

The AI classifies nodes into a universal 7-role taxonomy designed for diverse content:

| Role | Description |
|------|-------------|
| `subject` | Primary focal point: person, device mockup, chart, product image |
| `branding` | Logos and brand marks |
| `typography` | Headings, body text, captions - all text content |
| `action` | Buttons (CTAs) and interactive elements |
| `container` | Background boxes, cards, shapes that group elements |
| `component` | Complex groups: testimonial stars, avatar grids, chart legends |
| `environment` | Background colors, gradients, full-bleed imagery |
| `unknown` | Genuinely unclassifiable nodes |

### AI Signal Types (`types/ai-signals.ts`)

**Core QA Signals:**
- `LOW_CONTRAST` - Text color too similar to background
- `LOGO_TOO_SMALL` - Logo <3% of frame area
- `TEXT_OVERLAP` - Text nodes with intersecting bounds
- `SAFE_AREA_RISK` - Important content within 5% of edges
- `EXCESSIVE_TEXT` - Body text >200 chars
- `MISSING_CTA` - No clear call-to-action
- `ASPECT_MISMATCH` - Source poorly suited for target

**Target-Specific Signals:**
- `TEXT_TOO_SMALL_FOR_TARGET` - fontSize below minimum after scaling
- `THUMBNAIL_LEGIBILITY` - Text won't be readable at thumbnail size
- `OVERLAY_CONFLICT` - Content conflicts with platform UI (TikTok/YouTube)
- `CTA_PLACEMENT_RISK` - CTA in platform-obscured zone
- `VERTICAL_OVERFLOW_RISK` - Content may clip on vertical targets
- `HORIZONTAL_OVERFLOW_RISK` - Content may clip on wide targets

**Accessibility Signals (8):**
- `COLOR_CONTRAST_INSUFFICIENT` - Below WCAG AA contrast ratio
- `TEXT_TOO_SMALL_ACCESSIBLE` - Below 12px accessibility threshold
- `INSUFFICIENT_TOUCH_TARGETS` - Interactive elements <44px
- `HEADING_HIERARCHY_BROKEN` - H1→H3 skips or improper nesting
- `POOR_FOCUS_INDICATORS` - Buttons/links lack visible focus states
- `MOTION_SENSITIVITY_RISK` - Rapid animations that may trigger vestibular disorders
- `MISSING_ALT_EQUIVALENT` - Images without descriptive text nearby
- `POOR_READING_ORDER` - Elements don't follow logical reading sequence

**Design Quality Signals (6):**
- `TYPOGRAPHY_INCONSISTENCY` - Mixed font families, weights, conflicting scales
- `COLOR_HARMONY_POOR` - Clashing color combinations
- `SPACING_INCONSISTENCY` - Irregular padding, margins, grid alignment
- `VISUAL_WEIGHT_IMBALANCED` - Poor focal hierarchy, competing elements
- `BRAND_CONSISTENCY_WEAK` - Inconsistent brand colors, logo usage
- `CONTENT_HIERARCHY_FLAT` - No clear information hierarchy

## Build System

### ESBuild Configuration (`build.mjs`)
- **Input:** `core/main.ts` (single entry point)
- **Output:** `dist/main.js` (IIFE bundle for Figma plugin context)
- **Target:** ES2017, browser platform
- **Features:** Tree shaking, sourcemaps, watch mode
- **Environment Variables:**
  - `SCALERESIZER_DEFAULT_OPENAI_KEY` - Baked into build for workspace AI access
  - `DEBUG_FIX` / `BIBLIOSCALE_DEBUG_FIX` - Controls debug mode
  - `__BUILD_TIMESTAMP__` - Compilation timestamp define

### TypeScript Configuration
- **Target:** ES2017 with strict mode enabled
- **Modules:** ESNext with Node resolution
- **Types:** `@figma/plugin-typings` for Figma API
- **Includes:** `core/`, `ui/`, `types/` directories only

## Testing Infrastructure

### Custom Test Runner (`tests/run-tests.mjs`)
- **No External Framework:** Custom `testCase()` / `assertEqual()` utilities
- **Execution:** Node.js-based, compiles TypeScript tests on-the-fly
- **Coverage:** 53 test files for layout logic, geometry, AI flows
- **Focus Areas:** Deterministic scaling curves, layout switching logic, spacing calculations

### Test Organization
```
tests/
├── *.test.ts              # Unit tests
├── contracts/             # Contract tests (interface compliance)
│   ├── ai-examples-service-contract.test.ts
│   ├── auto-layout-snapshot-contract.test.ts
│   ├── child-positioning-contract.test.ts
│   ├── node-transformer-contract.test.ts
│   └── scaling-orchestrator-contract.test.ts
└── characterization/      # Characterization tests (behavioral snapshots)
    ├── ai-few-shot-examples.test.ts
    └── new-registry-validation.test.ts
```

### Key Test Files
- `ai-orchestration.test.ts` - Two-phase AI flow tests
- `ai-openai-contract.test.ts` - OpenAI client contract tests
- `collision-validator.test.ts` - Collision detection tests
- `leaderboard-kill-switch.test.ts` - Feature toggle tests
- `layout-profile.test.ts` - Aspect ratio classification
- `absolute-geometry.test.ts` - Absolute positioning during scaling
- `variant-scaling.test.ts` - Core scaling engine tests

## Plugin Development Workflow

### Local Development Setup
1. `npm install` - Install dependencies
2. `npm run dev` - Start watch mode
3. Open Figma Desktop → Plugins → Development → Import from manifest
4. Select `manifest.json` from project root
5. Run plugin, select marketing frame, generate variants

### Environment Variables for AI
```bash
# Required for AI features
export SCALERESIZER_DEFAULT_OPENAI_KEY="sk-proj-..."

# Debug mode (optional)
export DEBUG_FIX=1
npm run build
```

### Plugin Data Keys (`plugin-constants.ts`)
- `biblioscale:targetId` - Target format identifier
- `biblioscale:runId` - Batch operation identifier
- `biblioscale:layoutPattern` - Selected layout pattern
- `biblioscale:ai-signals` - Parsed QA signal summary
- `biblioscale:layout-advice` - Layout recommendations
- `biblioscale:safeArea` - Safe-area inset configuration
- `biblioscale:focalPoint` - Primary focal point (x, y, confidence)
- `biblioscale:role` - Assigned semantic role

## Scaling Strategy

### Core Scaling Pipeline (`variant-scaling.ts`)
1. **Aspect Ratio Detection** - Classify target as vertical/horizontal/square
2. **Layout Mode Selection** - Choose HORIZONTAL, VERTICAL, or NONE adaptation
3. **Proportional Scaling** - Scale frame, text, effects, spacing uniformly
4. **Auto-Layout Restoration** - Capture and restore layout settings post-scale
5. **Safe Area Enforcement** - Apply target-specific content boundaries

### Layout Constants (`layout-constants.ts`)
```typescript
ASPECT_RATIOS: {
  EXTREME_VERTICAL: 0.57,    // ~9:16 (TikTok)
  SQUARE_MIN: 0.8, SQUARE_MAX: 1.2,
  EXTREME_HORIZONTAL: 2.5,   // ~21:9 (YouTube)
  STRETCH_THRESHOLD: 2.0,    // Triggers edge resizing
}

MIN_LEGIBLE_SIZES: {
  THUMBNAIL: 9px, STANDARD: 11px, LARGE_DISPLAY: 14px
}
```

### Dimensional Protocols (VERSION 9)

| Target Height | Subject Visibility | Text Stack Rule |
|:---|:---|:---|
| **< 115px** | VISIBLE: FALSE (Always hide photos) | Max 1 line. `textTreatment: "single-line"` |
| **115px - 350px** | SIDE-ANCHOR ONLY | Max 2 lines. No center overlays |
| **Vertical Targets** | CENTERED | UI SHIELD: Stay out of Bottom 35% and Top 15% |

## File Structure Reference

```
ScaleResizer/
├── core/                    # Plugin logic (~60 TypeScript modules)
│   ├── main.ts              # Entry point and message handlers
│   ├── variant-scaling.ts   # Core scaling engine
│   ├── auto-layout-adapter.ts # Layout restructuring
│   ├── ai-orchestration.ts  # Two-phase AI coordinator
│   ├── ai-openai-client.ts  # OpenAI API client
│   ├── ai-system-prompt.ts  # System prompts (VERSION 9)
│   ├── ai-vision-prompt.ts  # Phase 1 vision prompts
│   ├── ai-layout-prompt.ts  # Phase 2 layout prompts
│   ├── collision-validator.ts # Collision detection
│   ├── leaderboard-kill-switch.ts # Feature toggle
│   └── [50+ other modules]  # Specialized logic
├── ui/                      # UI template (compiled inline)
│   ├── template.ts          # Template assembly
│   ├── template-markup.ts   # HTML structure
│   ├── template-script-*.ts # Controller logic
│   └── template-style.ts    # CSS styling
├── types/                   # Shared TypeScript definitions
│   ├── targets.ts           # 17 variant target specifications
│   ├── messages.ts          # Core↔UI protocol
│   ├── layout-patterns.ts   # Semantic layout patterns
│   ├── ai-signals.ts        # AI analysis types (7 roles, 27 QA signals)
│   └── layout-advice.ts     # Layout recommendation types
├── tests/                   # Custom test suite (53 test files)
│   ├── contracts/           # Interface contract tests
│   └── characterization/    # Behavioral snapshot tests
└── dist/                    # Compiled output (main.js)
```

## Common Development Tasks

### Adding New Variant Targets
1. Update `types/targets.ts` with new format specification
2. Add target to `PATTERN_AFFINITY` matrix in layout modules
3. Configure safe area requirements if needed
4. Update QA overlay logic for target-specific constraints
5. Add dimensional protocol handling in `leaderboard-kill-switch.ts` if needed

### Modifying Layout Patterns
1. Add pattern to `types/layout-patterns.ts`
2. Update pattern affinity mappings
3. Implement pattern logic in `auto-layout-adapter.ts`
4. Add test coverage in `tests/layout-*.test.ts`

### Debugging Scaling Issues
1. Enable debug mode: `DEBUG_FIX=1 npm run build`
2. Check aspect ratio thresholds in `layout-profile.ts`
3. Review scaling curves in `variant-scaling.ts`
4. Inspect layout adaptation plans in console logs

### AI Service Modifications
1. Two-phase orchestration in `ai-orchestration.ts`
2. Vision prompts in `ai-vision-prompt.ts`
3. Layout prompts in `ai-layout-prompt.ts`
4. System prompt versioning in `ai-system-prompt.ts`
5. Signal parsing in `ai-sanitization.ts`
6. Error recovery in `ai-error-recovery.ts`

## Key Insights for Development

**★ Insight ─────────────────────────────────────**
- **Two-Phase AI Architecture:** The prompt chaining approach separates visual perception (faces, subjects) from layout reasoning, preventing the AI from letting layout preferences bias its visual detection.
- **Plugin Data as State Store:** ScaleResizer uses Figma's `pluginData` API extensively for persistent state, enabling per-frame customization and caching of expensive AI results directly on nodes.
- **Aspect-Driven Architecture:** The entire scaling system pivots on aspect ratio classification - understanding whether a target is vertical/horizontal/square determines layout adaptation strategy.
- **Simplified Role Taxonomy:** The 7-role system (down from 20+) enables consistent classification across diverse content types: people, mockups, charts, and mixed media.
**─────────────────────────────────────────────────**
