// [claude-code 2026-03-11] PlaybookSweepReclaim — MNQ 5-min sweep/reclaim algo with confluence signals
using System;
using System.Collections.Generic;
using System.Linq;
using QuantConnect.Data;
using QuantConnect.Data.Consolidators;
using QuantConnect.Data.Market;
using QuantConnect.Indicators;

namespace QuantConnect.Algorithm.CSharp
{
    public class PlaybookSweepReclaim : QCAlgorithm
    {
        // ── Config ────────────────────────────────────────────────────
        private const int    PivotLookback    = 14;
        private const int    RsiPeriod        = 14;
        private const int    RsiPivotLeft     = 5;
        private const int    RsiPivotRight    = 5;
        private const int    EmaFast          = 20;
        private const int    EmaSlow          = 100;
        private const int    HtfPatternBars   = 20;
        private const int    MaxTradesPerDay  = 3;
        private const decimal StartingCash    = 50_000m;

        // ── Symbols & indicators ──────────────────────────────────────
        private Symbol _mnq;
        private RelativeStrengthIndex _rsi;
        private ExponentialMovingAverage _emaFast;
        private ExponentialMovingAverage _emaSlow;

        // ── State ─────────────────────────────────────────────────────
        private readonly List<LiquidityZone> _zones = new List<LiquidityZone>();
        private readonly PivotDetector _pricePivot  = new PivotDetector(PivotLookback / 2, PivotLookback / 2);
        private readonly PivotDetector _rsiPivot    = new PivotDetector(RsiPivotLeft, RsiPivotRight);
        private readonly List<TradeBar> _htfBars    = new List<TradeBar>();
        private TradeBar _prevHtfBar;

        // RSI pivot value tracking
        private readonly List<decimal> _rsiValues = new List<decimal>();
        private decimal _lastRsiPivotHigh, _prevRsiPivotHigh;
        private decimal _lastRsiPivotLow,  _prevRsiPivotLow;

        // EMA cross state machine
        private bool _pendingBullRetest;
        private bool _pendingBearRetest;
        private bool _lastCrossWasBull;

        // Daily trade counter
        private int _tradesToday;
        private DateTime _lastTradeDate;
        private int _barIndex;

        // ── Initialize ────────────────────────────────────────────────
        public override void Initialize()
        {
            // 5 trading days — Mon 2026-03-02 through Fri 2026-03-06
            SetStartDate(2026, 3, 2);
            SetEndDate(2026, 3, 6);
            SetCash(StartingCash);
            SetTimeZone(TimeZones.NewYork);

            // MNQ futures — use the continuous future mapping
            var future = AddFuture(Futures.Indices.MicroNASDAQ100EMini,
                Resolution.Minute,
                dataMappingMode: DataMappingMode.OpenInterest,
                contractDepthOffset: 0);
            future.SetFilter(0, 90); // front-month contracts within 90 days
            _mnq = future.Symbol;

            // Indicators will be registered on mapped contract
            _rsi     = new RelativeStrengthIndex(RsiPeriod, MovingAverageType.Wilders);
            _emaFast = new ExponentialMovingAverage(EmaFast);
            _emaSlow = new ExponentialMovingAverage(EmaSlow);

            // 15-min consolidator for HTF patterns
            // (will be set up when we get our first mapped contract)

            SetWarmUp(TimeSpan.FromDays(3));
        }

        // ── OnData (Minute resolution — we consolidate to 5-min) ──────
        private Symbol _mappedContract;
        private TradeBarConsolidator _fiveMinConsolidator;
        private TradeBarConsolidator _fifteenMinConsolidator;

        public override void OnData(Slice slice)
        {
            // Get the mapped front-month contract
            foreach (var chain in slice.FutureChains)
            {
                if (chain.Key.Canonical != _mnq) continue;
                var contract = chain.Value
                    .OrderBy(c => c.Expiry)
                    .FirstOrDefault();
                if (contract == null) continue;

                if (_mappedContract == null || _mappedContract != contract.Symbol)
                {
                    SetupConsolidators(contract.Symbol);
                }
                break;
            }
        }

        private void SetupConsolidators(Symbol contractSymbol)
        {
            // Clean up old consolidators
            if (_fiveMinConsolidator != null)
            {
                SubscriptionManager.RemoveConsolidator(_mappedContract, _fiveMinConsolidator);
                SubscriptionManager.RemoveConsolidator(_mappedContract, _fifteenMinConsolidator);
            }

            _mappedContract = contractSymbol;

            // 5-minute consolidator
            _fiveMinConsolidator = new TradeBarConsolidator(TimeSpan.FromMinutes(5));
            _fiveMinConsolidator.DataConsolidated += OnFiveMinBar;
            SubscriptionManager.AddConsolidator(_mappedContract, _fiveMinConsolidator);

            // 15-minute consolidator for HTF patterns
            _fifteenMinConsolidator = new TradeBarConsolidator(TimeSpan.FromMinutes(15));
            _fifteenMinConsolidator.DataConsolidated += OnFifteenMinBar;
            SubscriptionManager.AddConsolidator(_mappedContract, _fifteenMinConsolidator);

            // Reset indicators for new contract
            _rsi.Reset();
            _emaFast.Reset();
            _emaSlow.Reset();
        }

