# Codebase Impact Analysis: AI Core Modules

## Executive Summary

After analyzing `core/ai-signals.ts`, `core/ai-sanitization.ts`, `core/layout-advice.ts`, and their related dependencies, I have determined that **`layout-advice.ts` and `ai-confidence-calibration.ts` are significantly overcomplicating the system**, potentially degrading the quality and predictability of the output.

`ai-sanitization.ts` is verbose but serves a necessary defensive role. `ai-signals.ts` is benign.

## Detailed Findings

### 1. The Primary Offender: `layout-advice.ts` & `ai-confidence-calibration.ts`

**Verdict: OVER-ENGINEERED & HARMFUL**

The layout advice module is not just normalizing data; it is attempting to implement a "self-learning" system via `ai-confidence-calibration.ts` that tracks user clicks and adjusts AI confidence scores.

*   **Why it's making output worse:**
    *   **Opaque Logic:** A user (or developer) cannot easily understand why a specific layout was chosen or rejected. It relies on hidden state (`figma.clientStorage`) representing "historical affinity."
    *   **False Negatives:** The "Tiered Confidence" system (High/Medium/Low/Reject) combined with these "calibrated" weights means valid AI suggestions might be strictly rejected (hidden from the user) because the math dampened their score below 0.45.
    *   **Context Mismatch:** The system assumes that if a user preferred "Split Left" for *Ad A*, they will prefer it for *Ad B*. This ignores the visual reality that *Ad B* might not work with "Split Left". The calibration biases the AI against the actual visual evidence.
    *   **Complexity:** It adds async storage reads, "learning phases" (initial vs stable), and decay factors. This is excessive for a stateless layout helper.

**Recommendation:**
*   **Remove `ai-confidence-calibration.ts` entirely.** Trust the AI's raw confidence score for the current context.
*   **Simplify `autoSelectLayoutPattern`**: Remove the "Reject" tier. Always show the best suggestion, perhaps with a UI warning if confidence is low, but don't suppress it programmatically.

### 2. The Defensive Layer: `ai-sanitization.ts`

**Verdict: NECESSARY BUT STALE**

This module ensures the app doesn't crash by strictly validating the AI's JSON output.

*   **Observation:** It contains a large `ROLE_NORMALIZATION_MAP` (mapping "hero" -> "subject", "decorative" -> "container").
*   **Status:** The current System Prompt (`ai-system-prompt.ts`) explicitly instructs the AI to use the new roles ("subject", "branding"). Therefore, the AI *should* be compliant.
*   **Impact:** This layer is now mostly "dead code" handling legacy hallucinations. However, keeping it is cheap insurance. It does not actively harm the output unless it falsely maps a new valid role to `null`.

**Recommendation:**
*   Keep for now, but consider trimming the legacy map if it causes confusion.

### 3. The Data Container: `ai-signals.ts`

**Verdict: CLEAN**

This file simply reads/writes data. It adds no unnecessary complexity.

### 4. The Architect: `ai-orchestration.ts`

**Verdict: JUSTIFIED COMPLEXITY**

The "Two-Phase" approach (Vision -> Layout) is complex code, but it solves a real problem: "Contextual Drift" (where the AI hallucinates objects to fit a layout).

*   **Impact:** This likely *improves* output quality significantly by establishing immutable "Vision Facts" before asking for layout advice.

## Action Plan

1.  **Deprecate/Remove `ai-confidence-calibration.ts`**.
2.  **Refactor `core/layout-advice.ts`** to remove calls to `computeEffectiveConfidence` and `getCalibratedAffinityWeight`.
3.  **Simplify `autoSelectLayoutPattern`** to return the highest-scoring option directly from the AI response.