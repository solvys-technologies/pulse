# Momentum – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "Momentum" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
Momentum is a trend continuation strategy that enters strong trends with volume confirmation. It uses EMA alignment and breakout confirmation to enter in the direction of the trend.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.EMA` (20, 50, 100 periods) for trend identification
- `bt.indicators.ATR` (14 period) for stop loss and trailing stop
- Volume average (20 period) for volume confirmation
- Custom swing high/low indicator for breakout detection

### 3. Entry Logic (Long Setup)
1. **Strong Trend Identification**: 
   - Daily trend bullish: Price above daily EMAs (20, 50, 100)
   - Hourly trend bullish: Price above hourly EMAs (use shorter timeframe if available)
   - Price making higher highs and higher lows
   - EMAs in bullish order: 20 EMA > 50 EMA > 100 EMA
2. **Volume Confirmation**: 
   - Volume above 20-period average
   - Volume increasing on trend continuation
   - Volume spike on breakout (volume > 1.5x average)
3. **EMA Alignment**: 
   - Price above all EMAs (20, 50, 100)
   - EMAs properly separated (20 > 50 > 100)
4. **Breakout Confirmation**: 
   - Price breaks above prior swing high
   - Breakout candle closes near high (close > open, close in upper 25% of range)
   - Volume confirms breakout (above average)

### 4. Entry Logic (Short Setup)
- Strong bearish trend (price below EMAs, bearish order)
- Volume confirmation (above average, increasing)
- EMA alignment (price below all EMAs, bearish order: 20 < 50 < 100)
- Breakdown confirmation (breaks below swing low, bearish candle, volume)

### 5. Exit Logic
- **Stop Loss**: 
  - Below prior swing low (long) or above swing high (short)
  - Or 2x ATR from entry if no clear structure
  - Or below 20 EMA break (long) / above 20 EMA break (short)
- **Take Profit**: 
  - Primary: 2R (2x risk/reward)
  - Trailing Stop: 
    - Activate after 1R reached
    - Trail at 1R distance from highest/lowest price since entry
    - Or use ATR-based trailing (1.5x ATR from highest/lowest)
- **Trend Exhaustion Exit**: 
  - Exit when trend shows exhaustion
  - RSI divergence (price higher high, RSI lower high for longs)
  - Volume decreasing on continuation
  - Price breaks below 20 EMA (long) / above 20 EMA (short)

### 6. Risk Management
- **Risk Per Trade**: 0.75-1% of account (configurable, default 1%)
- **Volume-based Sizing**: Increase size by 25% if volume is 2x average
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 3 trades per symbol
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 7. Required Parameters (params_metadata)
- `ema_fast` (int, default 20): Fast EMA period
- `ema_medium` (int, default 50): Medium EMA period
- `ema_slow` (int, default 100): Slow EMA period
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 2.0): ATR multiplier for stops
- `atr_trailing_multiplier` (float, default 1.5): ATR multiplier for trailing stop
- `volume_period` (int, default 20): Volume average period
- `volume_multiplier` (float, default 1.5): Volume multiplier for entry (minimum)
- `volume_sizing_multiplier` (float, default 2.0): Volume multiplier for position sizing increase
- `risk_percent` (float, default 1.0): Risk per trade %
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trades_per_day` (int, default 3): Max trades per day
- `target_rr_ratio` (float, default 2.0): Target risk/reward ratio

### 8. Code Structure
- Complete Backtrader strategy class
- Multiple EMA indicators (20, 50, 100)
- EMA alignment check (bullish/bearish order)
- Swing high/low detection (for breakout/breakdown)
- Volume confirmation logic
- Volume-based position sizing
- Trailing stop implementation (ATR-based or fixed distance)
- Trend exhaustion detection (RSI divergence, volume decrease)

### 9. Special Requirements
- **Trend Strength**: Only trade strong, clear trends (avoid choppy markets)
- **Volume Critical**: Without volume confirmation, avoid entry
- **False Breakouts**: Common in choppy markets - wait for confirmation (close near high/low, volume)
- **Best in Trending Markets**: Underperforms in range-bound conditions
- **Trailing Stop**: Use trailing stop to capture extended moves

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The code should implement trailing stops and volume-based position sizing.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Implement trailing stop using `self.broker.get_value()` or custom tracking
