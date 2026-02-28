# Handoff Prompt — QuantConnect Strategy Specs
<!-- claude-code 2026-02-28 | Session handoff for cross-device continuity -->

## Context for Next Session

TP completed a multi-session walkthrough with Claude Code documenting three trading models (40/40 Club, Flush, Ripper) plus supporting specs (Antilag signal detection, pre-staged news entry risk management) and frame-by-frame video analysis of two live trade clips. All 6 docs are pushed to `solvys-technologies/pulse` under `docs/quantconnect/`.

These specs are written for **Harper** (CAO / OpenClaw agent) to implement on **QuantConnect** (Lean/C#).

---

## What's Done

| File | Status |
|------|--------|
| `STRATEGY-40-40-CLUB.md` | Complete — canonical reference for shared mechanics |
| `STRATEGY-FLUSH.md` | Complete |
| `STRATEGY-RIPPER.md` | Complete — includes Reactive + Pre-Staged entry modes |
| `ANTILAG-SPEC.md` | Complete — composite signal with pseudocode |
| `PRE-STAGED-NEWS-ENTRY.md` | Complete — 120s blackout, severity mapping, Harper checklist |
| `VIDEO-ANALYSIS-NOTES.md` | Complete — Clip 1 (Antilag) + Clip 2 (Macro Flush) |

---

## Open Questions for TP

### Model Mechanics
1. **Scale-in ATR threshold** — documented as "first 1000T candle closure ≥60% of 3-candle lookback ATR distance from 100 EMA." Is 60% the exact number or does it flex by model/volatility?
2. **Overtaking candle** — entry is "right below the bottom of the overtaking candle." How much below? Fixed tick offset or percentage of candle body?
3. **Trailing stop Phase 3 (20 EMA − 7 pts)** — is the 7-pt buffer fixed across all conditions, or does it scale with ATR/volatility?
4. **Flush timing windows** — documented as 9:45–10:15 ET and 10:30–11:00 ET. Are these hard cutoffs or soft guidelines?

### Fib Framework
5. **Fib classification boundaries** — Ripper (0.222–0.361), Strong (0.414–0.618), Weak (0.757–0.85). Are the boundaries inclusive or exclusive? What happens at exactly 0.414?
6. **Fib timeframe selection** — 1000T for intraday, 4H for news events. Are there cases where daily or weekly fibs are used?
7. **"Weak Fib from 4H" for PPI** — Video Clip 2 showed this. Does the fib source timeframe always match event severity, or are there overrides?

### Risk Management
8. **PDPT behavior near cap** — Clip 1 showed GPnL of $1,554.80 on a $1,550 cap. Does the system attempt to size down near the cap, or does it just lock out after exceeding?
9. **Multi-trade day accounting** — if Trade 1 nets $800 and Trade 2 is entered, does the bracket auto-adjust to cap remaining P&L at $750?
10. **120-second blackout** — applies to all news entries. Does it also apply to non-news Ripper trades (reactive entries on surprise moves)?

### Implementation Scope
11. **Additional models** — are 40/40 Club, Flush, and Ripper the complete set, or are there others (e.g., a pure scalp model, overnight model)?
12. **"DeepSeek" label** — visible in video Clip 2. What is this? HTF context marker, separate indicator, or irrelevant annotation?
13. **Data feeds** — QuantConnect implementation: NQ and ES tick data (1000T and 500T). Any other instruments or timeframes needed?
14. **Backtesting period** — what date range should Harper target for initial backtests?

---

## How to Resume

```
Pull solvys-technologies/pulse, read docs/quantconnect/*.md,
then answer the open questions above. Once answered, the specs
can be updated and Harper can begin QuantConnect implementation.
```

The specs are self-contained — any agent with access to the repo can pick up from here. TP's answers to the open questions above will fill the remaining gaps before code generation begins.
