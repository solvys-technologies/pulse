// [claude-code 2026-02-26] Add heading toolbar dock zone + optional docked widgets slot.
// [claude-code 2026-03-03] Toolbar items reorderable via getToolbarOrder/setToolbarOrder.
// [claude-code 2026-03-03] Phase 4C: IV score now derived from real VIX via quickIVScore.
import { useState, useEffect, useRef, useCallback } from 'react';
import { quickIVScore } from '../../lib/iv-scoring';
import { useAuth } from '../../contexts/AuthContext';
import { UpgradeModal } from '../UpgradeModal';
import { IVScoreCard } from '../IVScoreCard';
import { useBackend } from '../../lib/backend';
import { isElectron } from '../../lib/platform';
import { getToolbarOrder, setToolbarOrder, type ToolbarItemId } from '../../lib/layoutOrderStorage';
import { HeaderVoiceControl } from '../voice/HeaderVoiceControl';
import { GripVertical, Layers, ChevronDown, ChevronLeft, ChevronRight, Monitor, MessageCircle, Power } from 'lucide-react';
import type { TradingPlatform } from '../TopStepXBrowser';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'econ' | 'narrative' | 'settings';

const TAB_LABELS: Record<NavTab, string> = {
  executive: 'Dashboard',
  feed: 'Dashboard', // feed section removed; fallback for history
  analysis: 'Chat',
  news: 'RiskFlow',
  chatroom: 'Board Room',
  notion: 'Research Department',
  econ: 'Economic Calendar',
  narrative: 'NarrativeFlow',
  settings: 'Settings',
};

type LayoutOption = 'tickers-only' | 'combined';

interface TopHeaderProps {
  topStepXEnabled?: boolean;
  onTopStepXToggle?: () => void;
  onTopStepXDisable?: () => void;
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
  hideBranding?: boolean;
  psychAssistHeadingWidget?: React.ReactNode;
  toolbarEditMode?: boolean;
}

