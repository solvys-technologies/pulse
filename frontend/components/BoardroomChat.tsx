import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BoardroomMessage } from '../lib/services';
import { PULSE_AGENTS } from '../contexts/PulseAgentContext';
import {
  isInterventionMessage,
  isTradeIdeaMessage,
  parseIntervention,
  parseTradeIdea,
} from '../lib/interventions';

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Intervention message card                                          */
/* ------------------------------------------------------------------ */
function InterventionCard({ content, timestamp }: { content: string; timestamp: string }) {
  const parsed = parseIntervention(content);
  if (!parsed) return null;

  const severityStyles: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    info: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300', icon: 'ℹ️' },
    warning: { border: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-300', icon: '⚠️' },
    critical: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-300', icon: '🚨' },
  };
  const style = severityStyles[parsed.severity] || severityStyles.warning;

  return (
    <div className={`mx-2 my-2 rounded-lg border-l-4 ${style.border} ${style.bg} px-4 py-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle className={`w-4 h-4 ${style.text}`} />
        <span className={`text-xs font-bold tracking-wider uppercase ${style.text}`}>
          {parsed.type}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">{parsed.agent} · {formatTimestamp(timestamp)}</span>
      </div>
      <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words">
        <ReactMarkdown>{parsed.body}</ReactMarkdown>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trade idea card                                                    */
/* ------------------------------------------------------------------ */
function TradeIdeaCard({ content, timestamp }: { content: string; timestamp: string }) {
  const parsed = parseTradeIdea(content);
  if (!parsed) return null;

  const dirIcon = parsed.direction === 'long' ? TrendingUp : parsed.direction === 'short' ? TrendingDown : Minus;
  const DirIcon = dirIcon;
  const dirColor = parsed.direction === 'long' ? 'text-emerald-400' : parsed.direction === 'short' ? 'text-red-400' : 'text-yellow-400';
  const borderColor = parsed.direction === 'long' ? 'border-emerald-500/30' : parsed.direction === 'short' ? 'border-red-500/30' : 'border-yellow-500/30';
  const bgColor = parsed.direction === 'long' ? 'bg-emerald-500/5' : parsed.direction === 'short' ? 'bg-red-500/5' : 'bg-yellow-500/5';

  const convictionBars = { low: 1, medium: 2, high: 3, max: 4 };
  const bars = convictionBars[parsed.conviction as keyof typeof convictionBars] || 2;

  return (
    <div className={`mx-2 my-2 rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <DirIcon className={`w-5 h-5 ${dirColor}`} />
        <span className="text-sm font-bold text-white">{parsed.instrument}</span>
        <span className={`text-xs font-semibold uppercase ${dirColor}`}>{parsed.direction}</span>
        <div className="flex items-center gap-0.5 ml-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-sm ${i < bars ? dirColor.replace('text-', 'bg-') : 'bg-gray-700'}`}
            />
          ))}
          <span className="text-[10px] text-gray-500 ml-1.5">{parsed.conviction}</span>
        </div>
        <span className="text-[10px] text-gray-500 ml-2">{parsed.agent} · {formatTimestamp(timestamp)}</span>
      </div>

      {/* Key levels */}
      {(parsed.entry || parsed.stopLoss || parsed.target) && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 text-xs">
          {parsed.entry && (
            <div><span className="text-gray-500">Entry</span> <span className="text-white font-mono">{parsed.entry}</span></div>
          )}
          {parsed.stopLoss && (
            <div><span className="text-gray-500">Stop</span> <span className="text-red-400 font-mono">{parsed.stopLoss}</span></div>
          )}
          {parsed.target && (
            <div><span className="text-gray-500">Target</span> <span className="text-emerald-400 font-mono">{parsed.target}</span></div>
          )}
          {parsed.keyLevels && (
            <div className="text-gray-400"><span className="text-gray-500">Levels:</span> {parsed.keyLevels}</div>
          )}
        </div>
      )}

      {/* Thesis */}
      <div className="px-4 py-2.5 text-sm text-gray-300 prose prose-invert prose-sm max-w-none break-words">
        <ReactMarkdown>{parsed.thesis}</ReactMarkdown>
      </div>
    </div>
  );
}

interface BoardroomChatProps {
  messages: BoardroomMessage[];
  loading: boolean;
  active: boolean;
}

export function BoardroomChat({ messages, loading, active }: BoardroomChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Track whether user has scrolled away from bottom
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Status bar — pill with divider, right-justified to sit beside Intervention title */}
      <div className="flex items-center justify-end px-5 py-4">
        <div className="inline-flex items-center border border-[#D4AF37]/25 rounded-full px-2.5 py-1">
          <span
            className={`text-[10px] tracking-[0.22em] uppercase ${
              active ? 'text-emerald-300' : 'text-gray-400'
            }`}
          >
            {active ? 'Online' : 'Offline'}
          </span>
          <div className="mx-2 w-px bg-[#D4AF37]/25" style={{ height: '10px' }} />
          <span className="text-[10px] tracking-[0.18em] uppercase text-gray-500">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Loading boardroom transcript...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-sm font-semibold text-white">Board Room</span>
            <span className="text-xs text-gray-500">
              Agents will post coordination messages here.
            </span>
          </div>
        ) : (
          messages.map((m) => {
            // Render structured intervention messages as special cards
            if (isInterventionMessage(m.content)) {
              return <InterventionCard key={m.id} content={m.content} timestamp={m.timestamp} />;
            }

            // Render trade idea messages as special cards
            if (isTradeIdeaMessage(m.content)) {
              return <TradeIdeaCard key={m.id} content={m.content} timestamp={m.timestamp} />;
            }

            const isUser = m.role === 'user';
            const displayName = isUser ? 'You' : m.agent;
            const initial = isUser ? 'Y' : m.agent.charAt(0);
            const agentData = PULSE_AGENTS.find((a) => a.name === m.agent);
            return (
              <div key={m.id} className="flex gap-3">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                    isUser
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10'
                      : 'border-[#D4AF37]/20 bg-[#0a0a00]'
                  }`}
                >
                  <span className="text-[#D4AF37]">{initial}</span>
                </div>
                <div className={`flex-1 px-1 py-1 min-w-0 border-l-2 ${isUser ? 'border-[#D4AF37]/40' : 'border-[#D4AF37]/20'}`}>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-sm font-semibold ${isUser ? 'text-[#D4AF37]' : 'text-white'}`}>
                      {displayName}
                    </span>
                    {agentData && !isUser && (
                      <span className="text-[10px] text-gray-600">{agentData.sector}</span>
                    )}
                    <span className="text-xs text-gray-500">{formatTimestamp(m.timestamp)}</span>
                  </div>
                  <div className="mt-1.5 text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Read-only notice */}
      <div className="px-6 py-2.5">
        <p className="text-[11px] tracking-[0.18em] uppercase text-gray-500 text-center">
          Read-only — use Intervention to intervene
        </p>
      </div>
    </div>
  );
}
