// [claude-code 2026-03-11] Compact TradingView calendar widget for Mission Control
import { TradingViewCalendar } from '../econ/TradingViewCalendar';

export function SessionCalendarMini() {
  return (
    <div className="h-full min-h-[180px]">
      <TradingViewCalendar height="100%" importanceFilter="0,1" countryFilter="us" />
    </div>
  );
}
