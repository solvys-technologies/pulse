# Autopilot Strategy Documentation

This directory contains comprehensive documentation and TradeLocker Studio prompts for all Autopilot trading strategies.

## Directory Structure

```
autopilot-strategies/
├── README.md                          # This file
├── STRATEGY-INDEX.md                  # Complete catalog of all strategies
├── STRATEGY-SPECS.md                  # Detailed technical specifications
├── EMA-RSI-DIVERGENCE-SPEC.md        # New EMA/RSI divergence strategy spec
└── tradelocker-prompts/               # TradeLocker Studio prompts
    ├── 01-morning-flush-prompt.md
    ├── 02-lunch-flush-prompt.md
    ├── 03-power-hour-flush-prompt.md
    ├── 04-vix-fix-22-prompt.md
    ├── 05-forty-forty-club-prompt.md
    ├── 06-momentum-prompt.md
    ├── 07-charged-rippers-prompt.md
    ├── 08-mean-reversion-prompt.md
    └── 09-ema-rsi-divergence-prompt.md
```

## Quick Start

1. **Browse Strategies**: Start with [STRATEGY-INDEX.md](STRATEGY-INDEX.md) for an overview of all strategies
2. **Read Specs**: See [STRATEGY-SPECS.md](STRATEGY-SPECS.md) for detailed technical specifications
3. **Get Prompts**: Copy prompts from `tradelocker-prompts/` directory and paste into TradeLocker Studio

## Strategy Catalog

### Existing Strategies (8)
1. **Morning Flush** - First 30min reversal after gap (VIX > 18 required)
2. **Lunch Flush** - 11:30am-12:30pm reversal pattern
3. **Power Hour Flush** - 3-4pm reversal into close
4. **22 VIX Fix** - Long NAS100 when panic conditions observed (manually enabled)
5. **40/40 Club** - Opening range breakout with retracement (requires antilag)
6. **Momentum** - Strong trend continuation with volume confirmation
7. **Charged Rippers** - Oversold bounce with hot economic prints (requires antilag)
8. **Mean Reversion** - Extended moves back to VWAP/EMAs

### New Strategy
9. **EMA Divergence 20/100 + RSI 15m** - Trend-following with RSI divergence on 15-minute bars

## Using TradeLocker Prompts

Each prompt file in `tradelocker-prompts/` is ready to paste directly into TradeLocker Studio's AI assistant. The prompts are structured for the Backtrader framework (Python) and include:

- Complete strategy requirements
- Backtrader-specific implementation details
- Risk management rules
- Parameter configurations
- Code structure requirements

### How to Use

1. Open TradeLocker Studio
2. Start a new bot
3. Open the AI assistant
4. Copy the entire contents of a prompt file
5. Paste into the AI assistant
6. Review and test the generated code

## Key Concepts

### Antilag Detection
Several strategies (40/40 Club, Charged Rippers) require **antilag confirmation**. Since tick-level data is not available in TradeLocker, the prompts include approximations using 5-minute bars:
- Volume surge detection
- Price velocity calculations
- Correlation between instruments

### Risk Management
All strategies enforce global risk rules:
- Max 1% risk per trade
- Min 1.5:1 risk/reward
- Max 3% daily drawdown
- VIX > 30: 50% position size reduction

### Time Windows
All time windows are in **EST/EDT** (US Eastern Time):
- Market open: 9:30 AM EST
- Market close: 4:00 PM EST
- Adjust for daylight saving time

## Notes

- Strategies are designed for NASDAQ-100 (NAS100)
- All strategies use single data feed (no secondary instruments required)
- VIX data may not be available - prompts include fallback logic
- All strategies are intraday only (no overnight positions)

## Reference

- Backtrader Framework: https://www.backtrader.com/
- Pulse Autopilot System: See main repository documentation
- Strategy Implementation: See `backend-hono/src/services/agents/trader-agent.ts`
