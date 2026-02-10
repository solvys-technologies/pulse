# 22 VIX Fix – TradeLocker Studio Prompt

You are TradeLocker Studio's AI assistant. Build a new bot called "22 VIX Fix" using the Backtrader framework (Python) with the following rules:

## Strategy Overview
22 VIX Fix is a mean reversion long-only strategy designed for high volatility panic scenarios. Since TradeLocker has no VIX data access, this strategy is **manually enabled** when you observe panic conditions (large market drops, high volatility). The strategy waits for NAS100 bounce exhaustion after a significant drop before entering long positions.

## Implementation Requirements

### 1. Backtrader Framework Structure
- Use `bt.Strategy` as the base class
- Implement `__init__()` for indicator setup
- Implement `next()` for trading logic
- Use `params` dictionary for configurable parameters
- Include `params_metadata` for UI configuration

### 2. Indicators Required
- `bt.indicators.ATR` (14 period) for stop loss calculation and volatility measurement
- Custom indicator to track panic low (lowest price during panic drop)
- Volume average (20 period) for volume confirmation
- `bt.indicators.RSI` (14 period) for oversold recovery detection

### 3. Entry Logic (Long Only)
**IMPORTANT**: This strategy requires **manual enablement**. Add a parameter `strategy_enabled` (boolean) that must be set to `True` for the strategy to trade. When you observe panic conditions (large market drop, high volatility), manually enable this strategy.

1. **Strategy Enabled Check**: `strategy_enabled` parameter must be `True` (manual enablement)
2. **Panic Drop Detection**: 
   - NAS100 has dropped significantly (track in strategy state)
   - Drop threshold: Price dropped >2% or >50 points within last 2 hours (configurable)
   - Drop occurred within last 2 hours (check price vs price 2 hours ago)
   - User has not already taken a trade on this move (track in state)
3. **Volatility Confirmation**: 
   - ATR is elevated (ATR > 1.5x average ATR over last 20 bars)
   - High volatility indicates panic conditions
4. **Bounce Exhaustion**: 
   - Initial bounce from panic low shows exhaustion
   - Price retraces but holds above prior panic low
   - Volume decreasing on retracement
   - RSI shows oversold recovery (RSI was <30, now rising)
5. **Entry Trigger**: 
   - Price bounces from retracement low
   - Bullish reversal candle
   - Volume confirmation (volume above average)
   - ATR begins to decrease (volatility normalizing)

### 4. Exit Logic
- **Stop Loss**: 
  - Below the panic low (lowest point during panic drop)
  - Or 2x ATR if no clear panic low
  - If ATR spikes above 2.5x average (extreme volatility), reduce position or exit
- **Take Profit**: 
  - Primary: 2R (2x risk/reward)
  - Volatility Normalization: Exit when ATR drops below 1.2x average (volatility normalizing)
  - Price Recovery: Exit when price recovers to pre-panic level or key resistance
  - Trailing stop after 1R reached (trail at 1R distance)

### 5. Risk Management
- **Risk Per Trade**: 0.5-1% of account (configurable, default 1%)
- **High Volatility Adjustment**: If ATR > 2x average ATR, reduce position size by 50%
- **Max Daily Loss**: 3% of account
- **Max Trades Per Day**: 2 trades (to avoid overexposure to volatility)
- **Position Sizing**: Based on stop loss distance
- **Daily Loss Tracking**: Check before entry, block if limit reached

### 6. Required Parameters (params_metadata)
- `strategy_enabled` (bool, default False): **MANUAL ENABLEMENT** - Set to True when you observe panic conditions
- `drop_threshold_percent` (float, default 2.0): Minimum price drop % to trigger panic detection (2-5%)
- `drop_threshold_points` (float, default 50.0): Alternative drop threshold in points (50-100)
- `atr_period` (int, default 14): ATR period
- `atr_multiplier` (float, default 2.0): ATR multiplier for stops
- `atr_volatility_threshold` (float, default 1.5): ATR multiplier for volatility confirmation (1.5x average)
- `atr_extreme_threshold` (float, default 2.5): ATR multiplier for extreme volatility exit (2.5x average)
- `atr_normalization_threshold` (float, default 1.2): ATR multiplier for volatility normalization exit (1.2x average)
- `rsi_period` (int, default 14): RSI period for oversold detection
- `rsi_oversold` (float, default 30.0): RSI oversold threshold
- `risk_percent` (float, default 1.0): Risk per trade %
- `max_daily_loss` (float, default 3.0): Max daily loss %
- `max_trades_per_day` (int, default 2): Max trades per day
- `price_recovery_threshold` (float, default 0.5): Price recovery % from panic low for exit (0.5 = 50% recovery)

### 7. Manual Enablement
- **Strategy Disabled by Default**: `strategy_enabled` parameter defaults to `False`
- **Manual Activation**: When you observe panic conditions (large market drop, high volatility, news events), set `strategy_enabled = True`
- **Disable After Trade**: Consider disabling after taking a trade to avoid overexposure
- **Volatility Proxy**: Use ATR-based volatility measurement instead of VIX

### 8. Price Recovery Exit
- **Recovery Detection**: Track price recovery from panic low
- **Recovery Threshold**: Exit when price recovers 50% (configurable) from panic low to pre-panic level
- **Alternative**: Exit when price breaks above key resistance level (prior swing high before panic)

### 9. Code Structure
- Complete Backtrader strategy class
- Manual enablement check (`strategy_enabled` parameter)
- Panic low tracking (store lowest price during panic drop)
- Pre-panic level tracking (store price before panic drop)
- Drop detection (price drop > threshold within 2 hours)
- ATR-based volatility measurement (elevated ATR = panic conditions)
- Bounce exhaustion detection (price retracement after initial bounce)
- RSI oversold recovery detection
- Price recovery tracking (monitor recovery from panic low)
- Trade tracking (prevent re-entry on same move)
- Position size adjustment based on ATR volatility level

### 10. Special Requirements
- **Long Only**: Strategy only takes long positions (no short entries)
- **Manual Enablement Required**: Strategy is disabled by default - you must manually enable when panic conditions are observed
- **High Volatility**: Expect large moves (50+ points in NAS100) - use appropriate position sizing
- **ATR-Based Volatility**: Use ATR as proxy for VIX (elevated ATR = high volatility/panic)
- **False Signals**: Panic drops can continue - wait for bounce exhaustion confirmation
- **News Events**: High risk strategy - only for experienced traders
- **When to Enable**: Enable manually when you observe:
  - Large market drops (>2% or >50 points)
  - High volatility (ATR elevated)
  - News-driven panic
  - Market-wide selloffs

## Expected Output
Provide the complete Backtrader strategy class code ready to paste into TradeLocker Studio. Include all indicators, entry/exit logic, risk management, and parameter metadata. The strategy must include a `strategy_enabled` boolean parameter that defaults to `False` and must be manually set to `True` to enable trading. Use ATR-based volatility measurement instead of VIX data. Use NAS100 as the single data feed.

## Reference
- Backtrader documentation: https://www.backtrader.com/
- Use standard Backtrader indicators and order management
- Use single data feed: `self.datas[0]` for NAS100
