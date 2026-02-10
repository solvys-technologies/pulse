# Charged Rippers – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Charged Rippers" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Charged Rippers (Print Charged Ripper) is an oversold bounce strategy triggered by hot economic prints. It uses Fibonacci retracement levels with EMA confluence and requires antilag confirmation.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.SMA` (21 period) on 5-minute chart for entry trigger
- `bt.indicators.EMA` (20, 50 periods) for confluence detection
- `bt.indicators.ATR` (14 period) for stop loss
- Custom Fibonacci retracement calculator (38.2%, 50%, 61.8%)
- Volume average (20 period) for volume confirmation
- Custom antilag detector (volume surge + price velocity)

### 3. Entry Logic (Long Setup)
1. **Hot Economic Print**: 
   - Major economic release detected (NFP, CPI, FOMC, GDP, Retail Sales)
   - Print is significantly different from expectations
   - Market reacts strongly: Move >50 points in NAS100 (configurable threshold)
   - **Note**: Economic calendar integration may not be available - use price movement as proxy (large move >50 points within 5 minutes)
2. **Fibonacci Retracement**: 
   - Calculate Fib levels from pre-release high to reaction low
   - Key levels: 38.2%, 50%, 61.8%
   - Store pre-release high and reaction low in strategy state
3. **EMA Confluence**: 
   - 20 EMA or 50 EMA aligns with Fib level (within 0.5% of Fib level)
   - Price bounces from confluence zone
4. **Antilag Confirmation** (REQUIRED):
   - Approximate antilag using volume surge + price velocity
   - Volume surge: Volume > 1.5x average in last 90 seconds
   - Price velocity: Price change > 0.3% in last 90 seconds
   - **Strategy will not trigger without antilag confirmation**
5. **Entry Trigger**: 
   - Price bounces from Fib/EMA confluence
   - Entry on 21 SMA (5-minute chart)
   - Bullish reversal candle
   - Antilag confirms

### 4. Entry Logic (Short Setup)
- Hot print causes spike up
- Fib retracement from spike low to reaction high
- EMA confluence at Fib level
- Antilag confirmation
- Entry on 21 SMA (5-minute chart), bearish reversal

### 5. Exit Logic
- **Stop Loss**: 
  - Below Fib level (38.2% or 50%) for longs
  - Or below reaction low (the extreme low during print reaction)
  - Or 1.5x ATR from entry
- **Take Profit**: 
  - Primary: 2R (2x risk/reward)
  - Fib Target: Next Fib level (50% -> 61.8% -> 100% retracement)
  - Time-based Exit: Exit within 1 hour of entry (volatility decays after print)

### 6. Risk Management
- **Risk Per Trade**: 0.5-0.75% of account (reduced due to volatility, default 0.75%)
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 2 trades (economic releases are limited)
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 7. Required Parameters (params_metadata)
- `print_move_threshold` (float, default 50.0): Minimum move in points to trigger (50 points)
- `fib_level_1` (float, default 38.2): First Fib level %
- `fib_level_2` (float, default 50.0): Second Fib level %
- `fib_level_3` (float, default 61.8): Third Fib level %
- `sma_period` (int, default 21): SMA period for 5-minute chart
- `ema_fast` (int, default 20): Fast EMA period
- `ema_slow` (int, default 50): Slow EMA period
- `ema_confluence_tolerance` (float, default 0.5): EMA must be within 0.5% of Fib level
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 1.5): ATR multiplier for stops
- `antilag_volume_multiplier` (float, default 1.5): Volume surge threshold
- `antilag_velocity_percent` (float, default 0.3): Price velocity threshold %
- `antilag_window_seconds` (int, default 90): Antilag detection window
- `risk_percent` (float, default 0.75): Risk per trade % (reduced)
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trades_per_day` (int, default 2): Max trades per day
- `max_trade_duration_minutes` (int, default 60): Max trade duration

### 8. Economic Print Detection
Since economic calendar integration may not be available:
- **Proxy Method**: Detect large price moves (>50 points) within 5 minutes
- **Store State**: Track pre-move high/low and reaction extreme
- **Time Window**: Trade within 30 minutes of detected "print" (large move)
- **Manual Override**: Could add parameter to manually trigger on known release times

### 9. Antilag Approximation
Approximate antilag using:
- **Volume Surge**: Volume in last 90 seconds > 1.5x average volume
- **Price Velocity**: Price change in last 90 seconds > 0.3%
- **Synchronization**: Both conditions must be met within 90-second window

### 10. Code Structure
- Complete Backtrader strategy class
- Fibonacci retracement calculator (custom indicator or function)
- EMA confluence detection (check if EMA within tolerance of Fib level)
- Pre-release high/low tracking (store in strategy state)
- Reaction extreme tracking (store reaction high/low)
- Antilag approximation (volume + velocity)
- 5-minute chart handling
- Time-based exit (1 hour after entry)

### 11. Special Requirements
- **Antilag Required**: Strategy will not trigger without antilag confirmation
- **Economic Calendar**: Economic calendar integration ideal but not required (use price movement proxy)
- **High Volatility**: Expect large moves and wide stops - use appropriate position sizing
- **False Prints**: Some prints cause initial move then reverse - wait for confirmation (bounce from Fib)
- **News Risk**: High risk strategy - only for experienced traders
- **5-Minute Chart**: Entry uses 21 SMA on 5-minute chart

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code must implement Fibonacci retracement calculation, EMA confluence detection, and antilag approximation.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Implement custom Fibonacci calculator
- Use 5-minute chart for all entry logic
