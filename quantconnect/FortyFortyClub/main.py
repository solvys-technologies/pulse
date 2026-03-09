# [claude-code 2026-03-05] FortyFortyClub v2 — Antilag + RSI entry (no fib sweep)
# Backtest: 2026-02-01 to 2026-03-05 | Instrument: /MNQ | Resolution: Tick
# Confirmation: /ES (SP_500_E_MINI) — monitor only, no execution

from AlgorithmImports import *
from datetime import timedelta


class FortyFortyClub(QCAlgorithm):

    def initialize(self):
        self.set_start_date(2026, 2, 1)
        self.set_end_date(2026, 3, 5)
        self.set_cash(50000)
        self.set_brokerage_model(BrokerageName.QUANT_CONNECT_BROKERAGE)

        # Primary instrument: /MNQ
        self.mnq = self.add_future(
            Futures.Indices.MICRO_NASDAQ_100_E_MINI,
            Resolution.TICK,
            fill_forward=True,
        )
        self.mnq.set_filter(0, 90)
        self._mnq_contract = None

        # Confirmation instrument: /ES (no execution)
        self.es = self.add_future(
            Futures.Indices.SP_500_E_MINI,
            Resolution.TICK,
            fill_forward=True,
        )
        self.es.set_filter(0, 90)
        self._es_contract = None

        # 15-min context indicators (registered once we have a contract)
        self._ema20_15m = None
        self._ema100_15m = None
        self._rsi_15m = None
        self._indicators_ready = False

        # Tick consolidators
        self._nq_consolidator = None
        self._es_consolidator = None

        # Rolling windows for ATR
        self._nq_bars = RollingWindow[TradeBar](25)
        self._es_bars = RollingWindow[TradeBar](5)

        # Tick velocity state
        self._nq_bar_duration = None
        self._prev_nq_bar_duration = None
        self._es_bar_duration = None
        self._prev_es_bar_duration = None
        self._last_nq_bar_time = None
        self._last_es_bar_time = None
        self._last_nq_bar = None
        self._last_es_bar = None

        # Position state
        self._position_size = 0
        self._direction = None
        self._entry_price = None
        self._stop_price = None
        self._trailing_phase = 0
        self._scale_in_count = 0
        self._contested_price = None

        # Daily state
        self._re_entry_count = 0
        self._daily_pnl = 0.0

        # Config
        self._trading_mode = "combine"
        self._pdpt_combine = 1550.0
        self._max_contracts = 25
        self._initial_size = 10
        self._scale_in_size = 5
        self._max_re_entries = 3

        # Schedule daily reset
        self.schedule.on(
            self.date_rules.every_day(),
            self.time_rules.at(0, 0),
            self._daily_reset,
        )

        self.set_warm_up(timedelta(days=5))

    # ── CONTRACT MANAGEMENT ──

    def on_data(self, data):
        if self._mnq_contract is None:
            for chain in data.FutureChains:
                if chain.Key.Value.startswith("MNQ"):
                    contracts = sorted(chain.Value, key=lambda c: c.Expiry)
                    if contracts:
                        self._mnq_contract = contracts[0].Symbol
                        self._setup_nq_consolidator()
                        self._setup_indicators()

        if self._es_contract is None:
            for chain in data.FutureChains:
                if chain.Key.Value.startswith("ES"):
                    contracts = sorted(chain.Value, key=lambda c: c.Expiry)
                    if contracts:
                        self._es_contract = contracts[0].Symbol
                        self._setup_es_consolidator()

        if self.is_warming_up:
            return

        if self._position_size != 0:
            self._check_tp1()
            self._check_pdpt()
            self._manage_trailing_stop()
            self._check_scale_in()

    def _setup_nq_consolidator(self):
        if self._nq_consolidator is not None:
            return
        self._nq_consolidator = TickConsolidator(1000)
        self._nq_consolidator.data_consolidated += self._on_nq_bar
        self.subscription_manager.add_consolidator(self._mnq_contract, self._nq_consolidator)

    def _setup_es_consolidator(self):
        if self._es_consolidator is not None:
            return
        self._es_consolidator = TickConsolidator(500)
        self._es_consolidator.data_consolidated += self._on_es_bar
        self.subscription_manager.add_consolidator(self._es_contract, self._es_consolidator)

    def _setup_indicators(self):
        if self._indicators_ready:
            return
        self._ema20_15m = self.ema(self._mnq_contract, 20, Resolution.MINUTE)
        self._ema100_15m = self.ema(self._mnq_contract, 100, Resolution.MINUTE)
        self._rsi_15m = self.rsi(self._mnq_contract, 20, MovingAverageType.WILDERS, Resolution.MINUTE)
        self._indicators_ready = True

    # ── TICK CONSOLIDATOR HANDLERS ──

    def _on_nq_bar(self, sender, bar):
        self._nq_bars.add(bar)
        self._last_nq_bar = bar

        self._prev_nq_bar_duration = self._nq_bar_duration
        if self._last_nq_bar_time is not None:
            self._nq_bar_duration = (bar.EndTime - self._last_nq_bar_time).total_seconds()
        self._last_nq_bar_time = bar.EndTime

        if not self.is_warming_up:
            self._check_entry_conditions()

    def _on_es_bar(self, sender, bar):
        self._es_bars.add(bar)
        self._last_es_bar = bar

        self._prev_es_bar_duration = self._es_bar_duration
        if self._last_es_bar_time is not None:
            self._es_bar_duration = (bar.EndTime - self._last_es_bar_time).total_seconds()
        self._last_es_bar_time = bar.EndTime

    # ── ANTILAG SIGNAL ──

    def _antilag_fires(self) -> bool:
        """Tick velocity spike at EMA extreme, both NQ and ES aligned."""
        if not all([
            self._nq_bar_duration, self._prev_nq_bar_duration,
            self._es_bar_duration, self._prev_es_bar_duration,
            self._last_nq_bar, self._last_es_bar,
        ]):
            return False

        nq_fast = self._nq_bar_duration <= self._prev_nq_bar_duration * 0.5
        es_fast = self._es_bar_duration <= self._prev_es_bar_duration * 0.5

        nq_valid = 2.0 <= self._nq_bar_duration <= 30.0
        es_valid = 2.0 <= self._es_bar_duration <= 30.0

        nq_bull = self._last_nq_bar.Close > self._last_nq_bar.Open
        es_bull = self._last_es_bar.Close > self._last_es_bar.Open
        aligned = nq_bull == es_bull

        if not self._indicators_ready or not self._ema20_15m.is_ready:
            return False

        price = self._last_nq_bar.Close
        atr = self._compute_3bar_atr()
        if atr <= 0:
            return False

        ema20 = self._ema20_15m.current.value
        ema100 = self._ema100_15m.current.value
        near_ema20 = abs(price - ema20) <= atr * 0.3
        near_ema100 = abs(price - ema100) <= atr * 0.3
        at_extreme = near_ema20 or near_ema100

        return nq_fast and es_fast and nq_valid and es_valid and aligned and at_extreme

    def _get_antilag_direction(self) -> str:
        """Direction from the Antilag candle."""
        if self._last_nq_bar.Close > self._last_nq_bar.Open:
            return "long"
        return "short"

    # ── ATR ──

    def _compute_3bar_atr(self) -> float:
        if not self._nq_bars.is_ready or self._nq_bars.count < 3:
            return 0.0
        total_range = 0.0
        for i in range(3):
            bar = self._nq_bars[i]
            total_range += bar.High - bar.Low
        return total_range / 3.0

    def _compute_20bar_atr(self) -> float:
        count = min(20, self._nq_bars.count)
        if count < 3:
            return 0.0
        total_range = 0.0
        for i in range(count):
            bar = self._nq_bars[i]
            total_range += bar.High - bar.Low
        return total_range / count

    # ── ENTRY ──

    def _check_entry_conditions(self):
        """Antilag + RSI outside neutral zone = entry."""
        if self._mnq_contract is None:
            return
        if not self._indicators_ready or not self._rsi_15m.is_ready:
            return
        if self._trading_mode == "combine" and self._daily_pnl >= self._pdpt_combine:
            return
        if self._re_entry_count >= self._max_re_entries:
            return
        if self._position_size != 0:
            return

        rsi_val = self._rsi_15m.current.value
        if 45.0 <= rsi_val <= 55.0:
            return

        if not self._antilag_fires():
            return

        direction = self._get_antilag_direction()
        self._enter_trade(direction)

    def _enter_trade(self, direction: str):
        size = self._initial_size
        sign = 1 if direction == "long" else -1

        self.market_order(self._mnq_contract, size * sign)
        self._position_size = size
        self._direction = direction
        self._entry_price = self.securities[self._mnq_contract].price
        self._scale_in_count = 0
        self._trailing_phase = 1

        # Stop: 1.5x ATR from entry
        atr = self._compute_3bar_atr()
        stop_dist = max(atr * 1.5, 4.0)  # minimum 4 pts
        if direction == "long":
            self._stop_price = self._entry_price - stop_dist
        else:
            self._stop_price = self._entry_price + stop_dist

        self._re_entry_count += 1

        self.debug(f"ENTRY {direction.upper()} {size} MNQ @ {self._entry_price:.2f} "
                   f"| stop={self._stop_price:.2f} | atr={atr:.2f} "
                   f"| re-entry #{self._re_entry_count}")

    # ── SCALE-IN ──

    def _check_scale_in(self):
        if self._position_size == 0 or self._mnq_contract is None:
            return
        if not self._ema100_15m.is_ready:
            return

        max_now = self._get_max_contracts()
        if self._position_size >= max_now:
            return

        atr = self._compute_3bar_atr()
        if atr <= 0:
            return

        ema100 = self._ema100_15m.current.value
        price = self.securities[self._mnq_contract].price
        if abs(price - ema100) < atr * 0.55:
            return

        if not self._overtaking_candle_confirmed():
            return

        add = min(self._scale_in_size, max_now - self._position_size)
        if add <= 0:
            return

        sign = 1 if self._direction == "long" else -1
        self.market_order(self._mnq_contract, add * sign)
        self._position_size += add
        self._scale_in_count += 1

        if self._last_nq_bar:
            self._contested_price = self._last_nq_bar.Close

        self.debug(f"SCALE-IN +{add} MNQ (total={self._position_size}) @ {price:.2f}")

    def _overtaking_candle_confirmed(self) -> bool:
        if not self._nq_bars.is_ready or self._nq_bars.count < 2:
            return False
        if not self._ema20_15m.is_ready:
            return False

        current = self._nq_bars[0]
        prev = self._nq_bars[1]
        ema20 = self._ema20_15m.current.value

        if self._direction == "long":
            return (current.Close > ema20 and
                    prev.Close <= ema20 and
                    current.Close > prev.High and
                    current.Close > current.Open)
        else:
            return (current.Close < ema20 and
                    prev.Close >= ema20 and
                    current.Close < prev.Low and
                    current.Close < current.Open)

    # ── TRAILING STOP — 4 PHASES ──

    def _manage_trailing_stop(self):
        if self._position_size == 0 or self._mnq_contract is None:
            return

        price = self.securities[self._mnq_contract].price

        if self._direction == "long" and price <= self._stop_price:
            self._exit_position("STOP HIT")
            return
        if self._direction == "short" and price >= self._stop_price:
            self._exit_position("STOP HIT")
            return

        # Phase 2: Breakeven after scale-in
        if self._trailing_phase == 1 and self._scale_in_count > 0:
            if self._check_breakeven_trigger(price):
                self._stop_price = self._entry_price
                self._trailing_phase = 2
                self.debug(f"STOP -> BREAKEVEN @ {self._stop_price:.2f}")

        # Phase 3: Trail below 20 EMA at cycle levels
        if self._trailing_phase == 2 and self._ema20_15m.is_ready:
            new_stop = self._compute_cycle_stop(price)
            if new_stop is not None:
                if self._direction == "long" and new_stop > self._stop_price:
                    self._stop_price = new_stop
                    self._trailing_phase = 3
                    self.debug(f"STOP -> CYCLE LEVEL @ {self._stop_price:.2f}")
                elif self._direction == "short" and new_stop < self._stop_price:
                    self._stop_price = new_stop
                    self._trailing_phase = 3
                    self.debug(f"STOP -> CYCLE LEVEL @ {self._stop_price:.2f}")

        if self._trailing_phase == 3 and self._ema20_15m.is_ready:
            new_stop = self._compute_cycle_stop(price)
            if new_stop is not None:
                if self._direction == "long" and new_stop > self._stop_price:
                    self._stop_price = new_stop
                elif self._direction == "short" and new_stop < self._stop_price:
                    self._stop_price = new_stop

        # Phase 4: 100 EMA trail when ATR > 17
        if self._trailing_phase >= 3 and self._ema100_15m.is_ready:
            atr = self._compute_3bar_atr()
            if atr > 17.0:
                ema100 = self._ema100_15m.current.value
                if self._direction == "long":
                    new_stop = ema100 - 2.0
                    if new_stop > self._stop_price:
                        self._stop_price = new_stop
                        self._trailing_phase = 4
                else:
                    new_stop = ema100 + 2.0
                    if new_stop < self._stop_price:
                        self._stop_price = new_stop
                        self._trailing_phase = 4

    def _check_breakeven_trigger(self, price: float) -> bool:
        if self._contested_price is None or not self._ema20_15m.is_ready:
            return False
        ema20 = self._ema20_15m.current.value
        if self._direction == "long":
            return price > self._contested_price and abs(price - ema20) < abs(price - self._entry_price) * 0.5
        else:
            return price < self._contested_price and abs(price - ema20) < abs(price - self._entry_price) * 0.5

    def _compute_cycle_stop(self, price: float):
        if not self._ema20_15m.is_ready:
            return None
        ema20 = self._ema20_15m.current.value
        atr_20 = self._compute_20bar_atr()
        increment = 25.0 if atr_20 <= 15.0 else 50.0

        if self._direction == "long":
            raw_stop = ema20 - 6.0
            snapped = (raw_stop // increment) * increment
            if snapped > self._stop_price:
                return snapped
        else:
            raw_stop = ema20 + 6.0
            snapped = ((raw_stop // increment) + 1) * increment
            if snapped < self._stop_price:
                return snapped
        return None

    # ── EXIT ──

    def _check_tp1(self):
        if self._position_size == 0 or self._mnq_contract is None:
            return
        if not self._ema100_15m.is_ready:
            return
        price = self.securities[self._mnq_contract].price
        ema100 = self._ema100_15m.current.value

        if self._direction == "long" and price >= ema100:
            self._exit_position("TP1 -- 100 EMA")
        elif self._direction == "short" and price <= ema100:
            self._exit_position("TP1 -- 100 EMA")

    def _check_pdpt(self):
        if self._trading_mode == "combine":
            if self._daily_pnl >= self._pdpt_combine:
                self._exit_position("PDPT HIT -- LOCKOUT")

    def _exit_position(self, reason: str):
        if self._position_size == 0 or self._mnq_contract is None:
            return

        price = self.securities[self._mnq_contract].price
        self.liquidate(self._mnq_contract)

        pnl_per_contract = 0.0
        if self._entry_price and self._direction:
            sign = 1.0 if self._direction == "long" else -1.0
            pnl_per_contract = (price - self._entry_price) * sign * 2.0

        trade_pnl = pnl_per_contract * self._position_size
        self._daily_pnl += trade_pnl

        self.debug(f"EXIT {reason} | {self._direction} {self._position_size} MNQ "
                   f"| entry={self._entry_price:.2f} exit={price:.2f} "
                   f"| trade_pnl=${trade_pnl:.0f} daily_pnl=${self._daily_pnl:.0f}")

        self._position_size = 0
        self._direction = None
        self._entry_price = None
        self._stop_price = None
        self._trailing_phase = 0
        self._scale_in_count = 0
        self._contested_price = None

    # ── HELPERS ──

    def _get_max_contracts(self) -> int:
        if self.time.hour > 12 or (self.time.hour == 12 and self.time.minute >= 30):
            return 20
        return self._max_contracts

    def _daily_reset(self):
        self._daily_pnl = 0.0
        self._re_entry_count = 0
        self.debug("-- DAILY RESET --")

    def on_end_of_algorithm(self):
        self.debug(f"FINAL | Daily PnL: ${self._daily_pnl:.0f}")
