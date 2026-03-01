# Handoff Prompt — QuantConnect Strategy Specs
<!-- claude-code 2026-02-28 | Updated — 10 of 14 questions resolved, 4 remaining -->

## Context for Next Session

TP completed a multi-session walkthrough with Claude Code documenting three trading models (40/40 Club, Flush, Ripper) plus supporting specs (Antilag signal detection, pre-staged news entry risk management) and frame-by-frame video analysis of two live trade clips. All docs are pushed to `solvys-technologies/pulse` under `docs/quantconnect/`.

These specs are written for **Harper** (CAO / OpenClaw agent) to implement on **QuantConnect** (Lean/C#).

**Build priority:** 40/40 Club first, then Flush and Ripper.
**Backtest start date:** Liberation Day (April 2, 2025) forward.

---

## What's Done

| File | Status |
|------|--------|
| `STRATEGY-40-40-CLUB.md` | **Updated** — all major ambiguities resolved, ready to code |
| `STRATEGY-FLUSH.md` | Complete |
| `STRATEGY-RIPPER.md` | Complete — includes Reactive + Pre-Staged entry modes |
| `ANTILAG-SPEC.md` | Complete — composite signal with pseudocode |
| `PRE-STAGED-NEWS-ENTRY.md` | Complete — 120s blackout, severity mapping, Harper checklist |
| `VIDEO-ANALYSIS-NOTES.md` | Complete — Clip 1 (Antilag) + Clip 2 (Macro Flush) |

---

## Resolved Questions (from TP — 2026-02-28)

1. ~~Scale-in ATR threshold~~ → **≥55%** (flexed down from 60%)
2. ~~Overtaking candle stop~~ → **3–5 points below the candle's low**
3. ~~BE trigger~~ → **Structure-based:** price retests EMA after overtaking, then closes above contested price
4. ~~Trailing stop buffer~~ → **5–7 points**, chunky moves only (not granular). Stop moves after price clears quarter-price/cycle level AND retests past fib AND overtakes contested price
5. ~~Fib boundary~~ → Exact hits belong to the **zone below**
6. ~~Fib invalidation~~ → Discard on price disrespect or news-driven regime change. Old fib becomes TP target only
7. ~~PDPT behavior~~ → **Combine mode:** $1,550 hard cap. **Funded mode:** trailing, avg ~$1,500/day, range $1,300–$2,000
8. ~~Re-entries~~ → **Max 3 executions per setup** (same thesis). Re-entry needs structure intact + fresh Antilag
9. ~~Build priority~~ → 40/40 Club first, then Flush + Ripper
10. ~~Backtest period~~ → Liberation Day (April 2, 2025) forward

---

## Remaining Open Questions (4)

### Flush Model
1. **Flush timing windows** — documented as 9:45–10:15 ET and 10:30–11:00 ET. Are these hard cutoffs or soft guidelines?

### Implementation Details
2. **Anchored VWAP** — co-plotted from the same fib anchor. What are the exact calculation parameters?
3. **DOM heuristic for exits** — algo approximation of TP's visual DOM reads. How should Harper model this?
4. **120-second blackout scope** — applies to all news entries. Does it also apply to non-news Ripper trades (reactive entries on surprise moves)?

---

## How to Resume

```
Pull solvys-technologies/pulse, read docs/quantconnect/*.md,
then answer the 4 remaining questions above. 40/40 Club spec
is ready to code NOW — Harper can start the scaffold while
the remaining questions are answered.
```
