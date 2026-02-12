import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Maximize2 } from 'lucide-react';
import { usePulseAgents } from '../../contexts/PulseAgentContext';
import { PulseChatInput } from './PulseChatInput';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PulseFloatingChatProps {
  visible: boolean;
  onExpandToAnalysis: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PulseFloatingChat({ visible, onExpandToAnalysis }: PulseFloatingChatProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; agent?: string }[]>([]);
  const [thinkHarder, setThinkHarder] = useState(false);
  const { activeAgent } = usePulseAgents();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!visible) return null;

  const handleSend = (text: string, images: string[]) => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: `${activeAgent?.name || 'Harper'}: Acknowledged. Processing your request...`, agent: activeAgent?.name },
    ]);
  };

  /* Collapsed state — 48x48 pill */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed z-[90] flex items-center justify-center rounded-full bg-[#D4AF37] text-black hover:bg-[#C5A030] transition-all shadow-lg hover:shadow-xl"
        style={{ bottom: '24px', right: '24px', width: '48px', height: '48px' }}
        title="Open chat"
      >
        <MessageSquare size={20} />
      </button>
    );
  }

  /* Expanded state — panel */
  return (
    <div
      className="fixed z-[90] flex flex-col rounded-xl border border-[#D4AF37]/20 bg-[#0a0a00] shadow-2xl overflow-hidden"
      style={{ bottom: '24px', right: '24px', width: '380px', height: '560px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D4AF37]/10">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-md bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
            style={{ width: '24px', height: '24px', fontSize: '12px' }}
          >
            {activeAgent?.icon || 'H'}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-white">{activeAgent?.name || 'Harper'}</div>
            <div className="text-[10px] text-gray-500">{activeAgent?.sector || 'Chief Analyst'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setExpanded(false); onExpandToAnalysis(); }}
            className="flex items-center justify-center rounded-md text-gray-500 hover:text-[#D4AF37] transition-colors"
            style={{ width: '28px', height: '28px' }}
            title="Expand to Analysis"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center justify-center rounded-md text-gray-500 hover:text-white transition-colors"
            style={{ width: '28px', height: '28px' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[12px] font-semibold text-white">{activeAgent?.name || 'Harper'}</p>
            <div className="flex items-center gap-1.5">
              <div
                className="w-[12px] h-[12px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#D97757' }}
              >
                <span style={{ fontSize: '5.5px', color: 'white', fontWeight: 800, lineHeight: 1 }}>A</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#D97757' }}>Claude Opus 4.6</span>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg text-[12px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#D4AF37]/15 text-white'
                  : 'bg-[#111108] text-gray-300'
              }`}
              style={{ padding: '8px 12px' }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <PulseChatInput
          onSend={handleSend}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          placeholder="Quick message..."
          draftKey="pulse_draft_floating"
        />
      </div>
    </div>
  );
}
