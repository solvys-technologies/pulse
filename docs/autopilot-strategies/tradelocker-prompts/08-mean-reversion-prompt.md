# Mean Reversion – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Mean Reversion" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Mean Reversion is a strategy that trades extended moves back to VWAP or key EMAs. It identifies when price is stretched beyond normal range and enters on reversion signals.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.VWAP` (daily, reset at market open) for primary target
- `bt.indicators.EMA` (20, 50 periods) for alternative targets and stops
- `bt.indicators.ATR` (14 period) for extended move definition and stops
- `bt.indicators.RSI` (14 period) for reversion signals
- Volume average (20 period) for volume confirmation

### 3. Entry Logic (Long Setup)
1. **Extended Move Down**: 
   - Price stretched significantly below VWAP or key EMAs (20, 50)
   - Distance: >2x ATR from VWAP/EMA
   - Move occurred over 30+ minutes (6+ bars on 5-minute chart)
2. **Reversion Signal**: 
   - RSI oversold (<30) and beginning to turn up
   - Exhaustion pattern: Volume decreasing on continuation down
   - Bullish divergence: Price makes lower low, RSI makes higher low
3. **Entry Trigger**: 
   - Price shows first sign of reversal (bullish candle: close > open)
   - Volume increasing on reversal attempt (volume > average)
   - Price begins moving toward VWAP/EMA

### 4. Entry Logic (Short Setup)
- Extended move up (>2x ATR from VWAP/EMA)
- RSI overbought (>70) turning down
- Bearish divergence (price higher high, RSI lower high)
- Volume decreasing on continuation up
- Bearish reversal candle with volume

### 5. Exit Logic
- **Stop Loss**: 
  - Below the extended move low (long) or above extended move high (short)
  - Or 2x ATR from entry if no clear extreme
  - VWAP Stop: If price breaks back through VWAP in wrong direction, exit
- **Take Profit**: 
  - Primary Target: VWAP (daily VWAP)
  - Secondary Target: Key EMA (20 or 50 EMA)
  - Alternative: 2R (2x risk/reward) if target is closer than VWAP/EMA
  - Trailing Stop: After price reaches VWAP, trail stop at VWAP level

### 6. Risk Management
- **Risk Per Trade**: 0.75-1% of account (configurable, default 1%)
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 3 trades per symbol
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 7. Required Parameters (params_metadata)
- `vwap_reset_time` (str, default "09:30"): VWAP reset time (market open)
- `ema_fast` (int, default 20): Fast EMA period
- `ema_slow` (int, default 50): Slow EMA period
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 2.0): ATR multiplier for extended move definition
- `atr_stop_multiplier` (float, default 2.0): ATR multiplier for stop loss
- `rsi_period` (int, default 14): RSI period
- `rsi_oversold` (float, default 30.0): RSI oversold threshold
- `rsi_overbought` (float, default 70.0): RSI overbought threshold
- `volume_period` (int, default 20): Volume average period
- `extended_move_bars` (int, default 6): Minimum bars for extended move (30+ minutes)
- `risk_percent` (float, default 1.0): Risk per trade %
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trades_per_day` (int, default 3): Max trades per day
- `target_rr_ratio` (float, default 2.0): Alternative target (2R)

### 8. VWAP Handling
- **Daily Reset**: VWAP resets at market open (9:30 AM EST)
- **Custom VWAP**: May need to implement custom VWAP indicator that resets daily
- **VWAP as Target**: Primary target is always VWAP
- **VWAP as Stop**: If price breaks back through VWAP after entry, exit

### 9. Code Structure
- Complete Backtrader strategy class
- Custom VWAP indicator (daily reset at market open)
- Extended move detection (>2x ATR from VWAP/EMA)
- RSI divergence detection (compare swing lows/highs)
- Volume confirmation logic
- VWAP/EMA target calculation
- Trailing stop at VWAP after target reached

### 10. Special Requirements
- **Trend Context**: Works best in range-bound or choppy markets
- **Strong Trends**: Avoid in strong trending markets (price can stay extended)
- **VWAP Critical**: VWAP is the primary target - price often respects it
- **False Signals**: Extended moves can continue - wait for exhaustion signals (RSI, volume)
- **Volume Confirmation**: Required for entry - low volume reversals often fail
- **VWAP Reset**: Ensure VWAP resets daily at market open

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code must implement custom VWAP with daily reset and proper extended move detection.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Implement custom VWAP indicator that resets daily at market open
