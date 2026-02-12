import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { InterventionMessage } from '../lib/services';
import { KNOWN_AGENTS, usePulseAgents } from '../contexts/PulseAgentContext';
import { PulseChatInput } from './chat/PulseChatInput';

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseMention(text: string): { agent: string; body: string } | null {
  const match = text.match(/^@(\w+)\s+([\s\S]+)/);
  if (!match) return null;
  const [, raw, body] = match;
  const agent = KNOWN_AGENTS.find((a) => a.toLowerCase() === raw.toLowerCase());
  return agent ? { agent, body: body.trim() } : null;
}

interface InterventionSidebarProps {
  messages: InterventionMessage[];
  sending: boolean;
  onSend: (message: string) => Promise<void>;
  onMention?: (message: string, agent: string) => Promise<void>;
  active: boolean;
  title?: string;
}

export function InterventionSidebar({ messages, sending, onSend, onMention, active, title = 'Intervention' }: InterventionSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thinkHarder, setThinkHarder] = useState(false);
  const { activeAgent } = usePulseAgents();

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    try {
      const mention = parseMention(trimmed);
      if (mention && onMention) {
        // @mention detected — route to boardroom thread targeting the specific agent
        await onMention(mention.body, mention.agent);
      } else if (activeAgent && activeAgent.name !== 'Harper' && onMention) {
        // Agent selector is set to a non-Harper agent — route as a mention to the boardroom
        await onMention(trimmed, activeAgent.name);
      } else {
        // Default: route to intervention (Harper)
        await onSend(trimmed);
      }
    } catch {
      // error handled upstream
    }
  }, [sending, onSend, onMention, activeAgent]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#070704]">
      {/* Header */}
      <div className="flex items-center px-5 py-4">
        <span className="text-[10px] font-semibold text-[#D4AF37] tracking-[0.18em] uppercase">
          {title}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2">
            <p className="text-sm font-semibold text-white">{activeAgent?.name || 'Harper'}</p>
            <div className="flex items-center gap-1.5">
              <div
                className="w-[13px] h-[13px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#D97757' }}
              >
                <span style={{ fontSize: '6px', color: 'white', fontWeight: 800, lineHeight: 1 }}>A</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: '#D97757' }}>Claude Opus 4.6</span>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">
              Pick an agent below, or type @AgentName
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'User';
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 border-l-2 ${
                    isUser
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40'
                      : 'bg-[#6366f1]/10 border-[#6366f1]/40'
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                        isUser ? 'text-[#D4AF37]' : 'text-[#6366f1]'
                      }`}
                    >
                      {isUser ? 'You' : m.sender}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatTimestamp(m.timestamp)}</span>
                  </div>
                  <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — PulseChatInput with agent selector */}
      <div className="p-3">
        <PulseChatInput
          onSend={(msg) => handleSend(msg)}
          isProcessing={sending}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          placeholder={
            activeAgent && activeAgent.name !== 'Harper'
              ? `Call ${activeAgent.name} to the floor...`
              : 'Message Harper...'
          }
          draftKey="pulse_draft_intervention"
        />
      </div>
    </div>
  );
}
