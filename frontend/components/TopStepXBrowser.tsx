import { ExternalLink, SplitSquareVertical, X } from 'lucide-react';
import { EmbeddedBrowserFrame } from './layout/EmbeddedBrowserFrame';

export type TradingPlatform = 'topstepx' | 'tradelocker' | 'kalshi' | 'research';

const PLATFORM_LABELS: Record<TradingPlatform, string> = {
  topstepx: 'TopStepX',
  tradelocker: 'TradeLocker',
  kalshi: 'Kalshi',
  research: 'Research',
};

const PLATFORM_URLS: Record<TradingPlatform, string> = {
  topstepx: 'https://www.topstepx.com',
  tradelocker: 'https://platform.tradelocker.com',
  kalshi: 'https://kalshi.com/markets',
  research: import.meta.env.VITE_NOTION_RESEARCH_URL || 'https://www.notion.so',
};

interface TopStepXBrowserProps {
  onClose: () => void;
  primaryPlatform: TradingPlatform;
  onPrimaryPlatformChange: (platform: TradingPlatform) => void;
  secondaryPlatform: TradingPlatform;
  onSecondaryPlatformChange: (platform: TradingPlatform) => void;
  splitViewEnabled: boolean;
  onSplitViewEnabledChange: (enabled: boolean) => void;
  allowSplitView: boolean;
}

export function TopStepXBrowser({
  onClose,
  primaryPlatform,
  onPrimaryPlatformChange,
  secondaryPlatform,
  onSecondaryPlatformChange,
  splitViewEnabled,
  onSplitViewEnabledChange,
  allowSplitView,
}: TopStepXBrowserProps) {
  const primaryUrl = PLATFORM_URLS[primaryPlatform];
  const secondaryUrl = PLATFORM_URLS[secondaryPlatform];

  const openExternal = (platform: TradingPlatform) => {
    window.open(PLATFORM_URLS[platform], '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a00] border border-[#D4AF37]/20 rounded-lg overflow-hidden">
      <div className="h-12 bg-[#0a0a00] border-b border-[#D4AF37]/20 flex items-center gap-2 px-3 flex-shrink-0">
        <select
          value={primaryPlatform}
          onChange={(e) => onPrimaryPlatformChange(e.target.value as TradingPlatform)}
          className="px-2.5 py-1.5 bg-[#050500] border border-[#D4AF37]/20 rounded text-xs text-[#D4AF37] focus:outline-none"
        >
          {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {allowSplitView && (
          <>
            <button
              onClick={() => onSplitViewEnabledChange(!splitViewEnabled)}
              className={`px-2.5 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${
                splitViewEnabled
                  ? 'border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-zinc-700 text-gray-400 hover:border-[#D4AF37]/30 hover:text-[#D4AF37]'
              }`}
              title="Toggle split view"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Split
            </button>

            {splitViewEnabled && (
              <select
                value={secondaryPlatform}
                onChange={(e) => onSecondaryPlatformChange(e.target.value as TradingPlatform)}
                className="px-2.5 py-1.5 bg-[#050500] border border-[#D4AF37]/20 rounded text-xs text-[#D4AF37] focus:outline-none"
              >
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => openExternal(primaryPlatform)}
            className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors text-gray-300"
            title={`Open ${PLATFORM_LABELS[primaryPlatform]} in browser`}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
            title="Close browser"
          >
            <X className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${splitViewEnabled && allowSplitView ? 'grid grid-cols-2 gap-0.5 bg-[#D4AF37]/20' : ''}`}>
        <EmbeddedBrowserFrame
          title={PLATFORM_LABELS[primaryPlatform]}
          src={primaryUrl}
          className="w-full h-full bg-white"
        />
        {splitViewEnabled && allowSplitView && (
          <EmbeddedBrowserFrame
            title={PLATFORM_LABELS[secondaryPlatform]}
            src={secondaryUrl}
            className="w-full h-full bg-white"
          />
        )}
      </div>
    </div>
  );
}
