// [claude-code 2026-02-26] Support dockable PsychAssist in Zen layout.
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react';
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
import { PsychAssistDockable, type PsychAssistDockTarget } from './PsychAssistDockable';
import { FooterToolbar } from './FooterToolbar';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'settings';
type LayoutOption = 'tickers-only' | 'combined';

// Main layout component - no authentication needed
export function MainLayout() {
  const [activeTab, setActiveTab] = useState<NavTab>('executive');
  const [missionControlCollapsed, setMissionControlCollapsed] = useState(false);
  const [tapeCollapsed, setTapeCollapsed] = useState(false);
  const [combinedPanelCollapsed, setCombinedPanelCollapsed] = useState(false);
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [prevTab, setPrevTab] = useState<NavTab | null>(null);
  const [topStepXEnabled, setTopStepXEnabled] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<TradingPlatform>('tradesea');
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
  const [riskFlowCollapsed, setRiskFlowCollapsed] = useState(false);
  const [combinedPanelErScore, setCombinedPanelErScore] = useState(0);
  const [combinedPanelPnl, setCombinedPanelPnl] = useState(0);
  const [combinedPanelAlgoEnabled, setCombinedPanelAlgoEnabled] = useState(false);
  const [showAskHarp, setShowAskHarp] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
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
      '5': 'notion',
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

  // Kanban card wrapper for Mission Control widgets (matches Dashboard aesthetic)
  const missionControlKanbanCard = 'bg-[#0b0b08] border-l-2 border-[#D4AF37]/35 px-4 py-3 w-full';

  // Reusable Mission Control content block: Kanban title + widgets in Kanban cards
  const missionControlContent = (
    <>
      <KanbanTitle title="Mission Control" tone="gold" />
      <div className="space-y-3 mt-2">
        <div className={missionControlKanbanCard}>
          <EmotionalResonanceMonitor onERScoreChange={setCombinedPanelErScore} />
        </div>
        <div className={missionControlKanbanCard}>
          <AlgoStatusWidget />
        </div>
        <div className={missionControlKanbanCard}>
          <AccountTrackerWidget />
        </div>
        <div className={missionControlKanbanCard}>
          <BlindspotsWidget />
        </div>
      </div>
    </>
  );

  // When TopStepX is enabled, render panels based on layout option
  if (topStepXEnabled) {
    if (layoutOption === 'combined') {
      // Combined panel: Mission Control + The Tape in one scroll (split, no overlap)
      rightPanels.push(
        <div key="combined" className={`bg-[#0a0a00] border-l border-[#D4AF37]/20 transition-all duration-200 ${combinedPanelCollapsed ? 'w-16' : 'w-96'}`}>
          <div className="h-full flex flex-col">
            <div className="h-12 flex-shrink-0 flex items-center justify-between px-3 border-b border-[#D4AF37]/20">
              {!combinedPanelCollapsed && (
                <h2 className="text-sm font-semibold text-[#D4AF37]">Panels</h2>
              )}
              <button
                onClick={() => setCombinedPanelCollapsed(!combinedPanelCollapsed)}
                className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors ml-auto"
              >
                {combinedPanelCollapsed ? (
                  <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
                )}
              </button>
            </div>
            {!combinedPanelCollapsed && (
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                {/* Mission Control: full-width Kanban cards */}
                <section className="flex-shrink-0 border-b border-[#D4AF37]/20 pb-4">
                  <div className="p-3">
                    {missionControlContent}
                  </div>
                </section>
                {/* The Tape: collapsible; when expanded takes space below (scroll to view) */}
                <section className="flex-shrink-0 flex flex-col border-t border-[#D4AF37]/20">
                  <button
                    type="button"
                    onClick={() => setCombinedTapeCollapsed(!combinedTapeCollapsed)}
                    className="h-10 flex-shrink-0 flex items-center justify-between px-3 border-b border-[#D4AF37]/20 hover:bg-[#D4AF37]/5 transition-colors w-full text-left"
                  >
                    <span className="text-[11px] font-semibold text-[#D4AF37] tracking-[0.2em] uppercase">The Tape</span>
                    {combinedTapeCollapsed && riskFlowAlerts.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500/30 text-red-400 text-[10px] font-bold">
                        {riskFlowAlerts.length}
                      </span>
                    )}
                    <span className="text-[#D4AF37]/60">
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
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-2 bg-[#0a0a00]">
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
    // When TopStepX is disabled: right stack = 50/50 split with independent scroll
    const hideRightPanel = activeTab === 'notion' || activeTab === 'chatroom' || activeTab === 'settings';
    if (!hideRightPanel) {
      rightPanels.push(
        <div key="right-stack" className="w-80 flex-shrink-0 h-full min-w-0 flex flex-col border-l border-[#D4AF37]/15">
          {/* Top half: Mission Control — independently scrollable */}
          <div className="h-1/2 overflow-y-auto border-b border-[#D4AF37]/20">
            <div className="p-3">
              {missionControlContent}
            </div>
          </div>
          {/* Bottom half: RiskFlow — independently scrollable */}
          <div className="h-1/2 overflow-y-auto">
            <RiskFlowPanel
              collapsed={riskFlowCollapsed}
              onToggleCollapsed={() => setRiskFlowCollapsed((v) => !v)}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#050500] text-white">
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
        {!topStepXEnabled && (
          <NavSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogout={handleLogout}
            topStepXEnabled={topStepXEnabled}
          />
        )}

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
                onClose={() => setTopStepXEnabled(false)}
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
              {activeTab === 'notion' && (
                <div key="notion" className={`h-full w-full ${tabTransitioning && prevTab ? 'animate-fade-out-tab' : 'animate-fade-in-tab'}`}>
                  <ResearchDepartment />
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
          <div className="absolute right-0 top-0 bottom-0 w-[360px] z-40 flex flex-col bg-[#0a0a00] border-l border-[#D4AF37]/20 shadow-2xl animate-fade-in-tab">
            <div className="flex items-center justify-end px-4 py-2 flex-shrink-0">
              <button
                onClick={() => setShowAskHarp(false)}
                className="p-1 rounded hover:bg-[#D4AF37]/10 text-gray-400 hover:text-[#D4AF37] transition-colors"
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

      <FooterToolbar />

      {/* Global overlays */}
      <SearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigateTab={(tab) => navigateTab(tab as NavTab)}
      />
    </div>
  );
}

