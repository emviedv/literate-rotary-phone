# ScaleResizer — Product Requirements Document

**Status:** Proposed (NOT IN CURRENT STACK)  
**Last updated:** November 03, 2025

## Context
Marketing and product teams frequently repurpose bespoke campaign frames across multiple Figma-native placements. Manual resizing duplicates effort, introduces layout mistakes, and slows launches. ScaleResizer automates multi-target adaptation while preserving original creative intent, enabling fast, on-brand asset expansion.

## Problem Statement
- Re-creating variants (covers, gallery tiles, banners) requires manual artboard setup, asset scaling, and alignment tweaks in Figma.
- Errors in safe areas, logo placement, and visual hierarchy slip through when timelines are compressed.
- Existing plugins offer generic resizing or stock templates, not tailored to internal asset systems that must reuse the same imagery and typography.

## Goals
- Generate high-fidelity variants for supported Figma targets in under 30 seconds per source frame.
- Maintain original imagery, copy, and brand tokens while adapting layout, sizing, and positioning automatically.
- Provide automated QA guardrails so outputs are publication-ready with minimal manual intervention.
- Leverage OpenAI to improve composition quality and highlight risks without altering copy.

## Non-Goals
- Writing or translating marketing copy.
- Creating net-new imagery or sourcing stock assets.
- Supporting non-Figma canvases or external publishing workflows.
- Automating campaign approvals or content management hand-offs.

## Target Users
- **Marketing designer:** Owns campaign visuals, expects high polish.
- **Product marketer / generalist:** Needs fast turnaround and reliable defaults.
- **Design ops / brand steward:** Ensures outputs align with brand guidelines.

## Source & Target Format Scope (Launch)
- Source: Any marketing frame within the active file (auto-detected).
- Targets:
  - Figma Community cover (1920×960)
  - Figma Community gallery (1600×960)
  - Figma Community thumbnail (480×320)
  - Web hero banner (1440×600)
  - Social carousel panel (1080×1080)
  - YouTube cover (2560×1440)
  - TikTok vertical promo (1080×1920)

## User Workflow
1. User selects a source frame and opens the plugin.
2. Plugin classifies layers (images, text, logos, decorative elements) and suggests compatible target formats.
3. User toggles desired targets and runs “Generate Variants.”
4. Plugin clones the frame into a dedicated `ScaleResizer` page, applies responsive layout rules per target, and repositions assets.
5. QA overlay surfaces automated checks (alignment, safe areas, contrast). OpenAI insights flag composition risks.
6. User exports or moves generated frames into project flow; history preserves last five operations for undo/redo.

## Functional Requirements
- Parse selected frame, mapping layers into semantic slots while preserving hierarchy.
- Apply template logic per target size (auto layout, constraints, focal cropping) using original assets.
- Respect brand tokens (colors, typography, logo variants) sourced from the original frame.
- Support batch processing (up to 10 source frames) with progress feedback.
- Provide configuration panel for safe area values, text scaling thresholds, and prioritized focal elements.
- Offer side-by-side preview (source vs. resized) and toggle for QA overlays.
- Persist session-level settings locally; no external storage in v1.

## OpenAI Enhancements
- **Composition analyzer:** Vision model reviews layout balance, contrast, and text legibility; returns actionable warnings.
- **Asset salience detection:** Identifies key subjects to anchor placement during resizing.
- **Layout advisor:** Suggests alternative variant (e.g., swapping text/image stacking) ranked by predicted readability.
- **Quality guardrails:** Flags cropped logos or overlapping elements before export.
- Future experiment (Phase 3): optional prompt to request alternate arrangement or colorway (requires brand approval).

## Metrics & Adoption Targets
- Activation: ≥60% of first-time users generate at least one multi-target set during first session.
- Retention: ≥40% of activated users run the plugin again within 14 days.
- Productivity: Average variant set creation time ≤5 minutes (baseline 25) verified via user survey.
- Quality: ≤5% of generated frames fail manual QA in pilot cohort.
- Satisfaction: CSAT ≥4.2/5 via in-plugin survey after first month.

