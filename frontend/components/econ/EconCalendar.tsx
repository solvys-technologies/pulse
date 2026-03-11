// [claude-code 2026-03-11] Economic Calendar — TradingView embedded widget
// Replaced custom Notion-based calendar with TradingView's live economic calendar.
import { TradingViewCalendar } from './TradingViewCalendar';

export function EconCalendar() {
  return (
    <div className="h-full flex flex-col bg-[var(--pulse-bg)]">
      <TradingViewCalendar height="100%" importanceFilter="-1,0,1" countryFilter="us" />
    </div>
  );
}
