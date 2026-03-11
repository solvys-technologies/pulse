// [claude-code 2026-03-11] Economic Calendar — full TradingView iframe with built-in filters
import { TradingViewCalendar } from './TradingViewCalendar';

export function EconCalendar() {
  return (
    <div className="h-full flex flex-col bg-[var(--pulse-bg)]">
      <TradingViewCalendar height="100%" fullIframe />
    </div>
  );
}
