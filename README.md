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

## Building
```bash
cd plugins/biblio-assets-resizer
npm install          # generates node_modules and lockfile (requires registry access)
npm run build        # emits dist/main.js
```

> **Note:** Network access is required for `npm install`. If the sandbox blocks it, request approval or install dependencies locally before running the build script.

## Loading in Figma
1. Open the Figma desktop app.
2. Choose `Plugins → Development → Import plugin from manifest…`.
3. Select `plugins/biblio-assets-resizer/manifest.json`.
4. After import, run the plugin, select a marketing frame, choose targets, and click **Generate variants**.

## Limitations & Follow-ups
- Auto layout-heavy frames may still require manual cleanup; Phase 2 will layer in AI QA and richer layout intelligence.
- QA checks currently cover safe-area breaches and horizontal drift; extend with vertical alignment and focal-point analysis in upcoming work.
- Font loading is best-effort; mixed typography is scaled per character but may need full regression testing on complex marketing assets.
