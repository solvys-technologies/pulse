# Strategy Execution Profile: 40/40 Club
<!-- claude-code 2026-02-28 | Full spec from TP walkthrough session -->

## Overview
Liquidity sweep reversal targeting ~40 points, typically firing ~40 minutes into the hourly candle. Entry is contrarian against a sweep at a Fib retracement level with Antilag confirmation.

**Instrument:** /MNQ (execution), /ES (confirmation only)
**Timeframe:** 1000-tick chart (primary), 15-min/1H (context)
**Platform:** TopstepX (TradingView-based), Rithmic data/execution

---

## Entry Logic

### Prerequisites
1. Price sweeps a **Fibonacci retracement level** on the 1000T chart
2. Sweep occurs near **20 EMA or 100 EMA extreme** (contrarian setup)
3. **Antilag signal fires** (see ANTILAG-SPEC.md) — composite read on tick velocity + volume + directional alignment across NQ (1000T) and ES (500T)
4. RSI (period 20, MA 20, 15-min) is outside neutral zone (45-55) indicating mean-reversion potential

### Entry Execution
- **Initial position:** 10 micro contracts (/MNQ)
- **Entry type:** Market order on Antilag confirmation
- **Stop:** Below the sweep wick (long) / above the sweep wick (short)
- **Target (TP1):** 100 EMA — **always takes precedence** over aggressive extension targets
- **Target (TP2/TP3):** Fib extensions (-0.756, -0.828, -0.844) — optional, only if TP1 clears cleanly

### Fibonacci Framework
- **Fib source:** 1000T context, exact Fib levels (not rounded)
- **Zone classification** (determines conviction/sizing, NOT eligibility):
  - **Ripper zone (0.222–0.361):** Highest conviction, full size
  - **Strong zone (0.414–0.618):** Standard conviction
  - **Weak zone (0.757–0.85):** Lower conviction, reduced size or skip
- Any zone CAN fire — zone does not gate eligibility

### Fib Anchoring
- Hybrid: algo auto-detects large moves + Pulse/OpenClaw fundamental catalyst detection + manual override
- Fibs drawn from **fundamentally driven moves** (not random swings)
- Anchored VWAP co-plotted from same anchor point

---

## Scale-In Logic

### Trigger (same for all three models)
- First 1000T candle closure **≥60% of 3-candle lookback ATR distance from 100 EMA**
- Then requires its own mini-setup:
  - **"Overtaking candle at a contested price"** — the engulfing candle that clears the 20 EMA
  - Scale-in entry placed **right below the bottom of the overtaking candle**
  - Scale-in stop placed **loosely below the bottom of the overtaking candle**

### Sizing
- **+5 micros per scale-in**
- **Max total: 25 contracts** (20 max after 12:30 ET)

### Break-Even Logic
- After scale-in, stop moves to break-even **only when DCA'd average price has sufficient clearance** (not immediately)

---

## Trailing Stop — 4 Phases

1. **Phase 1:** Below sweep wick (initial)
2. **Phase 2:** Break-even after scale-in AND DCA average has clearance
3. **Phase 3:** 20 EMA − 7 pts, snapped to cycle levels, on 1000T candle closures
4. **Phase 4:** 100 EMA trail when ATR > 17 on 3-candle lookback

### Cycle Levels
- **25-pt increments** when ATR ≤ 15
- **50-pt increments** when ATR > 15
- 20-candle lookback for ATR calculation

---

## Exit Logic

### TP1 (Primary)
- 100 EMA — **always takes precedence** over extension targets

### TP2/TP3 (Optional)
- Fib extensions: -0.756, -0.828, -0.844
- Only valid if TP1 clears with momentum

### PDPT (Personal Daily Profit Target)
- **Hard cap: $1,550** on $50K combine
- When $50–$100 remaining to PDPT: tighten limit orders to lock in
- PDPT hit → **lockout, no more trades**

---

## ORB Filter
- Open Range Breakout context from first 15 minutes
- Not a trade signal — used to calibrate directional bias for the session

---

## Open Questions (TBD)
- Fib invalidation logic (when to abandon a level)
- Anchored VWAP specification details
- DOM heuristic for exits (algo approximation of TP's visual reads)
