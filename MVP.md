# BiblioScale — MVP Phased Plan

**Status:** Proposed (NOT IN CURRENT STACK)  
**Last updated:** November 03, 2025

## Objective
Deliver a Figma plugin that automatically adapts bespoke marketing frames into multiple Figma-native targets while preserving brand fidelity and reducing production time. Each phase culminates in a fully testable Figma experience.

## Phase 1 — Core Variant Engine
- **Goals:** Prove frame parsing, asset reuse, and automated layout for Community cover, gallery, thumbnail, and web hero formats.
- **Key Features:** Single-frame selection, template-driven layouts, safe-area/alignment checks, variant staging page, local history.
- **Figma Testing Criteria:** In a controlled file, running the plugin on a tagged marketing frame must output four correctly sized variants with intact assets and pass all non-AI QA checks without manual adjustments.
- **Exit Criteria:** Pilot designers confirm ≤10 minutes end-to-end for four variants; telemetry shows error rate <5%.

## Phase 2 — Extended Formats & AI QA
- **Goals:** Expand format coverage and introduce AI-powered quality feedback to catch composition issues.
- **Key Features:** Social carousel, YouTube cover, TikTok vertical templates; OpenAI composition analyzer and salience detection; configurable safe-area presets.
- **Figma Testing Criteria:** Sample frames with varying density generate all seven target formats, and AI warnings resolve inside Figma without external tools.
- **Exit Criteria:** Designers report ≥80% of AI warnings useful; generation latency per target <6 seconds on average.

## Phase 3 — Layout Advisor & Batch Operations
- **Goals:** Streamline campaign runs with batch processing and AI-driven layout alternatives.
- **Key Features:** Batch selection (≤10 frames), layout advisor rankings, optional AI variant suggestions, telemetry export.
- **Figma Testing Criteria:** Batch run in staging file finishes without timeouts, produces ranked layout suggestions, and logs telemetry accessible via developer console inspection.
- **Exit Criteria:** QA signs off on batch reliability; stakeholders approve go-to-market launch package.

## Metrics to Monitor (All Phases)
- Activation ≥60%, retention ≥40%, average variant generation ≤5 minutes, QA failure rate ≤5%, CSAT ≥4.2/5.

## Dependencies & Notes
- Ensure OpenAI API usage is budgeted and compliant.
- Maintain alignment with brand tokens/components supplied in source frames.
- Document safe-area presets and layout guardrails before Phase 2 rollout.
