// [claude-code 2026-02-26] Support dockable PsychAssist in Zen layout.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, X } from 'lucide-react';
import { quickIVScore, type IVScoreResult } from '../../lib/iv-scoring';
import { TopHeader } from './TopHeader';
import { NavSidebar } from './NavSidebar';
import { MinimalFeedSection } from '../feed/MinimalFeedSection';
import { KanbanTitle } from '../ui/KanbanTitle';
import { MinimalTapeWidget } from '../feed/MinimalTapeWidget';
import { NewsSection } from '../feed/NewsSection';
import { AnalysisSection } from '../analysis/AnalysisSection';
import { TopStepXBrowser, type TradingPlatform } from '../TopStepXBrowser';
import { FloatingWidget } from './FloatingWidget';
import { PanelPosition } from './DraggablePanel';
import { useBackend } from '../../lib/backend';
import { EmotionalResonanceMonitor } from '../mission-control/EmotionalResonanceMonitor';
import { BlindspotsWidget } from '../mission-control/BlindspotsWidget';
import { AccountTrackerWidget } from '../mission-control/AccountTrackerWidget';
import { AlgoStatusWidget } from '../mission-control/AlgoStatusWidget';
import { PanelNotificationWidget } from './PanelNotificationWidget';
import { MinimalERMeter } from '../MinimalERMeter';
import { ExecutiveDashboard } from '../executive/ExecutiveDashboard';
import { BoardroomView } from '../BoardroomView';
import { ResearchDepartment } from '../executive/ResearchDepartment';
import { SectionBreadcrumb } from './SectionBreadcrumb';
import RiskFlowPanel from '../RiskFlowPanel';
import { useRiskFlow } from '../../contexts/RiskFlowContext';
import { SearchModal } from '../search/SearchModal';
import { AskHarpChatPanel } from '../chat/AskHarpChatPanel';
import { SettingsPage } from '../SettingsPanel';
import { useSettings } from '../../contexts/SettingsContext';
import { PsychAssistDockable, type PsychAssistDockTarget } from './PsychAssistDockable';
import { FooterToolbar } from './FooterToolbar';
import { EmbeddedBrowserFrame } from './EmbeddedBrowserFrame';
import { ScheduleProvider } from '../../contexts/ScheduleContext';
import { EconCalendarProvider } from '../../contexts/EconCalendarContext';
import { EconCalendar } from '../econ/EconCalendar';
import { NarrativeProvider } from '../../contexts/NarrativeContext';
import { NarrativeFlow } from '../narrative/NarrativeFlow';
import { ERScoringProvider } from '../../contexts/EarningsHistoryContext';
import { EarningsHistoryPanel } from '../earnings/EarningsHistoryPanel';
import { SessionCountdownWidget } from '../mission-control/SessionCountdownWidget';
import { RegimeMini } from '../mission-control/RegimeMini';
import {
  DEFAULT_MISSION_WIDGET_ORDER,
  getMissionWidgetOrder,
  setMissionWidgetOrder,
  type MissionWidgetId,
} from '../../lib/layoutOrderStorage';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'econ' | 'narrative' | 'earnings' | 'settings';
type LayoutOption = 'tickers-only' | 'combined';

const MISSION_WIDGETS_PER_PAGE = 2;

function normalizeOrder<T extends string>(order: T[], defaults: readonly T[]): T[] {
  const deduped = order.filter((id, idx) => defaults.includes(id) && order.indexOf(id) === idx);
  const missing = defaults.filter((id) => !deduped.includes(id));
  return [...deduped, ...missing];
}

