/**
 * Chat panel for the Ask Harp slide-in overlay.
 * Shares the same persistent OpenClaw conversation as the Analysis tab (ChatInterface).
 */
import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { usePulseAgents } from '../../contexts/PulseAgentContext';
import { usePersistentOpenClawConversation } from '../../hooks/usePersistentOpenClawConversation';
import { toOpenClawAgentOverride } from '../../lib/openclawAgentRouting';
import { useOpenClawChat } from './hooks/useOpenClawChat';
import { PulseChatInput } from './PulseChatInput';

export function AskHarpChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [thinkHarder, setThinkHarder] = useState(false);
  const { activeAgent } = usePulseAgents();

  const openclawAgentOverride = toOpenClawAgentOverride(activeAgent?.id);
  const { conversationId, setConversationId } = usePersistentOpenClawConversation(activeAgent?.id ?? 'default');
  const { messages: rawMessages, sendMessage, status, stop } = useOpenClawChat(
    conversationId,
    setConversationId,
    openclawAgentOverride
  );

  const messages = useMemo(() => {
    return (rawMessages || [])
      .filter((m: { role?: string }) => m.role !== 'system')
      .map((m: { id?: string; role?: string; content?: string; parts?: { type: string; text?: string }[] }) => {
        const text =
          m.content ||
          (Array.isArray(m.parts)
            ? m.parts.filter((p: { type: string }) => p.type === 'text').map((p: { text?: string }) => p.text).join('')
            : '');
        return {
          id: String(m.id),
          role: m.role === 'user' ? 'user' : 'assistant',
          text: String(text || ''),
        } as const;
      });
  }, [rawMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isProcessing = status === 'submitted' || status === 'streaming';

  const handleSend = useCallback(
    async (text: string, images: string[]) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;
      await sendMessage(
        { text: trimmed },
        { body: { conversationId, agentOverride: openclawAgentOverride } }
      );
    },
    [sendMessage, conversationId, openclawAgentOverride, isProcessing]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#070704]">
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
          <div key={msg.id ?? i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
          onStop={stop}
          isProcessing={isProcessing}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          placeholder="Message your analysts..."
          draftKey="pulse_draft_askharp"
        />
      </div>
    </div>
  );
}
