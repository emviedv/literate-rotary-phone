# ScaleResizer Layout Fixes - Implementation Priority Tasks

## Overview
This document outlines the prioritized implementation tasks for fixing ScaleResizer's layout adaptation issues across different aspect ratios. The plugin currently over-preserves original spatial relationships, leading to poor layout adaptation.

## HIGH PRIORITY

### 1. Content Margin Reset (Immediate Impact)
**File:** `core/variant-scaling.ts` - after line 151
**Problem:** Original margins preserved regardless of target aspect ratio
**Solution:** Add aspect-ratio-aware content margin reset logic
**Impact:** Fixes horizontal layouts where content gets pushed to edges

**Implementation Steps:**
1. Create `core/margin-normalization.ts` with `normalizeContentMargins()` function
2. Modify `scaleNodeTree()` after `measureContentMargins()` call
3. Update AxisGaps creation to use normalized margins
4. Test with extreme aspect ratios (16:9 → 9:16 transitions)

### 2. Absolute Position Rebalancing (Core Fix)
**File:** `core/absolute-layout.ts` - `planAbsoluteChildPositions()`
**Problem:** Absolute elements maintain poor relative positions
**Solution:** Content-aware repositioning with split/stack layouts
**Impact:** Fixes core positioning issues across all formats

**Implementation Steps:**
1. Enhance `projectChildrenToBounds()` with aspect ratio awareness
2. Add profile and aspect ratio change parameters
3. Implement smart axis priority for vertical targets
4. Test absolute positioning on mixed content layouts

## MEDIUM PRIORITY

### 3. Safe Area Enforcement (Bounds Protection)
**Files:** `core/safe-area.ts`, variant scaling logic
**Problem:** Safe areas not enforced properly for complex targets
**Solution:** Stricter safe area constraint enforcement
**Impact:** Ensures content stays within YouTube/TikTok safe zones

**Implementation Steps:**
1. Add `enforceTargetSafeArea()` constraint function
2. Integrate with absolute positioning pipeline
3. Test with complex targets (YouTube mobile safe zones)

### 4. Layout Mode Detection (Extreme Aspect Handling)
**File:** `core/auto-layout-adapter.ts` - `createLayoutAdaptationPlan()`
**Problem:** Layout modes don't adapt aggressively enough
**Solution:** Sophisticated layout mode switching logic
**Impact:** Better handling of extreme aspect ratio changes

**Implementation Steps:**
1. Add `shouldForceLayoutModeChange()` detection logic
2. Enhance layout adaptation plan creation
3. Test with extreme aspect ratio targets

## LOW PRIORITY

### 5. Content Hierarchy Preservation (Visual Balance)
**Files:** Throughout scaling pipeline
**Problem:** Supporting elements become dominant
**Solution:** Role-based element sizing adjustments
**Impact:** Fine-tuning for better visual hierarchy

**Implementation Steps:**
1. Add `adjustElementImportanceByRole()` scaling logic
2. Integrate with element importance detection
3. Test visual hierarchy preservation

## Implementation Sequence

### Phase 1: Content Margin Reset
- Create margin normalization module
- Integrate with scaleNodeTree function
- Test with extreme aspect ratios

### Phase 2: Absolute Position Enhancement
- Enhance absolute positioning logic
- Add aspect ratio awareness
- Test mixed content layouts

### Phase 3: Integration Testing
- Verify safe area constraints preserved
- Test hero_bleed positioning intact
- Validate focal point logic (60% blend)

## Key Files to Modify

### Core Implementation Files
- `core/variant-scaling.ts` - Main scaling engine (line 151)
- `core/absolute-layout.ts` - Absolute positioning (line 62)
- `core/margin-normalization.ts` - NEW FILE for normalization logic
- `core/layout-expansion.ts` - Interior weight calculation understanding
- `core/warnings.ts` - Margin measurement source logic

### Supporting Files
- `core/layout-profile.ts` - Aspect ratio detection refinements
- `core/layout-constants.ts` - Aspect ratio thresholds

## Testing Strategy

### Unit Testing
- Margin normalization edge cases
- Aspect ratio boundary detection
- Absolute positioning math validation

### Integration Testing
- All source→target profile combinations (9 total)
- Real-world layouts (text-heavy, image-heavy, mixed)
- Edge cases (single child, dense content, empty frames)

## Expected Results

After implementing these fixes, ScaleResizer should generate variants that:
- Balance content properly instead of pushing elements to edges
- Adapt layout modes intelligently for different aspect ratios
- Respect safe areas while maintaining visual hierarchy
- Stack elements appropriately in vertical formats (TikTok)
- Create split layouts effectively in horizontal formats (YouTube)
- Preserve content hierarchy with supporting elements remaining supportive

## Performance Considerations
- Minimal computational overhead (O(n) operations)
- Small additional context passing
- No changes to existing caching logic
- Backwards compatibility maintained