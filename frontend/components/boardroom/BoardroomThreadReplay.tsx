import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Save, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { BoardroomThread } from '../../lib/boardroomThreadStore';
import { updateMeetingNotes } from '../../lib/boardroomThreadStore';
import { PULSE_AGENTS } from '../../contexts/PulseAgentContext';
import {
  isInterventionMessage,
  isTradeIdeaMessage,
  parseIntervention,
  parseTradeIdea,
} from '../../lib/interventions';

interface BoardroomThreadReplayProps {
  thread: BoardroomThread;
  onBack: () => void;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function BoardroomThreadReplay({ thread, onBack }: BoardroomThreadReplayProps) {
  const [notes, setNotes] = useState(thread.meetingNotes);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotes(thread.meetingNotes);
  }, [thread.id, thread.meetingNotes]);

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateMeetingNotes(thread.id, notes);
    setSaving(false);
  };

  const formattedDate = new Date(thread.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#D4AF37]/15">
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-[#D4AF37]/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{thread.title}</h2>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{thread.messageCount} messages</span>
            <span>·</span>
            <span>{thread.participants.join(', ')}</span>
          </div>
        </div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`p-1.5 rounded transition-colors ${
            showNotes ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'hover:bg-[#D4AF37]/10 text-gray-400'
          }`}
          title="Meeting Notes"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {thread.messages.map((m) => {
            // Render structured intervention messages as special cards
            if (isInterventionMessage(m.content)) {
              const parsed = parseIntervention(m.content);
              if (parsed) {
                const sevStyles: Record<string, { border: string; bg: string; text: string }> = {
                  info: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300' },
                  warning: { border: 'border-orange-500/40', bg: 'bg-orange-500/10', text: 'text-orange-300' },
                  critical: { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-300' },
                };
                const s = sevStyles[parsed.severity] || sevStyles.warning;
                return (
                  <div key={m.id} className={`mx-2 my-2 rounded-lg border-l-4 ${s.border} ${s.bg} px-4 py-3`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className={`w-4 h-4 ${s.text}`} />
                      <span className={`text-xs font-bold tracking-wider uppercase ${s.text}`}>{parsed.type}</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{parsed.agent} · {formatTimestamp(m.timestamp)}</span>
                    </div>
                    <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown>{parsed.body}</ReactMarkdown>
                    </div>
                  </div>
                );
              }
            }

            // Render trade idea messages as special cards
            if (isTradeIdeaMessage(m.content)) {
              const parsed = parseTradeIdea(m.content);
              if (parsed) {
                const DirIcon = parsed.direction === 'long' ? TrendingUp : parsed.direction === 'short' ? TrendingDown : Minus;
                const dirColor = parsed.direction === 'long' ? 'text-emerald-400' : parsed.direction === 'short' ? 'text-red-400' : 'text-yellow-400';
                const borderColor = parsed.direction === 'long' ? 'border-emerald-500/30' : parsed.direction === 'short' ? 'border-red-500/30' : 'border-yellow-500/30';
                const bgColor = parsed.direction === 'long' ? 'bg-emerald-500/5' : parsed.direction === 'short' ? 'bg-red-500/5' : 'bg-yellow-500/5';
                const convBars = { low: 1, medium: 2, high: 3, max: 4 };
                const bars = convBars[parsed.conviction as keyof typeof convBars] || 2;
                return (
                  <div key={m.id} className={`mx-2 my-2 rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
                      <DirIcon className={`w-5 h-5 ${dirColor}`} />
                      <span className="text-sm font-bold text-white">{parsed.instrument}</span>
                      <span className={`text-xs font-semibold uppercase ${dirColor}`}>{parsed.direction}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < bars ? dirColor.replace('text-', 'bg-') : 'bg-gray-700'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">{parsed.agent} · {formatTimestamp(m.timestamp)}</span>
                    </div>
                    {(parsed.entry || parsed.stopLoss || parsed.target) && (
                      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 text-xs">
                        {parsed.entry && <div><span className="text-gray-500">Entry</span> <span className="text-white font-mono">{parsed.entry}</span></div>}
                        {parsed.stopLoss && <div><span className="text-gray-500">Stop</span> <span className="text-red-400 font-mono">{parsed.stopLoss}</span></div>}
                        {parsed.target && <div><span className="text-gray-500">Target</span> <span className="text-emerald-400 font-mono">{parsed.target}</span></div>}
                      </div>
                    )}
                    <div className="px-4 py-2.5 text-sm text-gray-300 prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown>{parsed.thesis}</ReactMarkdown>
                    </div>
                  </div>
                );
              }
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
          })}

          {/* Intervention messages section */}
          {thread.interventionMessages.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-[#D4AF37]/15" />
                <span className="text-[10px] tracking-[0.22em] uppercase text-[#D4AF37]/50">
                  Interventions
                </span>
                <div className="flex-1 h-px bg-[#D4AF37]/15" />
              </div>
              {thread.interventionMessages.map((m) => (
                <div key={m.id} className="flex gap-3 pl-4">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border border-amber-500/30 bg-amber-500/10">
                    <span className="text-amber-400">{m.sender.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-amber-300">{m.sender}</span>
                      <span className="text-[10px] text-gray-500">{formatTimestamp(m.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-300">{m.content}</p>
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Meeting Notes panel */}
        {showNotes && (
          <div className="w-[280px] border-l border-[#D4AF37]/15 flex flex-col bg-[#050500]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#D4AF37]/15">
              <span className="text-[10px] tracking-[0.22em] uppercase text-[#D4AF37]">
                Meeting Notes
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add meeting notes here…"
              className="flex-1 p-3 bg-transparent text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Read-only banner */}
      <div className="px-6 py-2 border-t border-[#D4AF37]/10">
        <p className="text-[10px] tracking-[0.18em] uppercase text-gray-600 text-center">
          Read-only replay · {formattedDate}
        </p>
      </div>
    </div>
  );
}
