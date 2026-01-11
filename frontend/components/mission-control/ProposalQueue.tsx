import { useState, useEffect, useCallback } from 'react';
import { Zap, Clock, TrendingUp, TrendingDown, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useBackend } from '../../lib/backend';
import { ProposalModal, type TradingProposal } from '../ProposalModal';

interface StoredProposal {
  id: string;
  strategyName: string;
  instrument: string;
  direction: 'long' | 'short' | 'flat';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  positionSize: number;
  riskRewardRatio: number;
  confidenceScore: number;
  rationale: string;
  analystInputs: Record<string, string>;
  timeframe: string;
  setupType: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  MORNING_FLUSH: 'Morning Flush',
  LUNCH_FLUSH: 'Lunch Flush',
  POWER_HOUR_FLUSH: 'Power Hour Flush',
  VIX_FIX_22: 'VIX Fix 22',
  FORTY_FORTY_CLUB: '40/40 Club',
  MOMENTUM: 'Momentum',
  CHARGED_RIPPERS: 'Charged Rippers',
  MEAN_REVERSION: 'Mean Reversion',
  DISCRETIONARY: 'Discretionary',
};

export function ProposalQueue() {
  const backend = useBackend();
  const [proposals, setProposals] = useState<StoredProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<StoredProposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await backend.autopilot.getPendingProposals();
      setProposals(result.proposals || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    fetchProposals();
    // Poll for new proposals every 30 seconds
    const interval = setInterval(fetchProposals, 30000);
    return () => clearInterval(interval);
  }, [fetchProposals]);

  const handleGenerateProposal = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await backend.autopilot.generateProposal();
      if (result.hasProposal) {
        // Refresh the list to show the new proposal
        await fetchProposals();
      } else {
        setError('No trade recommended at this time');
      }
    } catch (err: any) {
      console.error('Failed to generate proposal:', err);
      setError(err.message || 'Failed to generate proposal');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (proposal: TradingProposal) => {
    try {
      await backend.autopilot.acknowledgeProposal(proposal.id, 'approved');
      // Execute the proposal
      const result = await backend.autopilot.executeProposal(proposal.id);
      if (result.success) {
        // Refresh the list
        await fetchProposals();
      }
    } catch (err: any) {
      console.error('Failed to execute proposal:', err);
      setError(err.message || 'Failed to execute proposal');
    }
  };

  const handleReject = async (proposal: TradingProposal) => {
    try {
      await backend.autopilot.acknowledgeProposal(proposal.id, 'rejected');
      // Refresh the list
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to reject proposal:', err);
      setError(err.message || 'Failed to reject proposal');
    }
  };

  const convertToTradingProposal = (stored: StoredProposal): TradingProposal => ({
    id: stored.id,
    tradeRecommended: stored.direction !== 'flat',
    strategyName: stored.strategyName,
    instrument: stored.instrument,
    direction: stored.direction,
    entryPrice: stored.entryPrice,
    stopLoss: stored.stopLoss,
    takeProfit: stored.takeProfit,
    positionSize: stored.positionSize,
    riskRewardRatio: stored.riskRewardRatio,
    confidence: Math.round(stored.confidenceScore * 100),
    rationale: stored.rationale,
    analystInputs: {
      marketData: stored.analystInputs.marketData ?? '',
      sentiment: stored.analystInputs.sentiment ?? '',
      technical: stored.analystInputs.technical ?? '',
      researchConsensus: stored.analystInputs.researchConsensus ?? '',
    },
    timeframe: stored.timeframe,
    setupType: stored.setupType,
    createdAt: stored.createdAt,
  });

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#050500] border border-[#D4AF37]/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-[#D4AF37]">Proposals</h3>
          {proposals.length > 0 && (
            <span className="bg-[#D4AF37] text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
              {proposals.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProposals}
            disabled={isLoading}
            className="p-1.5 hover:bg-zinc-800 rounded transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 mb-3 bg-red-500/10 border border-red-500/30 rounded p-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-zinc-600 text-sm mb-4">No pending proposals</div>
          <button
            onClick={handleGenerateProposal}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#D4AF37] rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Proposal
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((proposal) => (
            <button
              key={proposal.id}
              onClick={() => setSelectedProposal(proposal)}
              className="w-full bg-[#0a0a00] border border-zinc-900 hover:border-[#D4AF37]/40 rounded-lg p-3 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {proposal.direction === 'long' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : proposal.direction === 'short' ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-zinc-400" />
                  )}
                  <span className={`text-sm font-semibold ${
                    proposal.direction === 'long' ? 'text-green-400' : 
                    proposal.direction === 'short' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {proposal.direction.toUpperCase()} {proposal.instrument}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeRemaining(proposal.expiresAt)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  {STRATEGY_LABELS[proposal.strategyName] || proposal.strategyName}
                </span>
                <span className={`font-mono ${
                  proposal.confidenceScore >= 0.7 ? 'text-green-400' :
                  proposal.confidenceScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {Math.round(proposal.confidenceScore * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {lastRefresh && (
        <div className="text-[10px] text-zinc-600 mt-3 text-center">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      {selectedProposal && (
        <ProposalModal
          proposal={convertToTradingProposal(selectedProposal)}
          onClose={() => setSelectedProposal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