        // ── 5-Minute Bar Handler (core logic) ─────────────────────────
        private void OnFiveMinBar(object sender, TradeBar bar)
        {
            _barIndex++;

            // Update indicators
            _rsi.Update(bar.EndTime, bar.Close);
            _emaFast.Update(bar.EndTime, bar.Close);
            _emaSlow.Update(bar.EndTime, bar.Close);

            if (!_rsi.IsReady || !_emaSlow.IsReady) return;
            if (IsWarmingUp) return;

            // ── 1. Pivot detection & zone creation ────────────────────
            int pivotResult = _pricePivot.Update(bar.High, bar.Low);
            if (pivotResult == 1) // swing high confirmed
            {
                var ph = _pricePivot.LastPivotHigh;
                // Zone = max(close, open) at that bar to the high
                // Approximate: use high as upper, high - 0.3 * range as lower
                decimal zoneWidth = Math.Max(1m, ph * 0.0002m); // ~0.02% of price
                _zones.Add(new LiquidityZone
                {
                    High = ph,
                    Low  = ph - zoneWidth,
                    IsSwingHigh = true
                });
            }
            if (pivotResult == -1) // swing low confirmed
            {
                var pl = _pricePivot.LastPivotLow;
                decimal zoneWidth = Math.Max(1m, pl * 0.0002m);
                _zones.Add(new LiquidityZone
                {
                    High = pl + zoneWidth,
                    Low  = pl,
                    IsSwingHigh = false
                });
            }

            // Trim old zones (keep last 30)
            while (_zones.Count > 30) _zones.RemoveAt(0);

            // ── 2. Sweep & reclaim detection ──────────────────────────
            SignalDirection sweepDir = SignalDirection.None;
            LiquidityZone reclaimedZone = null;

            foreach (var zone in _zones)
            {
                if (zone.Fired) continue;

                if (!zone.Swept)
                {
                    // Check for sweep
                    if (zone.IsSwingHigh && bar.High > zone.High && bar.Close <= zone.High)
                    {
                        zone.Swept = true;
                        zone.SweepBar = _barIndex;
                        zone.ReclaimCount = 0;
                    }
                    else if (!zone.IsSwingHigh && bar.Low < zone.Low && bar.Close >= zone.Low)
                    {
                        zone.Swept = true;
                        zone.SweepBar = _barIndex;
                        zone.ReclaimCount = 0;
                    }
                }
                else
                {
                    // Check for reclaim (consecutive closes inside zone)
                    if (zone.Contains(bar.Close))
                    {
                        zone.ReclaimCount++;
                    }
                    else
                    {
                        zone.ReclaimCount = 0; // reset if price leaves zone
                    }

                    // 2 consecutive bars inside = reclaim confirmed
                    if (zone.ReclaimCount >= 2 && (_barIndex - zone.SweepBar) <= 20)
                    {
                        zone.Fired = true;
                        // Swing high swept + reclaimed = short (sellers defended)
                        // Swing low swept + reclaimed = long (buyers defended)
                        sweepDir = zone.IsSwingHigh ? SignalDirection.Short : SignalDirection.Long;
                        reclaimedZone = zone;
                        break; // one signal per bar
                    }
                }
            }

            // ── 3. RSI divergence detection ───────────────────────────
            _rsiValues.Add(_rsi.Current.Value);
            int rsiPivotResult = _rsiPivot.Update(_rsi.Current.Value, _rsi.Current.Value);
            if (rsiPivotResult == 1)
            {
                _prevRsiPivotHigh = _lastRsiPivotHigh;
                _lastRsiPivotHigh = _rsiPivot.LastPivotHigh;
            }
            if (rsiPivotResult == -1)
            {
                _prevRsiPivotLow = _lastRsiPivotLow;
                _lastRsiPivotLow = _rsiPivot.LastPivotLow;
            }

            // Trim RSI values
            if (_rsiValues.Count > 500) _rsiValues.RemoveRange(0, _rsiValues.Count - 500);

            SignalDirection rsiDivDir = SignalDirection.None;
            // Bullish divergence: price lower low, RSI higher low
            if (_pricePivot.LastPivotLow < _pricePivot.PrevPivotLow &&
                _pricePivot.PrevPivotLow > 0 &&
                _lastRsiPivotLow > _prevRsiPivotLow &&
                _prevRsiPivotLow > 0)
            {
                rsiDivDir = SignalDirection.Long;
            }
            // Bearish divergence: price higher high, RSI lower high
            if (_pricePivot.LastPivotHigh > _pricePivot.PrevPivotHigh &&
                _pricePivot.PrevPivotHigh > 0 &&
                _lastRsiPivotHigh < _prevRsiPivotHigh &&
                _prevRsiPivotHigh > 0)
            {
                rsiDivDir = SignalDirection.Short;
            }

            // ── 4. EMA cross + retest ─────────────────────────────────
            bool emaBullCross = _emaFast > _emaSlow;
            if (emaBullCross && !_lastCrossWasBull)
            {
                _pendingBullRetest = true;
                _pendingBearRetest = false;
            }
            else if (!emaBullCross && _lastCrossWasBull)
            {
                _pendingBearRetest = true;
                _pendingBullRetest = false;
            }
            _lastCrossWasBull = emaBullCross;

            SignalDirection emaRetestDir = SignalDirection.None;
            if (_pendingBullRetest && bar.Low <= _emaFast && bar.Close > _emaSlow)
            {
                emaRetestDir = SignalDirection.Long;
                _pendingBullRetest = false;
            }
            if (_pendingBearRetest && bar.High >= _emaFast && bar.Close < _emaSlow)
            {
                emaRetestDir = SignalDirection.Short;
                _pendingBearRetest = false;
            }

            // ── 5. Volume delta ───────────────────────────────────────
            decimal volDelta = 0m;
            if (bar.Volume > 0)
            {
                decimal buyVol  = bar.Close > bar.Open ? bar.Volume : 0;
                decimal sellVol = bar.Close < bar.Open ? bar.Volume : 0;
                volDelta = (buyVol - sellVol) / bar.Volume;
            }
            SignalDirection volDir = volDelta > 0 ? SignalDirection.Long
                                  : volDelta < 0 ? SignalDirection.Short
                                  : SignalDirection.None;

            // ── 6. HTF candle pattern (evaluated from stored 15-min bars)
            var htfPattern = GetHtfPattern();

            // ── 7. Session window check ───────────────────────────────
            // Algorithm time zone is already EST (SetTimeZone above)
            string sessionWindow = SessionWindows.GetActiveWindow(bar.EndTime);
            if (sessionWindow == null) return; // outside trading windows

            // ── 8. Signal composition ─────────────────────────────────
            if (sweepDir == SignalDirection.None) return; // primary signal required

            // Reset daily counter
            if (bar.EndTime.Date != _lastTradeDate)
            {
                _tradesToday = 0;
                _lastTradeDate = bar.EndTime.Date;
            }
            if (_tradesToday >= MaxTradesPerDay) return;

            // Build confidence
            int confidence = 70; // base from sweep + reclaim
            var signalTags = new List<string> { "liquidity_sweep" };

            if (rsiDivDir == sweepDir)
            {
                confidence += 15;
                signalTags.Add("rsi_divergence");
            }
            if (emaRetestDir == sweepDir)
            {
                confidence += 10;
                signalTags.Add("ema_retest");
            }

            string htfContext = "none";
            if (htfPattern != null && htfPattern.Direction == sweepDir && htfPattern.AtExtremity)
            {
                confidence += 10;
                signalTags.Add("htf_pattern");
                htfContext = htfPattern.PatternName;
            }

            if (volDir == sweepDir)
            {
                confidence += 5;
                signalTags.Add("volume_delta");
            }

            confidence = Math.Min(confidence, 100);

            // ── 9. Compute stop/target ────────────────────────────────
            decimal entry = bar.Close;
            decimal atr = EstimateAtr(bar); // rough ATR from recent bar range
            decimal stop, target;

            if (sweepDir == SignalDirection.Long)
            {
                stop   = reclaimedZone != null ? reclaimedZone.Low - atr * 0.5m : entry - atr * 2m;
                target = entry + (entry - stop) * 1.5m; // 1.5R
            }
            else
            {
                stop   = reclaimedZone != null ? reclaimedZone.High + atr * 0.5m : entry + atr * 2m;
                target = entry - (stop - entry) * 1.5m;
            }

            // ── 10. Strategy tagging ──────────────────────────────────
            string strategy = "PLAYBOOK_SWEEP_RECLAIM";
            var strategies = new List<string> { strategy };

            if ((sessionWindow == "morning_flush" || sessionWindow == "forty_forty") && rsiDivDir == sweepDir)
                strategies.Add("MORNING_FLUSH");
            if (sessionWindow == "forty_forty")
                strategies.Add("FORTY_FORTY_CLUB");
            if (emaRetestDir == sweepDir)
                strategies.Add("MOMENTUM");

            // ── 11. Emit signal ───────────────────────────────────────
            _tradesToday++;

            var signal = new SignalEvent
            {
                Strategy      = string.Join("|", strategies),
                Direction     = sweepDir == SignalDirection.Long ? "long" : "short",
                Confidence    = confidence,
                EntryPrice    = Math.Round(entry, 2),
                StopLoss      = Math.Round(stop, 2),
                TakeProfit    = new[] { Math.Round(target, 2) },
                Signals       = signalTags.ToArray(),
                HtfContext    = htfContext,
                VolumeDelta   = Math.Round(volDelta, 4),
                RsiValue      = Math.Round(_rsi.Current.Value, 2),
                Timestamp     = bar.EndTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"),
                SessionWindow = sessionWindow
            };

            Log(signal.ToJson());
        }

