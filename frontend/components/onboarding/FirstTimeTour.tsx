// [claude-code 2026-03-11] First-time user tour + "What's New" button after updates
import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const TOUR_STORAGE_KEY = 'pulse_tour_completed';
const LAST_VERSION_KEY = 'pulse_last_seen_version';
const CURRENT_VERSION = '7.7.7';
const WHATS_NEW_TIMEOUT_MS = 30_000;

interface TourStep {
  title: string;
  description: string;
  target: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Dashboard',
    description: 'Your daily briefing, economic calendar, KPIs, and action tape. Start each session here.',
    target: 'executive',
  },
  {
    title: 'RiskFlow',
    description: 'Real-time news and event feed scored by the IV engine. Headlines flow in automatically from X, RSS, and Notion trade ideas.',
    target: 'news',
  },
  {
    title: 'Chat',
    description: 'Talk to your AI analysts. Use skills like /brief, /validate, /report, or /psych_assist. Drag RiskFlow items into chat for context.',
    target: 'analysis',
  },
  {
    title: 'Economic Calendar',
    description: 'TradingView calendar with country filters, importance levels, earnings, dividends, and IPOs.',
    target: 'econ',
  },
  {
    title: 'Trading Journal',
    description: 'Two tabs — Human (ER trend, infractions, discipline score) and Agent (proposal tracker, win rate, R:R).',
    target: 'earnings',
  },
  {
    title: 'Research Department',
    description: 'Your shared Notion research corpus with an AI assistant sidebar. Log into Notion on first visit.',
    target: 'notion',
  },
  {
    title: 'Board Room',
    description: 'Multi-agent boardroom sessions. All team members see the same meetings.',
    target: 'chatroom',
  },
  {
    title: 'Mission Control',
    description: 'Compact widgets: ER monitor, blindspots, account tracker, algo status, session calendar. Rearrange with the gear icon.',
    target: 'mission-control',
  },
  {
    title: 'Toolbar',
    description: 'IV score, VIX ticker, voice control, and chat toggle live in the top toolbar. Drag items to reorder.',
    target: 'toolbar',
  },
];

const WHATS_NEW_ITEMS = [
  'TradingView calendar with full filters (country, earnings, importance)',
  'Trading Journal — Human psych + Agent performance tabs',
  'IV Scoring — blended 60% VIX + 40% headlines',
  'Economic prints auto-flow into RiskFlow for IV scoring',
  'Skills popup with smooth transitions and keyword tags',
  'Backend auto-starts with the Electron app',
  'Source status indicators poll every 30s',
];

export function FirstTimeTour({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [showTour, setShowTour] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      setShowTour(true);
    }
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION);
    setShowTour(false);
  }, []);

  const goNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      onNavigate?.(TOUR_STEPS[nextStep].target);
    } else {
      completeTour();
    }
  }, [step, onNavigate, completeTour]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      onNavigate?.(TOUR_STEPS[prevStep].target);
    }
  }, [step, onNavigate]);

  if (!showTour) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] bg-[#0c0a06] border border-[var(--pulse-accent)]/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--pulse-accent)]/15">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--pulse-accent)]" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--pulse-accent)]">
              Welcome to Pulse
            </span>
          </div>
          <button onClick={completeTour} className="text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          <div className="text-lg font-semibold text-white mb-2">{current.title}</div>
          <p className="text-sm text-gray-400 leading-relaxed">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--pulse-accent)]/10">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-[var(--pulse-accent)]' : i < step ? 'bg-[var(--pulse-accent)]/40' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium bg-[var(--pulse-accent)] text-black rounded hover:brightness-110 transition-all"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "What's New" button — appears in toolbar for 30s after detecting a version update */
export function WhatsNewButton() {
  const [visible, setVisible] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
    const tourDone = localStorage.getItem(TOUR_STORAGE_KEY);

    // Only show if tour was completed (not first-time user) and version changed
    if (tourDone && lastVersion && lastVersion !== CURRENT_VERSION) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        localStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION);
      }, WHATS_NEW_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }

    // Seed version on first mount if tour is done
    if (tourDone && !lastVersion) {
      localStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium bg-[var(--pulse-accent)]/15 border border-[var(--pulse-accent)]/30 text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/25 transition-colors animate-pulse"
      >
        <Sparkles className="w-3 h-3" />
        What's New
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c0a06] border border-[var(--pulse-accent)]/20 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--pulse-accent)]/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--pulse-accent)] uppercase tracking-wider">
                v{CURRENT_VERSION}
              </span>
              <button
                onClick={() => {
                  setShowPanel(false);
                  setVisible(false);
                  localStorage.setItem(LAST_VERSION_KEY, CURRENT_VERSION);
                }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            {WHATS_NEW_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[var(--pulse-accent)] text-xs mt-0.5">-</span>
                <span className="text-xs text-gray-400 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
