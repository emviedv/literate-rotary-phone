# ScaleResizer — Variant Engine

ScaleResizer automates the transformation of marketing frames into multiple Figma-native targets, preserving original assets and branding while adapting layout and sizing.

## Supported Targets
- **Figma Community Cover** (1920 × 960)
- **Figma Community Gallery** (1600 × 960)
- **Figma Community Thumbnail** (480 × 320)
- **Web Hero Banner** (1440 × 600)
- **Social Carousel Panel** (1080 × 1080)
- **YouTube Channel Cover** (2560 × 1440)
- **TikTok Vertical Promo** (1080 × 1920)

## Features
- **Smart Target Selection:** Auto-selects targets based on source frame aspect ratio (Portrait, Landscape, Square).
- **Format-Specific QA:** Custom safe-area overlays for complex formats like YouTube (mobile safe zone) and TikTok (UI exclusion zones).
- **Configurable Safety:** Toggle between "Tight" (4%), "Balanced" (8%), and "Roomy" (12%) safe-area presets, or set a custom value. Policies persist locally.
- **AI-Powered Analysis:**
  - **QA Signals:** Detects low contrast, small logos, and text overlaps using OpenAI's `gpt-4o-mini`.
  - **Layout Advice:** Suggests optimal layout patterns per target with confidence scores.
- **Deterministic Scaling:** Preserves original asset fidelity while resizing to each target.
- **Run Staging:** Generates variants in a dedicated `ScaleResizer Variants` page with per-run containers and history.

## Building
```bash
npm install          # generates node_modules and lockfile (requires registry access)
npm run build        # emits dist/main.js
npm run dev          # rebuilds on changes for local development
```

> **Note:** Network access is required for `npm install`. If the sandbox blocks it, request approval or install dependencies locally before running the build script.

## Configuring AI analysis
1. Set the `SCALERESIZER_DEFAULT_OPENAI_KEY` environment variable (or legacy `BIBLIOSCALE_DEFAULT_OPENAI_KEY`) before running `npm run build` so the compiled plugin ships with a workspace AI key. Builds without a key will surface an "AI key missing" status and skip AI analysis.
2. Launch the plugin, select a single marketing frame, and click **Run AI analysis** to request signals/layout advice. The plugin summarizes the frame, calls OpenAI’s Chat Completions API, and stores normalized results on the frame’s plugin data.
3. The AI status badge will reflect whether a key is present, an analysis is in-flight, or if an error occurred. When successful, the Layout Patterns + AI Signals sections will populate and auto-select high-confidence layouts.

## Loading in Figma
1. Open the Figma desktop app.
2. Choose `Plugins → Development → Import plugin from manifest…`.
3. Select `manifest.json` in this folder.
4. After import, run the plugin, select a marketing frame, choose targets, and click **Generate variants**.

## Limitations & Follow-ups
- Auto layout-heavy frames may still require manual cleanup.
- Font loading is best-effort; mixed typography is scaled per character but may need full regression testing on complex marketing assets.
