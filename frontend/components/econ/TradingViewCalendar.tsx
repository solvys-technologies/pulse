// [claude-code 2026-03-11] TradingView Economic Calendar embed widget
import { useEffect, useRef } from 'react';

interface TradingViewCalendarProps {
  /** Widget height — defaults to '100%' */
  height?: string | number;
  /** Importance filter: '-1,0,1' = all, '0,1' = medium+, '1' = high only */
  importanceFilter?: string;
  /** Country filter — defaults to US only */
  countryFilter?: string;
}

export function TradingViewCalendar({
  height = '100%',
  importanceFilter = '-1,0,1',
  countryFilter = 'us',
}: TradingViewCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove any existing children safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = typeof height === 'number' ? `${height}px` : height;
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    // TradingView widget config must be set as text content of the script tag
    script.textContent = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter,
      countryFilter,
    });

    container.appendChild(script);

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [height, importanceFilter, countryFilter]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}
