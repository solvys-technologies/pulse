# EMA Divergence 20/100 + RSI 15m – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "EMA Divergence 20/100 + RSI 15m" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
EMA Divergence 20/100 + RSI 15m is a trend-following strategy that uses EMA crossovers (20/100) to define trend context, then enters on RSI divergence signals within that trend. All logic is based on 15-minute bars.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration
- **Timeframe**: Strategy is designed for 15-minute bars

### 2. Indicators Required
- `bt.indicators.EMA` (20 period) - Fast EMA
- `bt.indicators.EMA` (100 period) - Slow EMA
- `bt.indicators.RSI` (14 period) - For divergence detection
- `bt.indicators.ATR` (14 period) - For stop loss calculation
- Volume average (20 period) - For volume confirmation
- Custom swing high/low detector - For divergence identification

### 3. Trend Context (Required First)

**Uptrend Definition**:
- 20 EMA > 100 EMA
- Both EMAs sloping upward (current EMA > EMA[1])
- EMA separation: Distance between 20 EMA and 100 EMA > 0.5% of current price (to avoid flat/compressed markets)

**Downtrend Definition**:
- 20 EMA < 100 EMA
- Both EMAs sloping downward (current EMA < EMA[1])
- EMA separation: Distance between EMAs > 0.5% of price

**No-Trade Zone**:
- EMAs are tightly compressed (distance < 0.5% of price)
- EMAs are flat (slope < 0.1% per bar)
- Price is choppy between EMAs

### 4. Entry Logic (Long Setup)
1. **Trend Context**: 
   - 20 EMA > 100 EMA (uptrend confirmed)
   - EMAs properly separated (>0.5% distance)
   - Price is above 20 EMA
2. **RSI Bullish Divergence**:
   - Identify last swing low in price (within last 20 bars)
   - Identify previous swing low (before the last one, within last 40 bars)
   - Price: Higher low (last swing low > previous swing low)
   - RSI: Higher low (RSI at last swing low > RSI at previous swing low)
   - RSI was oversold (<30) or dipped below midline (50) before divergence
   - RSI is now rising from the divergence point
3. **Entry Trigger**:
   - Price closes back above 20 EMA (if it dipped below)
   - OR price closes above prior bar high
   - OR bullish reversal candle forms at 20 EMA support
   - Volume confirmation (volume above 20-period average)

### 5. Entry Logic (Short Setup)
1. **Trend Context**: 
   - 20 EMA < 100 EMA (downtrend confirmed)
   - EMAs properly separated (>0.5% distance)
   - Price is below 20 EMA
2. **RSI Bearish Divergence**:
   - Identify last swing high in price (within last 20 bars)
   - Identify previous swing high (before the last one, within last 40 bars)
   - Price: Lower high (last swing high < previous swing high)
   - RSI: Lower high (RSI at last swing high < RSI at previous swing high)
   - RSI was overbought (>70) or pushed above midline (50) before divergence
   - RSI is now declining from the divergence point
3. **Entry Trigger**:
   - Price closes back below 20 EMA (if it bounced above)
   - OR price closes below prior bar low
   - OR bearish reversal candle forms at 20 EMA resistance
   - Volume confirmation (volume above average)

### 6. Exit Logic
- **Stop Loss**: 
  - Primary: Just beyond the divergence swing low (long) or swing high (short)
  - Alternative: 1.5x ATR below entry (long) or above entry (short)
  - EMA Stop: Below 100 EMA (long) or above 100 EMA (short) - if price breaks through 100 EMA, trend may be reversing
- **Take Profit**: 
  - Primary Target: 2R (2x risk/reward ratio)
  - Secondary Target: 3R (3x risk/reward) - partial exit at 2R, trail remaining
  - EMA Target: Next EMA level (20 EMA for shorts, 100 EMA for longs in strong trends)
- **Trailing Stop**: 
  - Activation: After price reaches 1R (1x risk/reward)
  - Method: Trail stop at 1R distance from highest/lowest price since entry
  - Alternative: ATR-based trailing (1.5x ATR from highest/lowest price)
  - EMA Trailing: In strong trends, trail stop at 20 EMA (longs) or below 20 EMA (shorts)
