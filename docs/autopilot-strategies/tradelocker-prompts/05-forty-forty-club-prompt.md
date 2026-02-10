# 40/40 Club – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "40/40 Club" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
40/40 Club is an opening range breakout strategy with retracement entry. It requires NAS100 to break the opening range, then enters on a 40% retracement with antilag confirmation.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration
- **Single Data Feed**: Uses NAS100 as the primary instrument

### 2. Indicators Required
- `bt.indicators.EMA` (20 period) for retest detection
- `bt.indicators.ATR` (14 period) for stop loss
- Custom opening range indicator (tracks first 5-10 minutes high/low)
- Custom antilag detector (approximates tick surge using volume/price velocity)

### 3. Entry Logic (Long Setup)
1. **Time Window**: Only trade between 9:30 AM - 11:00 AM EST (opening range + breakout window)
2. **Opening Range**: 
   - Calculate range from first 5-10 minutes after market open (9:30 AM)
   - Range = High - Low of first 5-10 minutes
   - Target range size: ~40 points (adjustable)
3. **Opening Range Break**: 
   - Price breaks above opening range high
   - Breakout must be confirmed with volume surge
4. **40% Retracement**: 
   - After breakout, price retraces 40% of the range
   - Retracement finds support at EMA or prior level
5. **EMA Cross/Retest**: 
   - Price retests 20 EMA or breakout level
   - Fakeout pattern (breaks then retraces, then continues)
6. **Antilag Confirmation** (REQUIRED):
   - Approximate antilag using volume surge + price velocity on 5-minute bars
   - Volume surge: Volume > 1.5x average in recent 5-minute bars (approximating 90-second window)
   - Price velocity: Price change > 0.3% in recent bars
   - **Strategy will not trigger without antilag confirmation**
7. **Entry Trigger**: 
   - Price bounces from retracement level
   - Bullish reversal candle
   - Antilag confirms

### 4. Entry Logic (Short Setup)
- Opening range break down
- 40% retracement up
- EMA retest/fakeout
- Antilag confirmation (volume surge + price velocity down)
- Bearish reversal candle

### 5. Exit Logic
- **Stop Loss**: 
  - 5 points below the opening range low (long) or 5 points above high (short)
  - Or 5 points outside the range
- **Take Profit**: 
  - Primary: 40 points from entry (range size)
  - Alternative: 3x risk/reward ratio (3R)
  - **Use whichever is closer** (40 points or 3R)
  - Trailing stop after 1R reached

### 6. Risk Management
- **Risk Per Trade**: 0.75-1% of account (configurable, default 1%)
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 2 trades per symbol
- **Position Sizing**: Based on 5-point stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 7. Required Parameters (params_metadata)
- `opening_range_minutes` (int, default 10): Minutes for opening range (5-10)
- `range_size_target` (float, default 40.0): Target range size in points (30-50)
- `retracement_percent` (float, default 40.0): Retracement % (30-50)
- `stop_loss_points` (float, default 5.0): Stop loss distance in points
- `target_points` (float, default 40.0): Target in points
- `target_rr_ratio` (float, default 3.0): Alternative target (3R)
- `ema_period` (int, default 20): EMA period
- `atr_period` (int, default 14): ATR period
- `antilag_volume_multiplier` (float, default 1.5): Volume surge threshold
- `antilag_velocity_percent` (float, default 0.3): Price velocity threshold %
- `antilag_window_seconds` (int, default 90): Antilag detection window
- `risk_percent` (float, default 1.0): Risk per trade %
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trades_per_day` (int, default 2): Max trades per day

### 8. Antilag Approximation
Since tick-level data is not available in TradeLocker, approximate antilag using 5-minute bars:
- **Volume Surge**: Volume in recent 5-minute bars > 1.5x average volume
- **Price Velocity**: Price change in recent bars > 0.3%
- **Synchronization**: Volume surge and price velocity must occur together

### 9. Code Structure
- Complete Backtrader strategy class
- Single data feed (NAS100)
- Opening range calculation (first 5-10 minutes)
- Range break detection with volume confirmation
- Retracement calculation (0.414 or 0.236 of range)
- EMA retest detection
- Antilag approximation (volume + velocity on 5-minute bars)
- Position sizing based on 5-point stop

### 10. Special Requirements
- **Antilag Required**: Strategy will not trigger without antilag confirmation
- **Volume Confirmation**: Breakout must have volume surge confirmation
- **False Breakouts**: Common - wait for retracement and retest before entry
- **Range Size**: Adjust range size parameter based on market volatility
- **Best Days**: Works best on normal volatility days (not extreme news days)
- **Opening Range**: Reset opening range calculation at market open (9:30 AM EST)

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code must use NAS100 as the single data feed and implement antilag approximation using volume and price velocity on 5-minute bars.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Use single data feed: `self.datas[0]` for NAS100
- Implement custom antilag detector using available data (volume, price velocity)
