import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { BoardroomMessage } from '../lib/services';
import { PULSE_AGENTS } from '../contexts/PulseAgentContext';

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
