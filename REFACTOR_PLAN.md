# Refactoring Plan: `core/auto-layout-adapter.ts`

## Current State Analysis

| Metric | Current | Target |
|--------|---------|--------|
| Lines of Code | 918 | ≤400 per file |
| Functions | 15 | 3-5 per module |
| Complexity | High (nested conditionals) | ≤10 per function |
| Test Coverage | 7 tests | 15+ characterization tests |

## Module Decomposition Strategy

The file will be split into **6 focused modules** with clear single responsibilities:

```
core/
├── auto-layout-adapter.ts       (150 LOC) - Main orchestrator + re-exports
├── layout-mode-resolver.ts      (130 LOC) - Layout mode decision logic
├── layout-alignment.ts          (100 LOC) - Alignment strategies
├── layout-spacing.ts            (150 LOC) - Spacing + padding calculations
├── child-adaptations.ts         (100 LOC) - Per-child adaptation logic
├── nested-frame-adapter.ts      (70 LOC)  - Recursive nested frame handling
└── layout-detection-helpers.ts  (100 LOC) - Content detection utilities
```

---

## Phase 1: Characterization Tests (Lock Current Behavior)

### Test 1.1: Layout Mode Resolution
**File:** `tests/layout-mode-resolver.test.ts`

```typescript
// Test cases to add:
// 1. AI suggestedLayoutMode overrides all heuristics
// 2. AI pattern selection derives layout mode correctly
// 3. adoptVerticalVariant flag forces VERTICAL for vertical targets
// 4. Extreme vertical (aspectRatio < 0.57) → VERTICAL for text-heavy horizontal
// 5. Extreme horizontal (aspectRatio > 2.5) → HORIZONTAL for vertical layouts
// 6. Source NONE layout preserves positioning for moderate aspect changes
// 7. Square targets preserve source layout mode
```

### Test 1.2: Alignment Strategy
**File:** `tests/layout-alignment.test.ts`

```typescript
// Test cases to add:
// 1. Pattern-specific alignments from AI advice are honored
// 2. VERTICAL layout in vertical targets centers content
// 3. HORIZONTAL layout with ≤3 children uses SPACE_BETWEEN
// 4. NONE layout returns MIN/MIN
```

### Test 1.3: Spacing Calculation
**File:** `tests/layout-spacing.test.ts`

```typescript
// Test cases to add:
// 1. Source itemSpacing=0 produces itemSpacing=0
// 2. Distribution ratio increases for sparse child counts
// 3. Safe area dimensions constrain spacing calculations
// 4. Extreme aspect ratios boost distribution ratio
```

### Test 1.4: Background Detection
**File:** `tests/layout-detection-helpers.test.ts`

```typescript
// Test cases to add:
// 1. isBackgroundLike: area coverage ≥90% + bottom layer = true
// 2. isBackgroundLike: area coverage ≥90% + image fill = true
// 3. isBackgroundLike: area coverage ≥90% + name "background" = true
// 4. isBackgroundLike: area coverage <90% = false
// 5. isComponentLikeFrame: small frames (<200x200) = true
// 6. isComponentLikeFrame: name contains "logo" = true
// 7. countFlowChildren: excludes absolute and invisible children
```

---

## Phase 2: Module Extraction Sequence

### Step 2.1: Extract `layout-detection-helpers.ts`
**Functions to move:**
- `hasTextChildren`
- `hasImageContent`
- `hasImageChildren`
- `isBackgroundLike`
- `containsText`
- `countFlowChildren`
- `isComponentLikeFrame`

**Rationale:** Pure utility functions with no dependencies on other adapter logic.

### Step 2.2: Extract `layout-mode-resolver.ts`
**Functions to move:**
- `determineOptimalLayoutMode`
- `determineSizingModes`
- `determineWrapBehavior`

**Dependencies:**
- Imports from `layout-constants.ts`
- Imports from `layout-patterns.ts`
- Imports from `layout-detection-helpers.ts`

### Step 2.3: Extract `layout-alignment.ts`
**Functions to move:**
- `determineAlignments`

**Dependencies:**
- Imports from `layout-profile.ts`
- Imports from `layout-patterns.ts`

### Step 2.4: Extract `layout-spacing.ts`
**Functions to move:**
- `calculateSpacing`
- `calculatePaddingAdjustments`

**Dependencies:**
- Imports from `layout-constants.ts`
- Imports from `debug.ts`

### Step 2.5: Extract `child-adaptations.ts`
**Functions to move:**
- `createChildAdaptations`

**Dependencies:**
- Imports from `layout-detection-helpers.ts`
- Imports from `debug.ts`

### Step 2.6: Extract `nested-frame-adapter.ts`
**Functions to move:**
- `adaptNestedFrames`
- `adaptNodeRecursive`
- `isStructuralContainer`

**Dependencies:**
- Imports from `layout-detection-helpers.ts`
- Imports from `auto-layout-adapter.ts` (circular - resolved via barrel)

---

## Phase 3: Contract Tests (Boundary Guards)

