# Morning Flush – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Morning Flush" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Morning Flush is a reversal strategy that targets exhaustion moves in the first 30 minutes after market open. It looks for parabolic moves that reverse with RSI divergence.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.EMA` (20 period) for trend filter
- `bt.indicators.RSI` (14 period) for divergence detection
- `bt.indicators.ATR` (14 period) for stop loss calculation
- Custom VWAP indicator (daily VWAP reset at market open)
- Volume average (20 period) for volume confirmation

### 3. Entry Logic (Long Setup)
1. **Time Window**: Only trade between 8:00 AM - 9:20 AM EST or 11:30 AM - 1:30 PM EST
2. **Gap Condition**: Price opened with a gap (gap down for long entries)
4. **Exhaustion Detection**: 
   - 15-20 minute parabolic move in opposite direction
   - Use price movement over last 15-20 bars (5-minute bars = 3-4 bars, adjust for timeframe)
   - Price makes extreme move away from opening price
5. **RSI Divergence**: 
   - RSI in neutral zone (30-70)
   - Bullish divergence: Price makes lower low, RSI makes higher low
   - Detect divergence by comparing last swing low to previous swing low
6. **HTF Liquidity Sweep**: 
   - Price sweeps previous day's high/low or key level
   - Create custom indicator to track previous day's high/low
7. **Entry Trigger**: 
   - Price closes back above 20 EMA or prior swing high
   - Volume above 20-period average
   - Bullish reversal candle (close > open, close > prior close)

### 4. Entry Logic (Short Setup)
- Same logic but reversed (gap up, bearish divergence, price below 20 EMA)

### 5. Exit Logic
- **Stop Loss**: Below divergence swing low (long) or above swing high (short), or 2x ATR from entry
- **Take Profit**: 
  - Primary: 2R (2x risk/reward)
  - Secondary: 3R (partial exit)
  - Trailing stop after 1R reached
- **Time-based Exit**: Flatten position after 75 minutes (1hr 15min) maximum

### 6. Risk Management
- **Risk Per Trade**: 0.5-1% of account (configurable parameter, default 1%)
- **Max Daily Loss**: 3% of account - after this, no new trades allowed
- **Max Trades Per Day**: 2 trades per symbol (configurable)
- **Position Sizing**: Calculate based on stop loss distance and risk percent
- **Daily Loss Tracking**: Store daily PnL in strategy state, check before each entry

### 7. Required Parameters (params_metadata)
- `exhaustion_bars` (int, default 18): Bars to look back for exhaustion (adjust for timeframe)
- `rsi_period` (int, default 14): RSI period
- `ema_period` (int, default 20): EMA period
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 2.0): ATR multiplier for stop loss
- `risk_percent` (float, default 1.0): Risk per trade as % of account
- `max_daily_loss` (float, default 3.0): Max daily loss as % of account
- `max_trades_per_day` (int, default 2): Maximum trades per day
- `max_trade_duration_minutes` (int, default 75): Maximum trade duration

### 8. Time Handling
- Use `self.data.datetime.datetime()` to get current bar time
- Convert to EST/EDT timezone for time window checks
- Handle daylight saving time automatically
- Only trade during specified time windows

### 9. Code Structure
- Create complete Backtrader strategy class
- Include proper error handling
- Add logging for debugging (use `self.log()` method)
- Track daily PnL, trade count, and position state
- Implement custom VWAP indicator (reset daily at market open)
- Implement divergence detection logic (compare swing lows/highs)

### 10. Special Requirements
- **No Overnight Positions**: Always flatten before market close
- **Daily Reset**: Reset daily counters (PnL, trade count) at market open
- **Volume Confirmation**: Always require volume above average for entry

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code should be production-ready and handle edge cases.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Follow Backtrader best practices for strategy implementation
