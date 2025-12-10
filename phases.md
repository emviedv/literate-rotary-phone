# Phase Plan

## Phase 1: Live AI QA & Layout Advisor
- Replace placeholder QA signals with live contrast/salience checks; expose per-target confidence thresholds.
- Integrate live layout advisor outputs (no sampled data) with thresholding and fallback states.
- Tests: mock + live model calls return signals; panel renders alerts per target; thresholds gate UI; error/fallback paths covered.

## Phase 2: New Targets UX & Safe-Area Policies
- Add carousel/YouTube/TikTok selection UX, previews, auto-selection rules, and QA overlays tuned per format.
- Wire configurable safe-area presets per brand/profile with persistence and server-provided policies.
- Tests: selecting each target shows correct preview/overlay; auto-selection chooses expected target for inputs; brand preset persists across sessions and respects server policy.

## Phase 3: Docs & Telemetry
- Update README/PRD to reflect Phase 2 features and behaviors.
- Add logging/metrics for new QA/layout flows and target selection.
- Tests: docs align with shipped UI; telemetry events fire with expected payloads for QA alerts, layout advisor decisions, and target selections.
