// [claude-code 2026-03-11] Replaced custom calendar with TradingView embed for ExecutiveDashboard
import { TradingViewCalendar } from '../econ/TradingViewCalendar';
import type { ExecutiveScheduleItem } from './mockExecutiveData';

/** TradingView calendar embed — props kept for backward compat but items are not used */
export function SessionCalendarList({ items: _items }: { items: ExecutiveScheduleItem[] }) {
  return (
    <div className="min-h-[220px]">
      <TradingViewCalendar height={220} importanceFilter="0,1" countryFilter="us" />
    </div>
  );
}
