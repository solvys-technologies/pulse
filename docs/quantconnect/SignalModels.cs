// [claude-code 2026-03-11] Signal models and helpers for PlaybookSweepReclaim algorithm
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace QuantConnect.Algorithm.CSharp
{
    // ── Signal direction ──────────────────────────────────────────────
    public enum SignalDirection { Long, Short, None }

    // ── Session windows (EST) ─────────────────────────────────────────
    public static class SessionWindows
    {
        public static string GetActiveWindow(DateTime estTime)
        {
            var t = estTime.TimeOfDay;
            // Order matters: most specific first
            if (t >= ts(9, 30) && t < ts(10, 45))  return "forty_forty";
            if (t >= ts(8, 0) && t < ts(10, 45))   return "morning_flush";
            if (t >= ts(11, 30) && t < ts(12, 30)) return "lunch_flush";
            if (t >= ts(15, 0) && t < ts(16, 0))   return "power_hour";
            return null;
        }
        private static TimeSpan ts(int h, int m) => new TimeSpan(h, m, 0);
    }

    // ── Liquidity zone tracking ───────────────────────────────────────
    public class LiquidityZone
    {
        public decimal High;       // zone upper boundary
        public decimal Low;        // zone lower boundary
        public bool IsSwingHigh;   // true = resistance zone, false = support zone
        public bool Swept;
        public int SweepBar;       // bar index when swept
        public int ReclaimCount;   // consecutive bars closing inside after sweep
        public bool Fired;         // already emitted signal

        public bool Contains(decimal price) => price >= Low && price <= High;
    }

    // ── HTF candle pattern results ────────────────────────────────────
    public class HtfPatternResult
    {
        public string PatternName;          // e.g. "bull_engulfing_at_extremity"
        public SignalDirection Direction;
        public bool AtExtremity;
    }

    // ── Signal event (JSON payload) ───────────────────────────────────
    public class SignalEvent
    {
        [JsonProperty("source")]       public string Source = "quantconnect";
        [JsonProperty("strategy")]     public string Strategy;
        [JsonProperty("direction")]    public string Direction;
        [JsonProperty("instrument")]   public string Instrument = "MNQ";
        [JsonProperty("confidence")]   public int Confidence;
        [JsonProperty("entryPrice")]   public decimal EntryPrice;
        [JsonProperty("stopLoss")]     public decimal StopLoss;
        [JsonProperty("takeProfit")]   public decimal[] TakeProfit;
        [JsonProperty("signals")]      public string[] Signals;
        [JsonProperty("htfContext")]   public string HtfContext;
        [JsonProperty("volumeDelta")]  public decimal VolumeDelta;
        [JsonProperty("rsiValue")]     public decimal RsiValue;
        [JsonProperty("timestamp")]    public string Timestamp;
        [JsonProperty("sessionWindow")]public string SessionWindow;

        public string ToJson() => JsonConvert.SerializeObject(this,
            new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver(),
                Formatting = Formatting.Indented
            });
    }

    // ── Pivot detector (generic) ──────────────────────────────────────
    public class PivotDetector
    {
        private readonly int _leftBars;
        private readonly int _rightBars;
        private readonly List<decimal> _highs = new List<decimal>();
        private readonly List<decimal> _lows  = new List<decimal>();

        public decimal LastPivotHigh { get; private set; }
        public decimal LastPivotLow  { get; private set; }
        public int LastPivotHighIdx  { get; private set; }
        public int LastPivotLowIdx   { get; private set; }
        public decimal PrevPivotHigh { get; private set; }
        public decimal PrevPivotLow  { get; private set; }
        public int PrevPivotHighIdx  { get; private set; }
        public int PrevPivotLowIdx   { get; private set; }
        private int _barCount;

        public PivotDetector(int leftBars, int rightBars)
        {
            _leftBars  = leftBars;
            _rightBars = rightBars;
        }

        /// <summary>
        /// Call every bar. Returns true when a new pivot is confirmed.
        /// pivotType: 1 = high pivot confirmed, -1 = low pivot confirmed, 0 = none.
        /// </summary>
        public int Update(decimal high, decimal low)
        {
            _highs.Add(high);
            _lows.Add(low);
            _barCount++;

            int window = _leftBars + 1 + _rightBars;
            if (_barCount < window) return 0;

            int candidateIdx = _highs.Count - 1 - _rightBars;
            int result = 0;

            // Check pivot high
            decimal candidateHigh = _highs[candidateIdx];
            bool isPivotHigh = true;
            for (int i = candidateIdx - _leftBars; i <= candidateIdx + _rightBars; i++)
            {
                if (i == candidateIdx) continue;
                if (_highs[i] >= candidateHigh) { isPivotHigh = false; break; }
            }
            if (isPivotHigh)
            {
                PrevPivotHigh = LastPivotHigh;
                PrevPivotHighIdx = LastPivotHighIdx;
                LastPivotHigh = candidateHigh;
                LastPivotHighIdx = candidateIdx;
                result = 1;
            }

            // Check pivot low
            decimal candidateLow = _lows[candidateIdx];
            bool isPivotLow = true;
            for (int i = candidateIdx - _leftBars; i <= candidateIdx + _rightBars; i++)
            {
                if (i == candidateIdx) continue;
                if (_lows[i] <= candidateLow) { isPivotLow = false; break; }
            }
            if (isPivotLow)
            {
                PrevPivotLow = LastPivotLow;
                PrevPivotLowIdx = LastPivotLowIdx;
                LastPivotLow = candidateLow;
                LastPivotLowIdx = candidateIdx;
                result = result == 1 ? 1 : -1; // high takes priority if both
            }

            // Trim to keep memory bounded (keep last 500 bars)
            if (_highs.Count > 500)
            {
                int trim = _highs.Count - 500;
                _highs.RemoveRange(0, trim);
                _lows.RemoveRange(0, trim);
                LastPivotHighIdx = Math.Max(0, LastPivotHighIdx - trim);
                LastPivotLowIdx  = Math.Max(0, LastPivotLowIdx - trim);
                PrevPivotHighIdx = Math.Max(0, PrevPivotHighIdx - trim);
                PrevPivotLowIdx  = Math.Max(0, PrevPivotLowIdx - trim);
            }

            return result;
        }
    }
}
