import { useState, useEffect } from 'react';
import { useBackend } from '../../lib/backend';
import { useSettings } from '../../contexts/SettingsContext';
import { ProposalModal, MOCK_PROPOSAL, type TradingProposal } from '../ProposalModal';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import type { RiskFlowItem } from '../../types/api';

// Track last seen news item ID to count unread items (per session)
let lastSeenNewsId: number | null = null;

export function MinimalTapeWidget() {
  const backend = useBackend();
  const { developerSettings, autoPilotSettings } = useSettings();
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [activeProposal, setActiveProposal] = useState<TradingProposal | null>(null);
  const [pendingProposals, setPendingProposals] = useState<TradingProposal[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await backend.riskflow.list({ limit: 20 });
        setTotalItems(response.items.length);

        // Calculate unread count
        if (response.items.length > 0) {
          const latestId = typeof response.items[0].id === 'number' ? response.items[0].id : parseInt(response.items[0].id.toString());
          if (lastSeenNewsId === null) {
            lastSeenNewsId = latestId;
            setUnreadCount(0);
          } else {
            const unread = response.items.filter((item: RiskFlowItem) => {
              const itemId = typeof item.id === 'number' ? item.id : parseInt(item.id.toString());
              return itemId > lastSeenNewsId!;
            }).length;
            setUnreadCount(unread);
          }
        }
      } catch (err) {
        console.error('Failed to fetch news for Minimal Tape Widget:', err);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 30000);
    return () => clearInterval(interval);
  }, [backend]);

  const handleTriggerMockProposal = () => {
    const proposal = { ...MOCK_PROPOSAL, id: `mock-${Date.now()}` };
    setPendingProposals(prev => [...prev, proposal]);
    setActiveProposal(proposal);
  };

  const handleCloseProposal = () => {
    setActiveProposal(null);
  };

  const handleApproveProposal = (proposal: TradingProposal) => {
    console.log('[Tape] Proposal approved:', proposal);
    setPendingProposals(prev => prev.filter(p => p.id !== proposal.id));
    // TODO: Execute trade via backend
  };

  const handleRejectProposal = (proposal: TradingProposal) => {
    console.log('[Tape] Proposal rejected:', proposal);
    setPendingProposals(prev => prev.filter(p => p.id !== proposal.id));
  };

  const latestProposal = pendingProposals[0];
  const isAutoPilotActive = autoPilotSettings.mode !== 'off';

  return (
    <>
      <div className="flex flex-col gap-2 p-2 bg-[#0a0a00] border border-[#D4AF37]/20 rounded w-full">
        <div className="text-center">
          <span className="text-[10px] font-semibold text-[#D4AF37]">Tape</span>
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="text-center">
            <div className="text-xs text-gray-400">{totalItems} items</div>
            {unreadCount > 0 && (
              <div className="mt-1 backdrop-blur-sm bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded px-2 py-0.5 inline-block">
                <span className="text-[10px] font-mono text-[#D4AF37]">{unreadCount} new</span>
              </div>
            )}
          </div>

          {/* AutoPilot Status */}
          {isAutoPilotActive && (
            <div className={`text-[10px] px-2 py-0.5 rounded ${
              autoPilotSettings.mode === 'autonomous' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {autoPilotSettings.mode === 'autonomous' ? '⚡ AUTO' : '🤖 SEMI'}
            </div>
          )}

          {/* Pending Proposal Notification */}
          {latestProposal && (
            <button
              onClick={() => setActiveProposal(latestProposal)}
              className="w-full mt-2 p-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-all animate-pulse"
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-3 h-3 text-[#D4AF37]" />
                <span className="text-[10px] font-semibold text-[#D4AF37]">PROPOSAL</span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {latestProposal.direction === 'long' ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : latestProposal.direction === 'short' ? (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                ) : null}
                <span className={`text-[10px] font-mono ${
                  latestProposal.direction === 'long' ? 'text-green-400' : 
                  latestProposal.direction === 'short' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {latestProposal.direction.toUpperCase()} {latestProposal.instrument}
                </span>
              </div>
            </button>
          )}

          {/* Dev: Mock Proposal Trigger */}
          {developerSettings.showMockProposal && (
            <button
              onClick={handleTriggerMockProposal}
              className="mt-2 w-full px-2 py-1.5 text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-500/30 transition-all"
            >
              🧪 Trigger Mock Proposal
            </button>
          )}
        </div>
      </div>

      {/* Proposal Modal */}
      {activeProposal && (
        <ProposalModal
          proposal={activeProposal}
          onClose={handleCloseProposal}
          onApprove={handleApproveProposal}
          onReject={handleRejectProposal}
        />
      )}
    </>
  );
}
