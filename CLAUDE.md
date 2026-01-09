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

| Module | Responsibility | Lines | Key Functions |
|--------|----------------|-------|---------------|
| `core/main.ts` | Plugin entry, message dispatch, orchestration | 583 | Entry point, state management |
| `core/variant-scaling.ts` | Core scaling engine with aspect ratio handling | 1,077 | `scaleNodeTree()`, `AutoLayoutSnapshot` |
| `core/auto-layout-adapter.ts` | Layout restructuring for extreme aspect ratios | 917 | `createLayoutAdaptationPlan()`, `applyLayoutAdaptation()` |
| `core/ai-service.ts` | OpenAI integration for frame analysis | 954 | `requestAiInsights()`, `summarizeFrame()` |
| `core/layout-profile.ts` | Target aspect ratio classification | - | `resolveLayoutProfile()`, `shouldAdoptVerticalFlow()` |
| `core/content-analyzer.ts` | Frame content analysis and hierarchy | - | `analyzeContent()`, `calculateOptimalScale()` |
| `core/run-ops.ts` | Staging page and variant organization | - | `ensureStagingPage()`, `createRunContainer()` |

### Data Architecture
- **Plugin Data Storage:** All state persisted via `node.setPluginData(key, value)`
- **Data Keys:** Prefixed with `biblioscale:` (see `plugin-constants.ts`)
- **AI Results:** Cached on frame nodes to avoid redundant API calls
- **Run Organization:** Variants grouped in timestamped containers on dedicated staging page

## Supported Variant Targets (9 Formats)

From `types/targets.ts`:
- `figma-cover`: 1920×960 (Community cover)
- `figma-gallery`: 1600×960 (Gallery tile)
- `figma-thumbnail`: 480×320 (Thumbnail)
- `web-hero`: 1440×600 (Web banner)
- `social-carousel`: 1080×1080 (Square social)
- `youtube-cover`: 2560×1440 (YouTube channel)
- `tiktok-vertical`: 1080×1920 (TikTok portrait)
- `gumroad-cover`: 1280×720 (Gumroad product)
- `gumroad-thumbnail`: 600×600 (Gumroad store)

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
- **Node Role Classification:** 20+ semantic roles (`logo`, `hero_image`, `title`, `cta`, etc.)
- **QA Signal Detection:** Automated warnings for contrast, sizing, overlap issues
- **Layout Recommendations:** Confidence-scored pattern suggestions per target
- **Vision Analysis:** OpenAI GPT-4o mini integration with graceful degradation

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
- **Coverage:** 15+ test files for layout logic, geometry, AI flows
- **Focus Areas:** Deterministic scaling curves, layout switching logic, spacing calculations

### Test File Examples
- `layout-profile.test.ts` - Aspect ratio classification
- `absolute-geometry.test.ts` - Absolute positioning during scaling
- `ai-request-flow.test.ts` - AI service integration flows

## AI Integration

### OpenAI Service (`core/ai-service.ts`)
- **Model:** GPT-4o mini for cost-effective vision analysis
- **Caching:** Results stored on frame's `pluginData` to avoid redundant calls
- **Frame Summarization:** Traverses node tree (max 24 nodes) for context
- **Error Handling:** Graceful degradation when API unavailable

### AI Signal Types
- **QA Warnings:** `LOW_CONTRAST`, `LOGO_TOO_SMALL`, `TEXT_OVERLAP`, `SAFE_AREA_RISK`
- **Target-Specific:** Format-aware signals (e.g., TikTok UI exclusions, YouTube mobile safe zones)
- **Confidence Scores:** Layout pattern recommendations with 0-1 confidence ratings

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

## File Structure Reference

```
ScaleResizer/
├── core/                    # Plugin logic (~6,351 lines TypeScript)
│   ├── main.ts              # Entry point and message handlers
│   ├── variant-scaling.ts   # Core scaling engine
│   ├── auto-layout-adapter.ts # Layout restructuring
│   ├── ai-service.ts        # OpenAI integration
│   └── [20+ other modules]  # Specialized logic (safe areas, QA, etc.)
├── ui/                      # UI template (compiled inline)
│   ├── template.ts          # Template assembly
│   ├── template-markup.ts   # HTML structure
│   ├── template-script-*.ts # Controller logic
│   └── template-style.ts    # CSS styling
├── types/                   # Shared TypeScript definitions
│   ├── targets.ts           # Variant target specifications
│   ├── messages.ts          # Core↔UI protocol
│   ├── layout-patterns.ts   # Semantic layout patterns
│   └── ai-signals.ts        # AI analysis types
├── tests/                   # Custom test suite
└── dist/                    # Compiled output (main.js)
```

## Common Development Tasks

### Adding New Variant Targets
1. Update `types/targets.ts` with new format specification
2. Add target to `PATTERN_AFFINITY` matrix in layout modules
3. Configure safe area requirements if needed
4. Update QA overlay logic for target-specific constraints

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
1. Frame summarization logic in `ai-service.ts`
2. Prompt engineering for better signal extraction
3. Signal parsing and normalization in `ai-signals.ts`
4. Confidence scoring adjustments in `layout-advice.ts`

## Key Insights for Development

**★ Insight ─────────────────────────────────────**
- **Plugin Data as State Store:** ScaleResizer uses Figma's `pluginData` API extensively for persistent state, enabling per-frame customization and caching of expensive AI results directly on nodes.
- **IIFE Bundle Strategy:** The ESBuild IIFE format allows the plugin to run in Figma's sandboxed environment while maintaining all dependencies in a single file, avoiding complex module loading.
- **Aspect-Driven Architecture:** The entire scaling system pivots on aspect ratio classification - understanding whether a target is vertical/horizontal/square determines layout adaptation strategy.
**─────────────────────────────────────────────────**