# Agent Notes

## Core Principle: Universal Approach

**Always design solutions that work universally across all content types, rather than special-casing individual scenarios.**

- Prefer type-based rules (e.g., `type: "INSTANCE"`) over name-based patterns (e.g., "mockup", "device")
- Solutions should handle buttons, cards, icons, mockups, and any future component types without modification
- Avoid hardcoding specific names, categories, or content assumptions
- When adding rules or constraints, ask: "Does this apply to ALL nodes of this type/structure?"

- ES2017 is the default TypeScript target for this plugin; adjust `tsconfig.json` only if a different baseline is required.
- Vertical target variants must reflow horizontal auto layout frames into top-aligned stacks so the content hugs the safe area (see `resolveVerticalAlignItems` in `core/layout-profile.ts`).
- Preserve safe-area QA overlays by configuring them with `configureQaOverlay` using `parentLayoutMode`; use `DEBUG_FIX=1` traces to verify placement. Overlays remain unlocked for user accessibility.
- Vertical variants force `layoutWrap` to `NO_WRAP` so expect a single column; avoid relying on row wrapping for tall targets.

## Layout Adaptation Architecture Gap

### The Problem
The current layout adaptation system changes **layout properties** (layoutMode, alignment, spacing) but does NOT **restructure content hierarchy**. This causes visual issues like content clustering in corners with empty space elsewhere.

**Example:** Pattern `split-left` sets `layoutMode: HORIZONTAL` + `primaryAxisAlignItems: SPACE_BETWEEN`, but if children remain nested (card containing image + text), SPACE_BETWEEN with 2 small children just adds a gap—it doesn't expand either child to fill space.

### Three Levels of Layout Modification

| Level | Status | What It Does |
|-------|--------|--------------|
| **1. Layout Property Changes** | ✅ ACTIVE | Changes auto-layout settings (layoutMode, alignment, spacing, padding) via `createLayoutAdaptationPlan()` |
| **2. AI Positioning** | ⚠️ PARTIAL | Per-node visibility/anchor/sizing when AI provides full positioning map via `applyAiPositioning()` |
| **3. Content Restructuring** | ❌ MISSING | Extracting elements from containers, re-parenting nodes, smart hierarchy changes |

### Current Implementation Details

**`createLayoutAdaptationPlan()` in `auto-layout-adapter.ts`:**
- Only modifies frame properties, never touches children
- Pattern definitions describe visual outcomes but contain no restructuring instructions
- Works like CSS changes on existing DOM—doesn't move elements

**`applyAiPositioning()` at lines 318-427:**
- Can hide/show nodes and set anchor positions
- Only activates if AI provides complete `positioningMap` for variant
- Currently, prompts don't request specific per-node positioning values

**Pattern Definitions in `types/layout-patterns.ts`:**
- Store layout properties (layoutMode, alignment, spacingStrategy)
- Describe intended visual state ("Image on left, text on right")
- Missing: how to achieve that state from arbitrary input structures

### What Universal Fixes Require

For layout patterns to work across diverse source frames:

1. **Content Role Classification**
   - Identify semantic roles during analysis (image containers vs text groups)
   - Use AI signals (roles array) to tag nodes by function
   - Store role classifications in pluginData for adaptation phase

2. **Smart Element Extraction**
   - Detect when image is inside a card/container that prevents proper split
   - Extract primary visual (hero image) to frame root level when needed
   - Group remaining text elements into a text container

3. **Per-Target Positioning Guidance**
   - AI should generate specific anchors/sizing for each node per target
   - Use the `ElementPositioning` interface (already defined in `types/layout-advice.ts`)
   - Prompts need to request concrete positioning values, not just pattern names

4. **Fallback for Unstructured Content**
   - Handle frames with `layoutMode: NONE` (absolute positioning)
   - Provide sensible defaults when AI can't classify nodes
   - Scale-only mode as last resort (current `preserve-layout` pattern)

### Investigation References

- **Layout properties applied:** `core/auto-layout-adapter.ts` lines 55-200
- **AI positioning (partial):** `core/auto-layout-adapter.ts` lines 318-427
- **Child adaptations (no extraction):** `core/child-adaptations.ts` lines 45-134
- **Pattern definitions:** `types/layout-patterns.ts` lines 73-81
- **ElementPositioning interface:** `types/layout-advice.ts` lines 178-226
- **AI-only mode flag:** `core/layout-mode-resolver.ts` (AI_ONLY_MODE = true)

### Key Insight
The system is ~90% there—infrastructure exists for positioning schemas and AI-only mode. The missing piece is a **content restructuring layer** that transforms arbitrary input hierarchies into the hierarchy expected by each pattern.
