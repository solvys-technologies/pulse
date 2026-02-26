import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { UpgradeModal } from '../UpgradeModal';
import { IVScoreCard } from '../IVScoreCard';
import { useBackend } from '../../lib/backend';
import { isElectron } from '../../lib/platform';
import { LayoutGrid, GripVertical, Layers, ChevronDown, ChevronLeft, ChevronRight, Monitor, MessageCircle } from 'lucide-react';
import type { TradingPlatform } from '../TopStepXBrowser';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'settings';

const TAB_LABELS: Record<NavTab, string> = {
  executive: 'Dashboard',
  feed: 'The Tape',
  analysis: 'Analysis',
  news: 'RiskFlow',
  chatroom: 'Board Room',
  notion: 'Research Department',
  settings: 'Settings',
};

type LayoutOption = 'movable' | 'tickers-only' | 'combined';

function PulseLogo() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <img 
        src="/pulse-logo.png" 
        alt="Pulse Logo" 
        className="w-10 h-10 object-contain"
      />
    </div>
  );
}

interface TopHeaderProps {
  topStepXEnabled?: boolean;
  onTopStepXToggle?: () => void;
  selectedPlatform?: TradingPlatform;
  onPlatformSelect?: (platform: TradingPlatform) => void;
  layoutOption?: LayoutOption;
  onLayoutOptionChange?: (option: LayoutOption) => void;
  askHarpOpen?: boolean;
  onAskHarpToggle?: () => void;
  activeTab?: NavTab;
  tabHistory?: NavTab[];
  historyIndex?: number;
  onBack?: () => void;
  onForward?: () => void;
}

