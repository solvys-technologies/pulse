// [claude-code 2026-03-13] T3: BoardroomChat — full-height agent chat panel with polling, @mentions, live status
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { useBoardroom } from '../../hooks/useBoardroom';
import { KNOWN_AGENTS } from '../../contexts/PulseAgentContext';
import { AgentMessage } from './AgentMessage';
import type { BoardroomMessage } from '../../lib/services';

type MeetingSchedule = {
  lastMeeting: string;
  nextMeeting: string;
  live: boolean;
};

const AGENT_COLORS: Record<string, string> = {
  Harper: '#c79f4a',
  Oracle: '#60a5fa',
  Feucht: '#f59e0b',
  Sentinel: '#10b981',
  Charles: '#ef4444',
  Horace: '#8b5cf6',
};

function parseMention(text: string): { agent: string; body: string } | null {
  const match = text.match(/^@(\w+)\s+([\s\S]+)/);
  if (!match) return null;
  const [, raw, body] = match;
  const agent = KNOWN_AGENTS.find((a) => a.toLowerCase() === raw.toLowerCase());
  return agent ? { agent, body: body.trim() } : null;
}

function formatCountdown(isoStr: string): string {
  const diff = new Date(isoStr).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function BoardroomChat() {
  const {
    messages,
    interventionMessages,
    status,
    sending,
    sendIntervention,
    sendMention,
  } = useBoardroom();

  const [input, setInput] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [schedule, setSchedule] = useState<MeetingSchedule | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Tick for countdown
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch meeting schedule
  useEffect(() => {
    let cancelled = false;
    const fetchSchedule = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/boardroom/meeting-schedule`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setSchedule({
            lastMeeting: json.lastMeetingIso || json.lastMeeting || '',
            nextMeeting: json.nextMeetingIso || json.nextMeeting || '',
            live: json.live ?? false,
          });
        }
      } catch { /* best-effort */ }
    };
    fetchSchedule();
    const id = setInterval(fetchSchedule, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interventionMessages, autoScroll]);

  // Detect manual scroll-up to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
  }, []);

  // Merge and sort all messages chronologically
  const allMessages = useMemo(() => {
    const merged: (BoardroomMessage & { _source: 'boardroom' | 'intervention' })[] = [];

    for (const m of messages) {
      merged.push({ ...m, _source: 'boardroom' });
    }

    // Map intervention messages to BoardroomMessage shape
    for (const im of interventionMessages) {
      const alreadyInBoardroom = messages.some(
        (bm) => bm.content === im.content && bm.timestamp === im.timestamp,
      );
      if (!alreadyInBoardroom) {
        merged.push({
          id: im.id,
          agent: im.sender === 'User' ? 'You' : (im.sender as any),
          emoji: '',
          content: im.content,
          timestamp: im.timestamp,
          role: im.sender === 'User' ? 'user' : 'assistant',
          _source: 'intervention',
        });
      }
    }

    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return merged;
  }, [messages, interventionMessages]);

  // Mention dropdown logic
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setMentionFilter(atMatch[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  }, []);

  const filteredAgents = useMemo(
    () => KNOWN_AGENTS.filter((a) => a.toLowerCase().startsWith(mentionFilter)),
    [mentionFilter],
  );

  const insertMention = useCallback((agent: string) => {
    setInput((prev) => prev.replace(/@\w*$/, `@${agent} `));
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setInput('');

    const mention = parseMention(trimmed);
    if (mention) {
      await sendMention(mention.body, mention.agent);
    } else {
      await sendIntervention(trimmed);
    }
  }, [input, sending, sendIntervention, sendMention]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
      }
    },
    [handleSend],
  );

  const isLive = schedule?.live ?? status.boardroomActive;

  return (
    <div className="flex h-full flex-col bg-[#070704]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--pulse-accent)]/10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--pulse-accent)]">
            Agent Chat
          </span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] tracking-[0.18em] uppercase text-gray-500 border border-gray-700 rounded-full px-2.5 py-0.5">
              Inactive
            </span>
          )}
        </div>
        {schedule?.nextMeeting && !isLive && (
          <span className="text-[10px] text-gray-500 tabular-nums">
            Next: {formatCountdown(schedule.nextMeeting)}
          </span>
        )}
      </div>

      {/* Agent color legend */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--pulse-accent)]/5 overflow-x-auto">
        {Object.entries(AGENT_COLORS).map(([name, color]) => (
          <button
            key={name}
            onClick={() => {
              setInput((prev) => {
                const cleaned = prev.replace(/@\w*$/, '');
                return `${cleaned}@${name} `;
              });
              inputRef.current?.focus();
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors shrink-0"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-400">{name}</span>
          </button>
        ))}
      </div>

      {/* Message feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-sm text-gray-500">No boardroom messages yet</span>
            <span className="text-[10px] text-gray-600">
              Messages appear here when the boardroom is active
            </span>
          </div>
        ) : (
          allMessages.map((m) => (
            <AgentMessage
              key={m.id}
              agent={m.agent}
              emoji={m.emoji}
              content={m.content}
              timestamp={m.timestamp}
              role={m.role}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom indicator */}
      {!autoScroll && (
        <div className="flex justify-center -mt-8 relative z-10 pointer-events-none">
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              setAutoScroll(true);
            }}
            className="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--pulse-surface)] border border-[var(--pulse-accent)]/20 text-[10px] text-gray-400 hover:text-white transition-colors shadow-lg"
          >
            <ChevronDown className="w-3 h-3" />
            New messages
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="relative px-4 py-3 border-t border-[var(--pulse-accent)]/10">
        {/* Mention dropdown */}
        {showMentionDropdown && filteredAgents.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 rounded-lg border border-[var(--pulse-accent)]/20 bg-[var(--pulse-surface)] shadow-xl overflow-hidden z-20">
            {filteredAgents.map((agent) => (
              <button
                key={agent}
                onClick={() => insertMention(agent)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--pulse-accent)]/10 transition-colors text-left"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: AGENT_COLORS[agent] || '#6b7280' }}
                />
                <span className="text-sm text-gray-200">@{agent}</span>
                <span className="text-[10px] text-gray-500 ml-auto">
                  {agent === 'Harper' ? 'Chief Analyst' :
                   agent === 'Oracle' ? 'Macro Intelligence' :
                   agent === 'Feucht' ? 'Volatility' :
                   agent === 'Sentinel' ? 'Risk Management' :
                   agent === 'Charles' ? 'Execution' :
                   agent === 'Horace' ? 'Sentiment' : ''}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message boardroom... (@agent to mention)"
            className="flex-1 bg-black/40 border border-[var(--pulse-accent)]/15 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[var(--pulse-accent)]/40 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2 rounded-lg bg-[var(--pulse-accent)]/15 text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