// Main layout component - no authentication needed
export function MainLayout() {
  const { iframeUrls } = useSettings();
  const [activeTab, setActiveTab] = useState<NavTab>('executive');
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [missionControlCollapsed, setMissionControlCollapsed] = useState(false);
  const [tapeCollapsed, setTapeCollapsed] = useState(false);
  const [combinedPanelCollapsed, setCombinedPanelCollapsed] = useState(false);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [prevTab, setPrevTab] = useState<NavTab | null>(null);
  const [topStepXEnabled, setTopStepXEnabled] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<TradingPlatform>('topstepx');
  const [secondaryPlatform, setSecondaryPlatform] = useState<TradingPlatform>('research');
  const [splitBrowserView, setSplitBrowserView] = useState(false);
  const [layoutOption, setLayoutOption] = useState<LayoutOption>('combined');
  const [prevLayoutOption, setPrevLayoutOption] = useState<LayoutOption | null>(null);
  const [missionControlPosition, setMissionControlPosition] = useState<PanelPosition>('right');
  const [tapePosition, setTapePosition] = useState<PanelPosition>('right');
  const [vix, setVix] = useState(20);
  const [ivScoreResult, setIvScoreResult] = useState<IVScoreResult | null>(null);
  const ivScore = ivScoreResult?.legacyScore ?? 3.2;
  const [showMissionControlNotification, setShowMissionControlNotification] = useState(false);
  const [showTapeNotification, setShowTapeNotification] = useState(false);
  const [combinedPanelErScore, setCombinedPanelErScore] = useState(0);
  const [combinedPanelPnl, setCombinedPanelPnl] = useState(0);
  const [combinedPanelAlgoEnabled, setCombinedPanelAlgoEnabled] = useState(false);
  const [riskFlowCollapsed, setRiskFlowCollapsed] = useState(false);
  const [showAskHarp, setShowAskHarp] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sidebarOverlayVisible, setSidebarOverlayVisible] = useState(false);
  const [missionWidgetOrder, setMissionWidgetOrderState] = useState<MissionWidgetId[]>(() =>
    normalizeOrder(getMissionWidgetOrder(), DEFAULT_MISSION_WIDGET_ORDER)
  );
  const [missionDeckPage, setMissionDeckPage] = useState(0);
  const missionDeckRef = useRef<HTMLDivElement>(null);
  const [psychAssistTarget, setPsychAssistTarget] = useState<PsychAssistDockTarget>(() => {
    try {
      return (localStorage.getItem('pulse_psychassist_target:v1') as PsychAssistDockTarget) || 'floating';
    } catch {
      return 'floating';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pulse_psychassist_target:v1', psychAssistTarget);
    } catch {
      // ignore
    }
  }, [psychAssistTarget]);

  useEffect(() => {
    setMissionWidgetOrderState((prev) => normalizeOrder(prev, DEFAULT_MISSION_WIDGET_ORDER));
  }, []);

  // Tab history for breadcrumb back/forward navigation
  const [tabHistory, setTabHistory] = useState<NavTab[]>(['executive']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigateTab = (tab: NavTab) => {
    // Trim forward history when navigating to a new tab
    const trimmed = tabHistory.slice(0, historyIndex + 1);
    trimmed.push(tab);
    setTabHistory(trimmed);
    setHistoryIndex(trimmed.length - 1);
    setActiveTab(tab);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setActiveTab(tabHistory[newIdx]);
    }
  };

  const goForward = () => {
    if (historyIndex < tabHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setActiveTab(tabHistory[newIdx]);
    }
  };

  const backend = useBackend();
  const { alerts: riskFlowAlerts } = useRiskFlow();
  const [combinedTapeCollapsed, setCombinedTapeCollapsed] = useState(false);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const TAB_MAP: Record<string, NavTab> = {
      '1': 'executive',
      '2': 'analysis',
      '3': 'news',
      '4': 'chatroom',
      '5': 'econ',
      '6': 'notion',
      '7': 'narrative',
    };

    const handler = (e: KeyboardEvent) => {
      // Cmd+K -> Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((v) => !v);
        return;
      }
      // Cmd+Shift+1-5 -> Tab navigation
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && TAB_MAP[e.key]) {
        e.preventDefault();
        navigateTab(TAB_MAP[e.key]);
        return;
      }
      // Esc -> Close modals
      if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset layout when TopStepX is toggled
  useEffect(() => {
    if (topStepXEnabled) {
      setMissionControlPosition('right');
      setTapePosition('right');
      setLayoutOption('combined');
    } else {
      setMissionControlPosition('right');
      setTapePosition('right');
      setMissionControlCollapsed(false);
      setTapeCollapsed(false);
    }
  }, [topStepXEnabled]);

  useEffect(() => {
    if (layoutOption === 'combined' && prevLayoutOption !== layoutOption) {
      setCombinedPanelCollapsed(false);
    }
    setPrevLayoutOption(layoutOption);
  }, [layoutOption, prevLayoutOption]);

  // Fetch VIX and IV Score for floating widget
  useEffect(() => {
    const fetchVIX = async () => {
      try {
        const data = await backend.riskflow.fetchVIX();
        if (data && typeof data.value === 'number') {
          setVix(data.value);
        }
      } catch (error) {
        console.error('[VIX] Failed to fetch VIX:', error);
      }
    };

    fetchVIX();
    const interval = setInterval(fetchVIX, 300000);
    return () => clearInterval(interval);
  }, [backend]);

  // Compute IV score from VIX using the scoring engine
  useEffect(() => {
    if (vix > 0) {
      setIvScoreResult(quickIVScore(vix));
    }
  }, [vix]);

  // Fetch account data for combined panel collapsed state
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const account = await backend.account.get();
        setCombinedPanelPnl(account.dailyPnl);
        setCombinedPanelAlgoEnabled(account.autoTrade || false);
      } catch (err) {
        console.error('Failed to fetch account:', err);
      }
    };
    fetchAccount();
    const interval = setInterval(fetchAccount, 5000);
    return () => clearInterval(interval);
  }, [backend]);

  // Listen for ER score updates for combined panel
  useEffect(() => {
    const handleERUpdate = (event: CustomEvent<number>) => {
      setCombinedPanelErScore(event.detail);
    };
    window.addEventListener('erScoreUpdate', handleERUpdate as EventListener);
    return () => {
      window.removeEventListener('erScoreUpdate', handleERUpdate as EventListener);
    };
  }, []);

  // Normalize ER score from -10 to 10 range to 0-1 range for display
  const normalizedCombinedPanelResonance = Math.max(0, Math.min(1, (combinedPanelErScore + 10) / 20));

  const handleTabChange = (tab: NavTab) => {
    if (tab === activeTab || tabTransitioning) return;
    setTabTransitioning(true);
    setPrevTab(activeTab);
    setTimeout(() => {
      navigateTab(tab);
      setTimeout(() => {
        setTabTransitioning(false);
        setPrevTab(null);
      }, 50);
    }, 300);
  };

  const handleLogout = async () => {
    // No-op in local single-user mode
    console.log('Logout not available in local mode');
  };

  // Determine layout based on TopStepX state and layout option
  const showMissionControl = topStepXEnabled && missionControlPosition !== 'floating';
  const showTape = topStepXEnabled && tapePosition !== 'floating';
  const showFloatingWidget = topStepXEnabled && layoutOption === 'tickers-only';
  const showCombinedPanel = topStepXEnabled && layoutOption === 'combined';

  // Determine panel order based on position and layout option
  const leftPanels: React.ReactNode[] = [];
  const rightPanels: React.ReactNode[] = [];

  const handleMissionWidgetDragStart = useCallback((e: React.DragEvent, id: MissionWidgetId) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleMissionWidgetDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleMissionWidgetDrop = useCallback((e: React.DragEvent, targetId: MissionWidgetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') as MissionWidgetId | '';
    if (!sourceId || sourceId === targetId) return;
    setMissionWidgetOrderState((prev) => {
      const next = [...prev];
      const sourceIndex = next.indexOf(sourceId);
      const targetIndex = next.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, sourceId);
      const normalized = normalizeOrder(next, DEFAULT_MISSION_WIDGET_ORDER);
      setMissionWidgetOrder(normalized);
      return normalized;
    });
  }, []);


  const missionWidgetRegistry = useMemo(() => ({
    er: {
      id: 'er' as const,
      label: 'Emotional Resonance',
      node: <EmotionalResonanceMonitor onERScoreChange={setCombinedPanelErScore} />,
    },
    autopilot: {
      id: 'autopilot' as const,
      label: 'Autopilot',
      node: <AlgoStatusWidget />,
    },
    regime: {
      id: 'regime' as const,
      label: 'Regime Tracker',
      node: <RegimeMini />,
    },
    account: {
      id: 'account' as const,
      label: 'Account Tracker',
      node: <AccountTrackerWidget />,
    },
    blindspots: {
      id: 'blindspots' as const,
      label: 'Blindspots',
      node: <BlindspotsWidget />,
    },
  }), []);

  const orderedMissionWidgets = useMemo(() => {
    const normalized = normalizeOrder(missionWidgetOrder, DEFAULT_MISSION_WIDGET_ORDER);
    return normalized.map((id) => missionWidgetRegistry[id]);
  }, [missionWidgetOrder, missionWidgetRegistry]);

  const missionWidgetPages = useMemo(() => {
    const pages: Array<typeof orderedMissionWidgets> = [];
    for (let i = 0; i < orderedMissionWidgets.length; i += MISSION_WIDGETS_PER_PAGE) {
      pages.push(orderedMissionWidgets.slice(i, i + MISSION_WIDGETS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [orderedMissionWidgets]);

  useEffect(() => {
    setMissionDeckPage((prev) => Math.min(prev, Math.max(0, missionWidgetPages.length - 1)));
  }, [missionWidgetPages.length]);

  const scrollMissionDeckToPage = useCallback((idx: number) => {
    setMissionDeckPage(idx);
    const el = missionDeckRef.current;
    if (!el) return;
    const pages = el.querySelectorAll('[data-mission-page]');
    if (pages[idx]) {
      pages[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleMissionDeckScroll = useCallback(() => {
    const el = missionDeckRef.current;
    if (!el) return;
    const pages = el.querySelectorAll('[data-mission-page]');
    let closest = 0;
    let minDist = Infinity;
    pages.forEach((page, idx) => {
      const rect = page.getBoundingClientRect();
      const offset = Math.abs(rect.top - el.getBoundingClientRect().top);
      if (offset < minDist) {
        minDist = offset;
        closest = idx;
      }
    });
    setMissionDeckPage(closest);
  }, []);

  // Reusable Mission Control content block: snap deck with exactly 2 widgets per page.
  const missionControlContent = (
    <div className="h-full flex flex-col">
      <KanbanTitle title="Mission Control" tone="gold" />

      <div className="mt-2 flex-1 min-h-0 relative">
        <div
          ref={missionDeckRef}
          onScroll={handleMissionDeckScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory border-y border-[var(--pulse-accent)]/15"
        >
          {missionWidgetPages.map((page, pageIdx) => (
            <section
              key={`mission-page-${pageIdx}`}
              data-mission-page={pageIdx}
              className="min-h-full snap-start grid grid-rows-2 divide-y divide-[var(--pulse-accent)]/15"
            >
              {[0, 1].map((slotIdx) => {
                const widget = page[slotIdx];
                if (!widget) {
                  return <div key={`slot-${slotIdx}`} className="p-3" />;
                }
                return (
                  <div
                    key={widget.id}
                    className="p-3"
                    draggable={layoutEditMode}
                    onDragStart={layoutEditMode ? (e) => handleMissionWidgetDragStart(e, widget.id) : undefined}
                    onDragOver={layoutEditMode ? handleMissionWidgetDragOver : undefined}
                    onDrop={layoutEditMode ? (e) => handleMissionWidgetDrop(e, widget.id) : undefined}
                  >
                    {layoutEditMode && (
                      <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        <GripVertical className="w-3 h-3 text-[var(--pulse-accent)]/70" />
                        <span>{widget.label}</span>
                      </div>
                    )}
                    {widget.node}
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {missionWidgetPages.length > 1 && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-2">
            {missionWidgetPages.map((_, idx) => (
              <button
                key={`mission-dot-${idx}`}
                onClick={() => scrollMissionDeckToPage(idx)}
                title={`Mission page ${idx + 1}`}
                className="group relative flex items-center justify-center"
              >
                <div
                  className={`transition-all duration-300 rounded-full ${
                    missionDeckPage === idx
                      ? 'w-[3px] h-8 bg-[var(--pulse-accent)]'
                      : 'w-[2px] h-5 bg-gray-700 hover:bg-gray-500'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // When TopStepX is enabled, render panels based on layout option
  if (topStepXEnabled) {
    if (layoutOption === 'combined') {
      // Combined panel: Mission Control + The Tape in one scroll (split, no overlap)
      rightPanels.push(
        <div key="combined" className={`bg-[var(--pulse-surface)] border-l border-[var(--pulse-accent)]/20 transition-all duration-200 ${combinedPanelCollapsed ? 'w-16' : 'w-[380px]'}`}>
          <div className="h-full flex flex-col">
            <div className="h-12 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--pulse-accent)]/20">
              {!combinedPanelCollapsed && (
                <h2 className="text-sm font-semibold text-[var(--pulse-accent)]">Panels</h2>
              )}
              <button
                onClick={() => setCombinedPanelCollapsed(!combinedPanelCollapsed)}
                className="p-1.5 hover:bg-[var(--pulse-accent)]/10 rounded transition-colors ml-auto"
              >
                {combinedPanelCollapsed ? (
                  <ChevronLeft className="w-4 h-4 text-[var(--pulse-accent)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--pulse-accent)]" />
                )}
              </button>
            </div>
            {!combinedPanelCollapsed && (
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                {/* Mission Control: full-width Kanban cards */}
                <section className="flex-shrink-0 border-b border-[var(--pulse-accent)]/20 h-[560px]">
                  <div className="p-3 h-full">
                    {missionControlContent}
                  </div>
                </section>
                {/* The Tape: collapsible; when expanded takes space below (scroll to view) */}
                <section className="flex-shrink-0 flex flex-col border-t border-[var(--pulse-accent)]/20">
                  <button
                    type="button"
                    onClick={() => setCombinedTapeCollapsed(!combinedTapeCollapsed)}
                    className="h-10 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--pulse-accent)]/20 hover:bg-[var(--pulse-accent)]/5 transition-colors w-full text-left"
                  >
                    <span className="text-[11px] font-semibold text-[var(--pulse-accent)] tracking-[0.2em] uppercase">The Tape</span>
                    {combinedTapeCollapsed && riskFlowAlerts.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500/30 text-red-400 text-[10px] font-bold">
                        {riskFlowAlerts.length}
                      </span>
                    )}
                    <span className="text-[var(--pulse-accent)]/60">
                      {combinedTapeCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {!combinedTapeCollapsed && (
                    <div className="min-h-[200px] p-3">
                      <MinimalFeedSection collapsed={false} position="right" />
                    </div>
                  )}
                  {combinedTapeCollapsed && (
                    <div className="p-3 flex justify-center">
                      <div className="w-full max-w-[120px]">
                        <MinimalTapeWidget />
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
            {combinedPanelCollapsed && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-2 bg-[var(--pulse-surface)]">
                <div className="w-full max-w-[120px]">
                  <MinimalERMeter
                    resonance={normalizedCombinedPanelResonance}
                    pnl={combinedPanelPnl}
                    algoEnabled={combinedPanelAlgoEnabled}
                  />
                </div>
                <div className="w-full max-w-[120px]">
                  <MinimalTapeWidget />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    // For 'tickers-only', no panels are shown (only floating widget)
  } else {
    // When TopStepX is disabled: right stack = Mission Control + collapsible RiskFlow
    const hideRightPanel = activeTab === 'notion' || activeTab === 'chatroom' || activeTab === 'econ' || activeTab === 'narrative' || activeTab === 'earnings' || activeTab === 'settings';
    if (!hideRightPanel) {
      if (riskFlowCollapsed) {
        rightPanels.push(
          <div key="right-stack" className="w-[380px] flex-shrink-0 h-full min-w-0 flex flex-col border-l border-[var(--pulse-accent)]/15">
            <div className="flex-1 min-h-0 overflow-y-auto border-b border-[var(--pulse-accent)]/20">
              <div className="p-3 h-full">
                {missionControlContent}
              </div>
            </div>
            <div className="h-[168px] shrink-0 border-t border-[var(--pulse-accent)]/20">
              <RiskFlowPanel
                collapsed={riskFlowCollapsed}
                onToggleCollapsed={() => setRiskFlowCollapsed((v) => !v)}
              />
            </div>
          </div>
        );
      } else {
        rightPanels.push(
          <div key="right-stack" className="w-[380px] flex-shrink-0 h-full min-w-0 flex flex-col border-l border-[var(--pulse-accent)]/15">
            <div className="h-1/2 flex flex-col border-b border-[var(--pulse-accent)]/20">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-3 h-full">
                  {missionControlContent}
                </div>
              </div>
            </div>
            <div className="h-1/2 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <RiskFlowPanel
                  collapsed={riskFlowCollapsed}
                  onToggleCollapsed={() => setRiskFlowCollapsed((v) => !v)}
                />
              </div>
            </div>
          </div>
        );
      }
    }
  }

  return (
    <ScheduleProvider>
    <div className="h-screen flex flex-col bg-[var(--pulse-bg)] text-white">
      <TopHeader
        topStepXEnabled={topStepXEnabled}
        onTopStepXToggle={() => setTopStepXEnabled(true)}
        onTopStepXDisable={() => setTopStepXEnabled(false)}
        selectedPlatform={selectedPlatform}
        onPlatformSelect={setSelectedPlatform}
        layoutOption={layoutOption}
        onLayoutOptionChange={setLayoutOption}
        askHarpOpen={showAskHarp}
        onAskHarpToggle={() => setShowAskHarp(prev => !prev)}
        activeTab={activeTab}
        tabHistory={tabHistory}
        historyIndex={historyIndex}
        onBack={goBack}
        onForward={goForward}
        hideBranding={topStepXEnabled && sidebarOverlayVisible}
        toolbarEditMode={layoutEditMode}
        psychAssistHeadingWidget={
          topStepXEnabled && layoutOption === 'tickers-only' && psychAssistTarget === 'header' ? (
            <PsychAssistDockable
              target="header"
              onDockToHeader={() => setPsychAssistTarget('header')}
              onUndockToFloating={() => setPsychAssistTarget('floating')}
            />
          ) : undefined
        }
      />

      <div className="flex-1 flex overflow-hidden relative">
        <NavSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
          topStepXEnabled={topStepXEnabled}
          onOverlayVisibilityChange={setSidebarOverlayVisible}
          onEditModeChange={setLayoutEditMode}
        />

        {/* Left Panels */}
        {leftPanels.length > 0 && (
          <div className="flex">
            {leftPanels}
          </div>
        )}

        {/* Center Content - TopStepX or Main Content */}
        <div className="flex-1 overflow-hidden relative min-w-0 flex flex-col">
          {topStepXEnabled ? (
            <div className="h-full w-full flex-1 p-0 min-h-0">
              <TopStepXBrowser
                primaryPlatform={selectedPlatform}
                onPrimaryPlatformChange={setSelectedPlatform}
                secondaryPlatform={secondaryPlatform}
                onSecondaryPlatformChange={setSecondaryPlatform}
                splitViewEnabled={splitBrowserView}
                onSplitViewEnabledChange={setSplitBrowserView}
                allowSplitView={layoutOption === 'tickers-only'}
              />
            </div>
          ) : (
            <div className="h-full relative flex-1 flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === 'executive' && (
                <div key="executive" className={`h-full w-full section-fade-corners ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <ExecutiveDashboard />
                </div>
              )}
              {activeTab === 'analysis' && (
                <div key="analysis" className={`h-full w-full section-fade-corners ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <AnalysisSection />
                </div>
              )}
              {activeTab === 'news' && (
                <div key="news" className={`h-full w-full section-fade-corners ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <NewsSection />
                </div>
              )}
              {activeTab === 'chatroom' && (
                <div key="chatroom" className={`h-full w-full section-fade-corners ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <BoardroomView />
                </div>
              )}
              {activeTab === 'econ' && (
                <div key="econ" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <EconCalendarProvider>
                    <EconCalendar />
                  </EconCalendarProvider>
                </div>
              )}
              {activeTab === 'narrative' && (
                <div key="narrative" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <NarrativeProvider>
                    <NarrativeFlow />
                  </NarrativeProvider>
                </div>
              )}
              {activeTab === 'notion' && (
                <div key="notion" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <ResearchDepartment />
                </div>
              )}
              {activeTab === 'earnings' && (
                <div key="earnings" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <ERScoringProvider>
                    <EarningsHistoryPanel />
                  </ERScoringProvider>
                </div>
              )}
              {activeTab === 'settings' && (
                <div key="settings" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <SettingsPage />
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panels */}
        {rightPanels.length > 0 && (
          <div className="flex">
            {rightPanels}
          </div>
        )}

        {/* Floating Widget */}
        {showFloatingWidget && (
          <FloatingWidget 
            vix={vix} 
            ivScore={ivScore}
            layoutOption={layoutOption}
            onClose={() => {}}
          />
        )}

        {/* Zen Layout: dockable PsychAssist widget (float ↔ header) */}
        {topStepXEnabled && layoutOption === 'tickers-only' && psychAssistTarget === 'floating' && (
          <PsychAssistDockable
            target="floating"
            onDockToHeader={() => setPsychAssistTarget('header')}
            onUndockToFloating={() => setPsychAssistTarget('floating')}
          />
        )}

        {/* Panel Notification Widgets */}
        {showMissionControlNotification && (
          <PanelNotificationWidget
            panelName="Mission Control"
            onRestore={() => {
              setMissionControlPosition('right');
              setShowMissionControlNotification(false);
            }}
            onDismiss={() => setShowMissionControlNotification(false)}
          />
        )}
        {showTapeNotification && (
          <PanelNotificationWidget
            panelName="The Tape"
            onRestore={() => {
              setTapePosition('right');
              setShowTapeNotification(false);
            }}
            onDismiss={() => setShowTapeNotification(false)}
          />
        )}

        {/* Global chat panel (hidden on boardroom tab where it's already embedded) */}
        {showAskHarp && activeTab !== 'chatroom' && (
          <div className="absolute right-0 top-0 bottom-0 w-[360px] z-40 flex flex-col bg-[var(--pulse-surface)] border-l border-[var(--pulse-accent)]/20 shadow-2xl animate-fade-in-tab">
            <div className="flex items-center justify-end px-4 py-2 flex-shrink-0">
              <button
                onClick={() => setShowAskHarp(false)}
                className="p-1 rounded hover:bg-[var(--pulse-accent)]/10 text-gray-400 hover:text-[var(--pulse-accent)] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AskHarpChatPanel />
            </div>
          </div>
        )}
      </div>

      <SessionCountdownWidget />

      <FooterToolbar
        topStepXEnabled={topStepXEnabled}
        primaryPlatform={selectedPlatform}
        onPrimaryPlatformChange={setSelectedPlatform}
        splitViewEnabled={splitBrowserView}
        onSplitViewToggle={() => setSplitBrowserView((v) => !v)}
        allowSplitView={layoutOption === 'tickers-only'}
        onPowerOff={() => setTopStepXEnabled(false)}
      />

      {/* Preload iframes — hidden, loads TopStepX + Research in background for instant tab switch */}
      {!topStepXEnabled && (
        <div style={{ position: 'fixed', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <EmbeddedBrowserFrame title="TopStepX (preload)" src="https://www.topstepx.com" />
          <EmbeddedBrowserFrame title="Research (preload)" src={iframeUrls.research || import.meta.env.VITE_NOTION_RESEARCH_URL || 'https://www.notion.so'} />
        </div>
      )}

      {/* Global overlays */}
      <SearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigateTab={(tab) => navigateTab(tab as NavTab)}
      />
    </div>
    </ScheduleProvider>
  );
}