export function TopHeader({
  topStepXEnabled = false,
  onTopStepXToggle,
  onTopStepXDisable,
  selectedPlatform = 'topstepx',
  onPlatformSelect,
  layoutOption = 'combined',
  onLayoutOptionChange,
  askHarpOpen = false,
  onAskHarpToggle,
  activeTab = 'executive',
  tabHistory = [],
  historyIndex = 0,
  onBack,
  onForward,
  hideBranding = false,
  psychAssistHeadingWidget,
  toolbarEditMode = false,
}: TopHeaderProps) {
  const { tier } = useAuth();
  const backend = useBackend();
  const instanceName = import.meta.env.VITE_PULSE_INSTANCE_NAME || 'Pulse';
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [ivScore, setIvScore] = useState(3.2);
  const [vix, setVix] = useState(20);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [toolbarOrder, setToolbarOrderState] = useState<ToolbarItemId[]>(() => getToolbarOrder());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToolbarOrderState(getToolbarOrder());
  }, []);

  const handleToolbarDragStart = useCallback((e: React.DragEvent, id: ToolbarItemId) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleToolbarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleToolbarDrop = useCallback((e: React.DragEvent, targetId: ToolbarItemId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') as ToolbarItemId | '';
    if (!sourceId || sourceId === targetId) return;
    setToolbarOrderState((prev) => {
      const next = [...prev];
      const si = next.indexOf(sourceId);
      const ti = next.indexOf(targetId);
      if (si === -1 || ti === -1) return prev;
      next.splice(si, 1);
      next.splice(ti, 0, sourceId);
      setToolbarOrder(next);
      return next;
    });
  }, []);

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
    { value: 'tradesea', label: 'TradeSea', description: 'TradeSea Trading' },
    { value: 'topstepx', label: 'TopStepX', description: 'Real-Time Futures Trading Platform' },
    { value: 'tradelocker', label: 'TradeLocker', description: 'Real-Time CFDs Trading Platform' },
    { value: 'kalshi', label: 'Kalshi', description: 'Prediction Market' },
    { value: 'research', label: 'Research', description: 'Notion Research iFrame' },
  ];

  const selectedPlatformLabel =
    platformOptions.find((opt) => opt.value === selectedPlatform)?.label ?? 'TradeSea';

  const layoutOptions: Array<{ value: LayoutOption; label: string; description: string; icon: React.ReactNode }> = [
    {
      value: 'combined',
      label: 'Combined Panels',
      description: 'Mission Control and Tape stacked on the right',
      icon: <Layers className="w-4 h-4" />
    },
    {
      value: 'tickers-only',
      label: 'Zen Mode',
      description: 'Supports split-frame browser view',
      icon: <GripVertical className="w-4 h-4" />
    }
  ];

  // IV score derived from VIX — updates whenever VIX changes
  useEffect(() => {
    if (vix > 0) {
      setIvScore(quickIVScore(vix).legacyScore);
    }
  }, [vix]);

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
    <div
      id="pulse-heading-toolbar"
      className={`relative bg-[#0a0a00] flex items-center justify-between pl-6 pr-6 ${topStepXEnabled && layoutOption === 'tickers-only' ? 'h-[52px]' : 'h-[56px]'}`}
    >
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-3 transition-opacity duration-150 ${hideBranding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold tracking-[0.22em] text-[#D4AF37] uppercase">
              {instanceName}
            </span>
            <span className="text-[10px] tracking-[0.18em] text-gray-500 uppercase">
              Priced In Capital
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
          {psychAssistHeadingWidget}
          <div className="bg-[#050500] border border-zinc-800 rounded-lg px-2.5 h-8 flex items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-500">VIX</span>
              <span className="text-xs font-mono text-gray-300">
                {vix.toFixed(2)}
              </span>
            </div>
          </div>
          {toolbarOrder.map((id) => {
            const wrapper = (node: React.ReactNode) => (
              <div
                key={id}
                draggable={toolbarEditMode}
                onDragStart={toolbarEditMode ? (e) => handleToolbarDragStart(e, id) : undefined}
                onDragOver={toolbarEditMode ? handleToolbarDragOver : undefined}
                onDrop={toolbarEditMode ? (e) => handleToolbarDrop(e, id) : undefined}
                className="flex items-center gap-0.5 group/toolbar"
              >
                {toolbarEditMode && (
                  <div
                    className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5 text-gray-600 hover:text-[#D4AF37]"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}
                {node}
              </div>
            );
            if (id === 'platform' && onTopStepXToggle) {
              return wrapper(
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
              );
            }
            if (id === 'power' && topStepXEnabled && onTopStepXDisable) {
              return wrapper(
                <button
                  onClick={onTopStepXDisable}
                  className="px-2.5 h-8 rounded-lg text-xs font-medium bg-[#050500] text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                  title="Power off iframe"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              );
            }
            if (id === 'layout' && topStepXEnabled && onLayoutOptionChange) {
              return wrapper(
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
              );
            }
            if (id === 'chat' && onAskHarpToggle) {
              return wrapper(
                <button
                  onClick={onAskHarpToggle}
                  className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                    askHarpOpen
                      ? 'bg-[#6366f1] text-white hover:bg-[#6366f1]/90'
                      : 'bg-[#050500] border border-[#6366f1]/30 text-[#6366f1] hover:bg-[#6366f1]/10 hover:border-[#6366f1]/50'
                  }`}
                  title="Chat"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              );
            }
            if (id === 'voice') {
              return wrapper(
                <HeaderVoiceControl compact={topStepXEnabled && layoutOption === 'tickers-only'} />
              );
            }
            if (id === 'ivScore') {
              return wrapper(<IVScoreCard score={ivScore} layoutOption={layoutOption} />);
            }
            return null;
          })}
        </div>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
