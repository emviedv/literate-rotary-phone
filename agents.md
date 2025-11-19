# Agent Notes

- ES2017 is the default TypeScript target for this plugin; adjust `tsconfig.json` only if a different baseline is required.
- Vertical target variants must reflow horizontal auto layout frames into top-aligned stacks so the content hugs the safe area (see `resolveVerticalAlignItems` in `core/layout-profile.ts`).
- Preserve safe-area QA overlays by configuring them before locking; use `configureQaOverlay` with `parentLayoutMode` and `DEBUG_FIX=1` traces to verify placement.
- Vertical variants force `layoutWrap` to `NO_WRAP` so expect a single column; avoid relying on row wrapping for tall targets.
