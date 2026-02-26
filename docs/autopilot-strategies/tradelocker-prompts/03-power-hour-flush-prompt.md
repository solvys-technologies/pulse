# Power Hour Flush – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Power Hour Flush" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Power Hour Flush is a reversal strategy that trades in the final hour before market close (3:00-4:00 PM EST). It targets exhaustion moves that reverse into the close with volume confirmation.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.EMA` (20 period) for trend filter
- `bt.indicators.VWAP` (daily, reset at market open) for key level
- `bt.indicators.ATR` (14 period) for stop loss
- Volume average (20 period) for volume confirmation

### 3. Entry Logic (Long Setup)
1. **Time Window**: Only trade between 3:00 PM - 3:55 PM EST (5-minute buffer before close)
2. **Reversal into Close**: Price extended down during afternoon, showing exhaustion
3. **Exhaustion Pattern**: 
   - 15-20 minute move down (3-4 bars on 5-minute chart)
   - Decreasing momentum (slowing price movement)
   - Volume decreasing on continuation
4. **Entry Trigger**: 
   - Bullish reversal candle
   - Price reclaims key level (VWAP, 20 EMA, or prior support)
   - Volume spike on reversal (above average)

### 4. Entry Logic (Short Setup)
- Same logic but reversed (extended up, bearish reversal, breaks below key level)

### 5. Exit Logic
- **Stop Loss**: Below exhaustion low (long) or above exhaustion high (short), or 1.5x ATR
- **Take Profit**: 
  - Primary: 2R (quick scalp due to time constraint)
  - Trailing stop after 1R reached
- **Time-based Exit**: **MANDATORY** - Flatten all positions by 3:55 PM EST (5 minutes before market close)
- **No Overnight**: Strategy never holds overnight positions

### 6. Risk Management
- **Risk Per Trade**: 0.5-0.75% of account (reduced due to time constraint, default 0.75%)
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 1 trade per symbol (power hour only)
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 7. Required Parameters (params_metadata)
- `time_window_start` (str, default "15:00"): Start time (3:00 PM EST)
- `time_window_end` (str, default "15:55"): End time (3:55 PM EST)
- `market_close_time` (str, default "16:00"): Market close time (4:00 PM EST)
- `exhaustion_bars` (int, default 18): Bars for exhaustion detection
- `ema_period` (int, default 20): EMA period
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 1.5): ATR multiplier (tighter stops)
- `risk_percent` (float, default 0.75): Risk per trade % (reduced)
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trade_duration_minutes` (int, default 55): Max duration until 3:55 PM

### 8. Time Handling
- Use `self.data.datetime.datetime()` for time checks
- Convert to EST/EDT timezone
- Enforce strict time window (3:00 PM - 3:55 PM)
- **Critical**: Always exit by 3:55 PM EST (5-minute buffer before close)
- Check time on every bar in `next()` method

### 9. Code Structure
- Complete Backtrader strategy class
- Custom VWAP indicator (daily reset)
- Exhaustion detection (15-20 minute moves)
- Volume confirmation logic
- Time-based exit enforcement (check every bar)
- Key level identification (VWAP, EMA, support/resistance)

### 10. Special Requirements
- **Time Critical**: Must exit before market close - no exceptions
- **Volume Required**: Needs sufficient volume (skip low-volume days, especially Fridays)
- **News Risk**: Consider pausing during FOMC announcements or major news (3:00 PM window)
- **Overtrading Protection**: Only one trade per day in this window
- **Quick Scalps**: Targets are tighter (2R) due to time constraint

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code must enforce the 3:55 PM exit time strictly - check time on every bar and exit immediately if time limit reached.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Implement time-based exit checks in `next()` method