export function TopHeader({
  topStepXEnabled = false,
  onTopStepXToggle,
  selectedPlatform = 'topstepx',
  onPlatformSelect,
  layoutOption = 'movable',
  onLayoutOptionChange,
  askHarpOpen = false,
  onAskHarpToggle,
  activeTab = 'feed',
  tabHistory = [],
  historyIndex = 0,
  onBack,
  onForward,
}: TopHeaderProps) {
  const { tier } = useAuth();
  const backend = useBackend();
  const instanceName = import.meta.env.VITE_PULSE_INSTANCE_NAME || 'Pulse';
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [ivScore, setIvScore] = useState(3.2);
  const [vix, setVix] = useState(20);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLayoutDropdown(false);
      }
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
    };

    if (showLayoutDropdown || showPlatformDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLayoutDropdown, showPlatformDropdown]);

  const platformOptions: Array<{ value: TradingPlatform; label: string; description: string }> = [
    { value: 'topstepx', label: 'TopStepX', description: 'Real-Time Futures Trading Platform' },
    { value: 'tradelocker', label: 'TradeLocker', description: 'Real-Time CFDs Trading Platform' },
    { value: 'kalshi', label: 'Kalshi', description: 'Prediction Market' },
    { value: 'research', label: 'Research', description: 'Notion Research iFrame' },
  ];

  const selectedPlatformLabel =
    platformOptions.find((opt) => opt.value === selectedPlatform)?.label ?? 'TopStepX';

  const layoutOptions: Array<{ value: LayoutOption; label: string; description: string; icon: React.ReactNode }> = [
    {
      value: 'movable',
      label: 'Movable Panels',
      description: 'Mission Control and Tape can be moved independently',
      icon: <LayoutGrid className="w-4 h-4" />
    },
    {
      value: 'tickers-only',
      label: 'Zen Mode',
      description: 'Supports split-frame browser view',
      icon: <GripVertical className="w-4 h-4" />
    },
    {
      value: 'combined',
      label: 'Combined Panels',
      description: 'Both panels stacked on the right in one collapsible panel',
      icon: <Layers className="w-4 h-4" />
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIvScore(prev => Math.max(0, Math.min(10, prev + (Math.random() - 0.5) * 0.5)));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch VIX value - update every 5 minutes
  useEffect(() => {
    const fetchVIX = async () => {
      try {
        const data = await backend.riskflow.fetchVIX();
        if (data && typeof data.value === 'number') {
          console.log(`[VIX] Successfully fetched: ${data.value}`);
          setVix(data.value);
        } else {
          console.error('[VIX] Invalid response format:', data);
        }
      } catch (error) {
        console.error('[VIX] Failed to fetch VIX:', error);
        // Keep current value on error
      }
    };

    fetchVIX();
    const interval = setInterval(fetchVIX, 300000); // Update every 5 minutes (300000ms)
    return () => clearInterval(interval);
  }, [backend]);

  const getTierDisplayName = () => {
    switch (tier) {
      case 'free': return 'Free';
      case 'pulse': return 'Pulse';
      case 'pulse_plus': return 'Pulse+';
      case 'pulse_pro': return 'Pulse Pro';
      default: return 'Free';
    }
  };

  return (
    <div className={`bg-[#0a0a00] border-b border-[#D4AF37]/20 flex items-center justify-between pr-6 ${topStepXEnabled && layoutOption === 'tickers-only' ? 'h-[65px]' : 'h-[70px]'}`}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Logo centered at 32px to align with sidebar icons (w-16 = 64px, center = 32px) */}
          <div className="w-16 flex items-center justify-center">
            <PulseLogo />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold tracking-[0.22em] text-[#D4AF37] uppercase">
              {instanceName}
            </span>
            <span className="text-[10px] tracking-[0.18em] text-gray-500 uppercase">
              Command Center
            </span>
          </div>

          {/* Breadcrumb navigation — back/forward + section name */}
          {!topStepXEnabled && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={onBack}
                disabled={historyIndex <= 0}
                className="p-1 rounded text-gray-500 hover:text-[#D4AF37] disabled:text-gray-700 disabled:cursor-default transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onForward}
                disabled={historyIndex >= tabHistory.length - 1}
                className="p-1 rounded text-gray-500 hover:text-[#D4AF37] disabled:text-gray-700 disabled:cursor-default transition-colors"
                title="Forward"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] tracking-[0.18em] uppercase text-gray-300 ml-2">
                {TAB_LABELS[activeTab] || activeTab}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowUpgrade(true)}
            className="relative bg-[#050500] border border-[#D4AF37]/20 rounded-lg px-3 h-8 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-colors cursor-pointer flex items-center"
          >
            <span className="text-[13px] text-gray-300">{getTierDisplayName()}</span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#050500] border border-zinc-800 rounded-lg px-2.5 h-8 flex items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-500">VIX</span>
              <span className="text-xs font-mono text-gray-300">
                {vix.toFixed(2)}
              </span>
            </div>
          </div>
          {onTopStepXToggle && (
            <div className="relative" ref={platformDropdownRef}>
              <button
                onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  topStepXEnabled
                    ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'
                    : 'bg-[#050500] border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40'
                }`}
                title="Select trading platform"
              >
                {!isElectron() && <Monitor className="w-3 h-3" />}
                <span>{selectedPlatformLabel}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showPlatformDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showPlatformDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0a0a00] border border-[#D4AF37]/20 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                  {platformOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onPlatformSelect?.(option.value);
                        onTopStepXToggle();
                        setShowPlatformDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        selectedPlatform === option.value
                          ? 'bg-[#D4AF37]/15'
                          : 'hover:bg-[#D4AF37]/8'
                      }`}
                    >
                      <div className={`text-xs font-semibold tracking-[0.14em] uppercase ${
                        selectedPlatform === option.value ? 'text-[#D4AF37]' : 'text-gray-200'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${
                        selectedPlatform === option.value ? 'text-[#D4AF37]/60' : 'text-gray-500'
                      }`}>
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {topStepXEnabled && onLayoutOptionChange && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                className="px-3 h-8 rounded-lg text-xs font-medium bg-[#050500] border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-colors flex items-center gap-1.5"
                title="Layout Options"
              >
                {layoutOptions.find(opt => opt.value === layoutOption)?.icon}
                <span>{layoutOptions.find(opt => opt.value === layoutOption)?.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLayoutDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLayoutDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0a0a00] border border-[#D4AF37]/20 rounded-lg shadow-xl z-50 overflow-hidden">
                  {layoutOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onLayoutOptionChange(option.value);
                        setShowLayoutDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-[#D4AF37]/10 transition-colors flex items-start gap-3 ${
                        layoutOption === option.value ? 'bg-[#D4AF37]/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 text-[#D4AF37]">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#D4AF37] mb-1">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onAskHarpToggle && (
            <button
              onClick={onAskHarpToggle}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                askHarpOpen
                  ? 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90'
                  : 'bg-[#050500] border border-[#6366f1]/30 text-[#6366f1] hover:bg-[#6366f1]/10 hover:border-[#6366f1]/50'
              }`}
              title="Ask Harper"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ask Harp
            </button>
          )}
          <button
            className="px-2.5 h-8 rounded-full text-[10px] tracking-[0.18em] uppercase border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
            title="Agent Heartbeat"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Heartbeat
          </button>
          <IVScoreCard score={ivScore} layoutOption={layoutOption} />
        </div>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
