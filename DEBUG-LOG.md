# AI Analysis Debug Log

> Living document for tracking AI confidence improvements after the 2026-01-20 changes.

## Changes Made
- Model: `gpt-4o` (upgraded from `gpt-4o-mini`)
- Role taxonomy: Simplified from 20 to 10 roles
- Confidence guidance: "Default to HIGH (0.85+)" instruction added
- Screenshot: Already sent with requests (verified)

## Expected Behavior
- Confidence scores should be 0.85+ consistently
- Roles should be from: `logo`, `hero`, `background`, `image`, `heading`, `text`, `cta`, `price`, `list`, `decorative`, `unknown`

---

## Run Analysis Log

_Paste console output from Figma plugin runs below. Look for confidence scores in AI response._

### Run 1: 2026-01-20 (Post-upgrade)

**Role Classifications:**
| Node | Role | Confidence | Target Met? |
|------|------|------------|-------------|
| Hero image | `hero` | 0.95 | ✅ |
| Main title | `heading` | 0.97 | ✅ |
| Subtitle | `heading` | 0.92 | ✅ |
| Body text | `text` | 0.85 | ✅ |
| Caption | `text` | 0.80 | ❌ (below 0.85) |
| Decorative element | `decorative` | 0.70 | ❌ (below 0.85) |

**Other Signals:**
- Face detection: 0.94 confidence ✅
- Layout advice scores: 0.82-0.88

**Summary:**
- **4/6 roles** met the 0.85+ target (67%)
- New simplified roles being used correctly (`hero`, `heading`, `text`, `decorative`)
- `decorative` role at 0.70 is the lowest - this role may inherently have more ambiguity
- `text` at 0.80 is close but slightly under threshold

**Assessment:** Significant improvement from previous baseline. The "Be Confident" instruction and simplified taxonomy are working. Consider whether `decorative` elements need special handling or if 0.70+ is acceptable for catch-all roles.

---

### Run 2: [Waiting for input...]

```
// Paste AI analysis output here
```

---
