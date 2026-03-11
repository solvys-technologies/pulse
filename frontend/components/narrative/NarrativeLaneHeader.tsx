// [claude-code 2026-03-06] NarrativeFlow NarrativeLaneHeader — lane row header with direction/status/instruments
import { useCallback } from 'react';
import type { NarrativeLane } from '../../lib/narrative-types';

const DIRECTION_ICONS: Record<string, { symbol: string; color: string }> = {
  long: { symbol: '\u2191', color: 'var(--pulse-bullish)' },
  short: { symbol: '\u2193', color: 'var(--pulse-bearish)' },
  neutral: { symbol: '\u2014', color: 'var(--pulse-muted)' },
};

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  active: { dot: '#34D399', label: 'Active' },
  watching: { dot: '#FBBF24', label: 'Watching' },
  archived: { dot: '#6B7280', label: 'Archived' },
  decayed: { dot: '#4B5563', label: 'Decayed' },
};

interface NarrativeLaneHeaderProps {
  lane: NarrativeLane;
  selected?: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

export default function NarrativeLaneHeader({
  lane,
  selected = false,
  onSelect,
  onContextMenu,
}: NarrativeLaneHeaderProps) {
  const dir = DIRECTION_ICONS[lane.directionBias] || DIRECTION_ICONS.neutral;
  const status = STATUS_CONFIG[lane.status] || STATUS_CONFIG.active;

  const handleClick = useCallback(() => onSelect(lane.id), [onSelect, lane.id]);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e, lane.id);
  }, [onContextMenu, lane.id]);

  return (
    <div
      className="flex-shrink-0 flex flex-col justify-center gap-1.5 px-3 py-2 cursor-pointer transition-colors duration-150"
      style={{
        width: '180px',
        borderRight: `1px solid color-mix(in srgb, var(--pulse-border) 20%, transparent)`,
        backgroundColor: selected
          ? 'color-mix(in srgb, var(--pulse-accent) 8%, transparent)'
          : 'transparent',
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Title + direction arrow */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: dir.color, fontSize: '14px', fontWeight: 700 }}>
          {dir.symbol}
        </span>
        <span
          className="font-semibold truncate flex-1"
          style={{ fontSize: '12px', color: 'var(--pulse-text)' }}
        >
          {lane.title}
        </span>
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-1.5">
        <span
          className="rounded-full"
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: status.dot,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '9px', color: 'var(--pulse-muted)' }}>
          {status.label}
        </span>
      </div>

      {/* Instruments chips */}
      {lane.instruments.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {lane.instruments.map((inst) => (
            <span
              key={inst}
              className="rounded px-1 py-0.5 font-mono"
              style={{
                fontSize: '8px',
                color: 'var(--pulse-accent)',
                backgroundColor: 'color-mix(in srgb, var(--pulse-accent) 10%, transparent)',
              }}
            >
              {inst}
            </span>
          ))}
        </div>
      )}

      {/* Health gauge placeholder for Track 4 */}
      <div data-health-gauge />
    </div>
  );
}