## Instrumentation
- Events: plugin launch, frames selected, target formats chosen, variant generation success/failure, QA warnings surfaced/resolved, manual adjustments >10 px post-generation.
- Time metrics: time from launch to generation completion, per-target rendering latency.
- Feedback: optional modal capturing perceived time saved and confidence rating.

## Dependencies
- Brand asset library availability (logos, typography styles, color tokens).
- OpenAI API access (vision + GPT-4o mini or comparable) with cost monitoring and usage throttling.
- Figma plugin manifest permissions (`currentpage`, `showUI`).
- Hosting for plugin UI bundle (if required) and secure local storage for configuration.

## Risks & Mitigations
- **Diverse source layouts break templates:** Provide onboarding checklist, fallback manual-assist mode, and capture telemetry on failure cases.
- **OpenAI latency impacts UX:** Parallelize API calls, cache per-frame analyses, and degrade gracefully if API unavailable.
- **Brand drift:** Involve brand steward during template creation and run pre-launch QA sprints.
- **API cost spikes:** Allow org-level toggle for AI features and monitor cost per generation.

## Phased Delivery Plan (Each phase fully testable in Figma)

### Phase 1 — Core Variant Engine (Complete)
- **Scope:** Single-frame selection, generate Figma Community cover, gallery, thumbnail, and web hero banner using original assets. Include QA overlay with non-AI checks (safe area, alignment). Local history (last operation).
- **Acceptance (Figma Testing):** In a sandbox file, selecting a marketing frame and running Phase 1 flows produces four variant frames on a `ScaleResizer` page with correct dimensions and passes QA overlay without manual fixes.

### Phase 2 — Extended Formats & AI QA (Complete)
- **Scope:** Add social carousel, YouTube cover, and TikTok vertical templates. Integrate OpenAI composition analyzer and asset salience detection for QA insights. Introduce configurable safe area presets.
- **Acceptance (Figma Testing):** Running Phase 2 build on varied sample frames generates all seven target formats, displays AI-powered warnings (e.g., low contrast), and allows the user to resolve them without leaving Figma.

### Phase 3 — Docs, Telemetry & Polish (In Progress)
- **Scope:** Complete documentation for new targets and AI features. Implement telemetry for usage tracking (target selection, AI adoption, QA alerts). Final polish on UI/UX.
- **Acceptance (Figma Testing):** Telemetry events fire correctly during usage. Documentation matches shipped features.

## Rollout Plan
- **Alpha:** Internal design team (5 users) on Phase 1; collect baseline workflow timings and template feedback.
- **Beta:** Expand to marketing partners with Phase 2 feature set; monitor telemetry and iterate on AI guidance.
- **GA:** Deliver Phase 3 capabilities, finalize documentation, offer in-plugin tutorial, and prep marketing launch.

## Open Questions
- Should users be able to hide or swap decorative elements per target, or remain fully automated?
- Do we need template packs per product line to reflect different brand accents?
- What guardrails govern AI-triggered layout changes before requiring manual approval?
- How will localization (longer copy strings) be handled without violating “no rewriting”?

## Discovery Questions (Reference)
1. What’s the initial set of source → target formats you want to support (e.g., Chrome extension promo → web banner, TikTok → YouTube cover)?
2. Do you envision designers customizing layouts after the resize, or should the plugin fully handle the adaptation?
3. Any style guardrails we should enforce (safe areas, brand colors, typography)?
4. How much automation do you want around content mapping—should copy be rewritten for the new format, or just scaled/placed?
5. What matters more out of the gate: speed of resizing, maintainable templates, or precise brand adherence?
6. Do you plan to integrate asset libraries (e.g., Figma components, tokens) or handle everything fresh per frame?
7. Who’s the primary user persona—marketing designers, product marketers, generalists?
8. Any metrics or adoption goals we should anchor the PRD around?