        // ── 15-Minute Bar Handler (HTF patterns) ──────────────────────
        private void OnFifteenMinBar(object sender, TradeBar bar)
        {
            _htfBars.Add(bar);
            if (_htfBars.Count > HtfPatternBars + 5)
                _htfBars.RemoveAt(0);

            _prevHtfBar = _htfBars.Count >= 2 ? _htfBars[_htfBars.Count - 2] : null;
        }

        // ── HTF Pattern Detection ─────────────────────────────────────
        private HtfPatternResult GetHtfPattern()
        {
            if (_htfBars.Count < 2 || _prevHtfBar == null) return null;

            var curr = _htfBars.Last();
            var prev = _prevHtfBar;

            decimal currBody  = Math.Abs(curr.Close - curr.Open);
            decimal currRange = curr.High - curr.Low;
            decimal prevBody  = Math.Abs(prev.Close - prev.Open);
            if (currRange == 0) return null;

            decimal currBodyTop    = Math.Max(curr.Close, curr.Open);
            decimal currBodyBottom = Math.Min(curr.Close, curr.Open);
            decimal prevBodyTop    = Math.Max(prev.Close, prev.Open);
            decimal prevBodyBottom = Math.Min(prev.Close, prev.Open);

            decimal lowerWickPct = (currBodyBottom - curr.Low) / currRange;
            decimal upperWickPct = (curr.High - currBodyTop) / currRange;
            bool smallBody = currBody < currRange * 0.35m;

            // Extremity check: is this bar at the highest high or lowest low of last N HTF bars?
            int lookback = Math.Min(HtfPatternBars, _htfBars.Count);
            var recentBars = _htfBars.Skip(_htfBars.Count - lookback).ToList();
            decimal highestHigh = recentBars.Max(b => b.High);
            decimal lowestLow   = recentBars.Min(b => b.Low);
            bool atHighExtremity = curr.High >= highestHigh;
            bool atLowExtremity  = curr.Low  <= lowestLow;

            // Bullish Engulfing
            if (prev.Close < prev.Open &&   // prev bearish
                curr.Close > curr.Open &&    // curr bullish
                currBodyBottom <= prevBodyBottom &&
                currBodyTop    >= prevBodyTop &&
                atLowExtremity)
            {
                return new HtfPatternResult
                {
                    PatternName = "bull_engulfing_at_extremity",
                    Direction   = SignalDirection.Long,
                    AtExtremity = true
                };
            }

            // Bearish Engulfing
            if (prev.Close > prev.Open &&   // prev bullish
                curr.Close < curr.Open &&    // curr bearish
                currBodyBottom <= prevBodyBottom &&
                currBodyTop    >= prevBodyTop &&
                atHighExtremity)
            {
                return new HtfPatternResult
                {
                    PatternName = "bear_engulfing_at_extremity",
                    Direction   = SignalDirection.Short,
                    AtExtremity = true
                };
            }

            // Hammer (bullish)
            if (smallBody && lowerWickPct > 0.65m && atLowExtremity)
            {
                return new HtfPatternResult
                {
                    PatternName = "hammer_at_extremity",
                    Direction   = SignalDirection.Long,
                    AtExtremity = true
                };
            }

            // Shooting Star (bearish)
            if (smallBody && upperWickPct > 0.65m && atHighExtremity)
            {
                return new HtfPatternResult
                {
                    PatternName = "shooting_star_at_extremity",
                    Direction   = SignalDirection.Short,
                    AtExtremity = true
                };
            }

            return null;
        }

        // ── ATR estimate from single bar ──────────────────────────────
        private decimal EstimateAtr(TradeBar bar)
        {
            // Simple approximation: use bar range, floor at 5 points for MNQ
            return Math.Max(bar.High - bar.Low, 5m);
        }
    }
}