- **Time-based Exit**: 
  - Max Trade Duration: 4 hours (16 bars on 15m timeframe)
  - End of Day: Flatten all positions 15 minutes before market close (3:45 PM EST)

### 7. Risk Management
- **Risk Per Trade**: 0.25-0.5% of account equity (configurable, default 0.5%)
- **Max Daily Loss**: 1.5-2% of account equity (configurable, default 2%)
  - After daily loss limit reached, no new trades allowed
  - Existing positions can be managed but no new entries
- **Max Trades Per Day**: 3 trades per symbol (configurable)
- **Max Concurrent Positions**: 1 position per symbol (no pyramiding)
- **Position Sizing**: Calculate based on stop loss distance and risk percent
- **Position Size Adjustments**: 
  - High Volatility: If ATR > 2x average ATR, reduce position size by 50%
  - Low Confidence: If divergence is weak or EMAs are close, reduce size by 25%
  - High Volatility: If ATR > 2x average ATR, reduce position sizes by 50% (volatility-based adjustment)

### 8. Required Parameters (params_metadata)
- `ema_fast` (int, default 20): Fast EMA period (15-25)
- `ema_slow` (int, default 100): Slow EMA period (80-120)
- `rsi_period` (int, default 14): RSI period (12-16)
- `rsi_oversold` (float, default 30.0): RSI oversold threshold (25-35)
- `rsi_overbought` (float, default 70.0): RSI overbought threshold (65-75)
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 1.5): ATR multiplier for stop loss (1.0-2.0)
- `ema_separation_threshold` (float, default 0.5): EMA separation % (minimum to avoid flat markets)
- `ema_slope_threshold` (float, default 0.1): EMA slope % per bar (minimum to avoid flat EMAs)
- `divergence_lookback` (int, default 20): Bars to look back for divergence (15-30)
- `volume_period` (int, default 20): Volume average period
- `risk_percent` (float, default 0.5): Risk per trade % (0.25-0.5)
- `max_daily_loss` (float, default 2.0): Max daily loss % (1.5-2.0)
- `max_trades_per_day` (int, default 3): Max trades per day (2-4)
- `target_rr_ratio` (float, default 2.0): Target risk/reward ratio (minimum 1.5:1)
- `max_trade_duration_bars` (int, default 16): Max trade duration in bars (4 hours on 15m)
- `end_of_day_exit_minutes` (int, default 15): Minutes before close to exit (3:45 PM EST)

### 9. Code Structure
- Complete Backtrader strategy class
- EMA trend context check (20 vs 100, separation, slope)
- Swing high/low detection (for divergence identification)
- RSI divergence detection (compare last two swing lows/highs)
- Divergence strength check (minimum RSI difference, e.g., 5 points)
- Volume confirmation logic
- Position sizing with volatility adjustments
- Trailing stop implementation (fixed distance or ATR-based)
- Time-based exit (max duration, end of day)
- Daily loss tracking and trade count tracking

### 10. Special Requirements
- **15-Minute Bars**: Strategy is designed for 15-minute bars - all logic assumes this timeframe
- **EMA Compression Check**: Always verify EMA separation before entry (avoid flat markets)
- **Divergence Strength**: Require minimum RSI difference (e.g., 5 points) between swing points
- **Volume Confirmation**: Always require volume above average for entry
- **Time Filters**: Avoid trading in first 15 minutes after open, last 15 minutes before close
- **Daily Loss Limit**: Hard stop after 2% daily loss (no new trades)
- **No Overnight**: Always flatten before market close (3:45 PM EST)
- **EMA Crossover During Trade**: If EMAs cross during open position, consider exiting (trend reversal)

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code must implement swing high/low detection, RSI divergence detection, EMA trend context checks, and trailing stops. All logic should be based on 15-minute bars.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Implement custom swing high/low detector for divergence identification
- Implement trailing stop using `self.broker.get_value()` or custom tracking
