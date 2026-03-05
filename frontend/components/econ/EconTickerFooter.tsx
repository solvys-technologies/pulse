// [claude-code 2026-03-05] Scrolling AI analysis ticker at bottom of Econ Calendar.
import { useMemo } from 'react';
import { useEconCalendar } from '../../contexts/EconCalendarContext';
import type { EconEventItem } from '../../lib/services';

function generateInsight(event: EconEventItem): string | null {
  if (!event.actual || !event.forecast) return null;

  const actual = parseFloat(event.actual);
  const forecast = parseFloat(event.forecast);
  if (isNaN(actual) || isNaN(forecast)) return null;

  const deviation = forecast !== 0 ? ((actual - forecast) / Math.abs(forecast)) * 100 : 0;
  const absDeviation = Math.abs(deviation);
  const direction = actual > forecast ? 'above' : actual < forecast ? 'below' : 'inline with';

  if (absDeviation < 1) {
    return `${event.name}: In line with expectations (${event.actual} vs ${event.forecast} fcst)`;
  }

  const magnitude = absDeviation > 10 ? 'significantly' : absDeviation > 5 ? 'notably' : 'slightly';

  return `${event.name}: ${event.actual} came in ${magnitude} ${direction} ${event.forecast} forecast (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}% deviation)`;
}

function generateUpcomingAlert(event: EconEventItem): string {
  const impLabel = event.importance === 3 ? 'HIGH IMPACT' : event.importance === 2 ? 'MED IMPACT' : 'LOW';
  const time = event.time ? ` at ${event.time}` : '';
  return `Upcoming: ${event.name}${time} [${impLabel}] — Fcst: ${event.forecast ?? 'N/A'}, Prev: ${event.previous ?? 'N/A'}`;
}

export function EconTickerFooter() {
  const { events } = useEconCalendar();

  const tickerItems = useMemo(() => {
    const items: string[] = [];

    // First: events with actuals (most recent first) — AI analysis
    const withActuals = events.filter((e) => e.actual).slice(0, 5);
    for (const event of withActuals) {
      const insight = generateInsight(event);
      if (insight) items.push(insight);
    }

    // Then: upcoming high-importance events without actuals
    const upcoming = events
      .filter((e) => !e.actual && e.importance >= 2)
      .slice(0, 5);
    for (const event of upcoming) {
      items.push(generateUpcomingAlert(event));
    }

    return items.length > 0 ? items : ['Economic calendar loading — awaiting data from Notion...'];
  }, [events]);

  const tickerText = tickerItems.join('  \u2022  ');

  return (
    <div className="flex-shrink-0 h-7 border-t border-[#D4AF37]/15 bg-[#080800] overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#080800] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#080800] to-transparent z-10" />
      <div className="h-full flex items-center">
        <div className="animate-ticker whitespace-nowrap text-[10px] font-mono">
          <span className="text-[#D4AF37]/70">{tickerText}</span>
          <span className="text-[#D4AF37]/70 ml-16">{tickerText}</span>
        </div>
      </div>
    </div>
  );
}