### Contract 3.1: LayoutAdaptationPlan Interface
```typescript
// Validates the shape of plan objects returned by createLayoutAdaptationPlan
interface LayoutAdaptationPlanContract {
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisSizingMode: "FIXED" | "HUG";
  counterAxisSizingMode: "FIXED" | "HUG";
  primaryAxisAlignItems: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems: "MIN" | "CENTER" | "MAX" | "BASELINE";
  layoutWrap: "WRAP" | "NO_WRAP";
  itemSpacing: number; // ≥0
  paddingAdjustments: { top: number; right: number; bottom: number; left: number }; // all ≥0
  childAdaptations: Map<string, ChildAdaptation>;
}
```

### Contract 3.2: LayoutContext Interface
```typescript
// Internal contract for context passed between functions
interface LayoutContextContract {
  sourceLayout: {
    mode: "HORIZONTAL" | "VERTICAL" | "NONE";
    width: number; // >0
    height: number; // >0
    childCount: number; // ≥0
  };
  targetProfile: {
    type: "horizontal" | "vertical" | "square";
    aspectRatio: number; // >0
    safeWidth: number; // >0
    safeHeight: number; // >0
  };
  scale: number; // >0
}
```

---

## Phase 4: Execution Order

| Step | Action | Validation | Commit Message |
|------|--------|------------|----------------|
| 4.1 | Write characterization tests | `npm test` passes | `test(auto-layout): add characterization tests for refactor` |
| 4.2 | Extract `layout-detection-helpers.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract detection helpers to module` |
| 4.3 | Extract `layout-mode-resolver.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract mode resolver to module` |
| 4.4 | Extract `layout-alignment.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract alignment logic to module` |
| 4.5 | Extract `layout-spacing.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract spacing calculations to module` |
| 4.6 | Extract `child-adaptations.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract child adaptations to module` |
| 4.7 | Extract `nested-frame-adapter.ts` | `npm test` + `npm run typecheck` | `refactor(layout): extract nested frame adapter to module` |
| 4.8 | Update barrel exports | `npm test` + `npm run typecheck` | `refactor(layout): update auto-layout-adapter as barrel` |
| 4.9 | Add contract tests | `npm test` | `test(layout): add contract tests for module boundaries` |
| 4.10 | Final cleanup + LOC verification | All checks pass | `chore(layout): finalize refactor, add metrics` |

---

## Phase 5: CI Guardrails

### ESLint Configuration (to add/verify)
```json
{
  "rules": {
    "max-lines": ["error", { "max": 400, "skipBlankLines": true, "skipComments": true }],
    "max-lines-per-function": ["error", { "max": 75, "skipBlankLines": true, "skipComments": true }],
    "complexity": ["error", 10]
  }
}
```

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Main file LOC | 918 | ~150 |
| Largest module | 918 | ≤150 |
| Test count | 7 | 20+ |
| Cyclomatic complexity (max) | ~15 | ≤10 |
| Code duplication | N/A | Measured baseline |

---

## Approval Checkpoints

After each phase, I will:
1. Show diff summary (files changed, LOC delta)
2. Report test results
3. Wait for explicit **"proceed"** before continuing

---

## COMPLETION LOG (2026-01-14)

### Final Module Structure

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `auto-layout-adapter.ts` | 286 | Orchestrator, plan application, nested frame handling |
| `layout-detection-helpers.ts` | 152 | Content detection (text, images, backgrounds) |
| `layout-mode-resolver.ts` | 216 | Layout mode, sizing, wrap decisions |
| `layout-alignment.ts` | 103 | Alignment strategies |
| `layout-spacing.ts` | 173 | Spacing and padding calculations |
| `child-adaptations.ts` | 115 | Per-child layout adaptations |
| **Total** | **1,045** | (vs original 918 lines in single file) |

### Deduplication Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main file LOC | 918 | 286 | **-69%** |
| Max file LOC | 918 | 286 | **-69%** |
| Number of modules | 1 | 6 | +5 modules |
| All files ≤400 LOC | ❌ | ✅ | Compliant |

### Test Coverage

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `layout-mode-resolver.test.ts` | 16 | Characterization + behavior |
| `layout-alignment.test.ts` | 8 | Alignment strategies |
| `layout-spacing.test.ts` | 10 | Spacing calculations |
| `layout-detection-helpers.test.ts` | 9 | Detection utilities |
| `layout-adapter-contract.test.ts` | 11 | Module boundary contracts |
| **Total New Tests** | **54** | |

### All Tests Passing

```
✅ 234 total tests passed
✅ 0 failures
✅ TypeScript compilation successful
```

### Decisions Made

1. **Kept nested frame functions in main module** - `adaptNestedFrames` and `adaptNodeRecursive` call `createLayoutAdaptationPlan` and `applyLayoutAdaptation`, creating circular dependencies if extracted.

2. **Re-exported ChildAdaptation type** - Allows external consumers to continue importing from `auto-layout-adapter.ts` while implementation lives in `child-adaptations.ts`.

3. **LayoutContext type moved to layout-mode-resolver.ts** - This is the primary consumer and re-exported for other modules.

### CI Guardrails Status

All new modules comply with:
- ✅ max-lines: 400 (largest is 286)
- ✅ Single responsibility per module
- ✅ Clear import/export boundaries
