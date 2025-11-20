# Biblio Assets Resizer — Phase 1

Phase 1 delivers the core variant engine for transforming a selected marketing frame into four Figma-native targets:

- Figma Community cover (1920 × 960)
- Figma Community gallery (1600 × 960)
- Figma Community thumbnail (480 × 320)
- Web hero banner (1440 × 600)

## Features
- Single-frame selection validation with friendly status messaging in the UI
- Target toggles and safe-area slider (default 8%) rendered in the plugin UI
- Deterministic scaling pipeline that preserves original assets while resizing to each target
- Automatic safe-area overlays (locked dashed rectangles) to support quick QA
- Non-AI warnings surface when content falls outside the safe area or drifts horizontally from center
- Run staging on a dedicated `Biblio Assets Variants` page with per-run containers and plugin data history
- AI-powered layout advice + QA ingestion (OpenAI `gpt-4o-mini`) with automatic normalization/clamping so Phase 2 variants pick confident layout patterns and QA signals per frame

## Building
```bash
npm install          # generates node_modules and lockfile (requires registry access)
npm run build        # emits dist/main.js
```

> **Note:** Network access is required for `npm install`. If the sandbox blocks it, request approval or install dependencies locally before running the build script.

## Configuring AI analysis
1. Generate an OpenAI API key with access to `gpt-4o-mini`.
2. Launch the plugin and open the new **AI setup** panel at the top of the UI.
3. Paste the API key (it is stored only in your local `figma.clientStorage`) and click **Save key**. Use **Clear key** to remove it later.
4. Select a single marketing frame and click **Run AI analysis** to request signals/layout advice. The plugin summarizes the frame, calls OpenAI’s Chat Completions API, and stores normalized results on the frame’s plugin data so renders & QA tap into the same source of truth.
5. The AI status badge will tell you whether a key is missing, an analysis is in-flight, or if an error occurred. When successful, the Layout Patterns + AI Signals sections will populate and auto-select high-confidence layouts.
6. To ship a workspace default without prompting users, set the `BIBLIO_DEFAULT_OPENAI_KEY` environment variable before running `npm run build`. The compiled plugin will use that key automatically while still allowing local overrides.

## Loading in Figma
1. Open the Figma desktop app.
2. Choose `Plugins → Development → Import plugin from manifest…`.
3. Select `manifest.json` in this folder.
4. After import, run the plugin, select a marketing frame, choose targets, and click **Generate variants**.

## Limitations & Follow-ups
- Auto layout-heavy frames may still require manual cleanup; Phase 2 will layer in AI QA and richer layout intelligence.
- QA checks currently cover safe-area breaches and horizontal drift; extend with vertical alignment and focal-point analysis in upcoming work.
- Font loading is best-effort; mixed typography is scaled per character but may need full regression testing on complex marketing assets.
