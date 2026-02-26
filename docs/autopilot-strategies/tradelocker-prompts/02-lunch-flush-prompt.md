# Lunch Flush – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Lunch Flush" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Lunch Flush is a reversal pattern strategy that trades during lunch hours (11:30 AM - 12:30 PM EST). It looks for overbought/oversold conditions with RSI divergence and exhaustion patterns.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.SMA` (20 period) on 5-minute chart for entry trigger
- `bt.indicators.RSI` (14 period) for divergence detection
- `bt.indicators.ATR` (14 period) for stop loss
- `bt.indicators.VWAP` (daily, reset at market open) for trend context
- Volume average (20 period) for volume confirmation

### 3. Entry Logic (Long Setup)
1. **Time Window**: Only trade between 11:30 AM - 12:30 PM EST
2. **Overbought Condition**: Price extended above VWAP/EMAs from early session
3. **RSI Divergence**: 
   - RSI makes lower high compared to early session high (within last 2 hours)
   - Price makes higher high (bearish divergence)
   - Detect by comparing current swing high to early session high
4. **Exhaustion**: 
   - 15-20 minute move in one direction (3-4 bars on 5-minute chart)
   - Volume decreasing on continuation
5. **Entry Trigger**: 
   - Price retraces to 20 SMA on 5-minute chart
   - Bullish reversal candle at SMA
   - Volume above average

### 4. Entry Logic (Short Setup)
- Same logic but reversed (oversold, bullish divergence, price at 20 SMA)

### 5. Exit Logic
- **Stop Loss**: Below exhaustion swing low (long) or above swing high (short), or 1.5x ATR
- **Take Profit**: 
  - Primary: 2R (2x risk/reward)
  - Trailing stop after 1R reached
- **Time-based Exit**: **MANDATORY** - Flatten all positions by 1:00 PM EST (before power hour)

### 6. Risk Management
- **Risk Per Trade**: 0.5-1% of account (configurable, default 1%)
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 1 trade per symbol (lunch window only)
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if daily loss limit reached

### 7. Required Parameters (params_metadata)
- `time_window_start` (str, default "11:30"): Start time (EST)
- `time_window_end` (str, default "12:30"): End time (EST)
- `exit_time` (str, default "13:00"): Mandatory exit time (1:00 PM EST)
- `exhaustion_bars` (int, default 18): Bars for exhaustion detection
- `sma_period` (int, default 20): SMA period for 5-minute chart
- `rsi_period` (int, default 14): RSI period
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 1.5): ATR multiplier for stops
- `risk_percent` (float, default 1.0): Risk per trade %
- `max_daily_loss` (float, default 3.0): Max daily loss %

### 8. Time Handling
- Use `self.data.datetime.datetime()` for time checks
- Convert to EST/EDT timezone
- Enforce strict time window (only 11:30 AM - 12:30 PM)
- **Critical**: Always exit by 1:00 PM EST (no exceptions)

### 9. Code Structure
- Complete Backtrader strategy class
- Custom VWAP indicator (daily reset)
- Divergence detection (compare swing highs/lows)
- Early session high/low tracking (for divergence reference)
- Volume confirmation logic
- Time-based exit enforcement

### 10. Special Requirements
- **5-Minute Chart**: Entry trigger uses 20 SMA on 5-minute chart
- **Early Exit**: Always exit before 1:00 PM to avoid power hour conflicts
- **Low Volume Protection**: Skip entry if volume is below average
- **Monday/Friday**: Consider reducing activity on these days (lower participation)

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code should enforce time windows strictly and always exit before 1:00 PM EST.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
