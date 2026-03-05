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
import { PulseThinkingIndicator } from './PulseThinkingIndicator';
import { normalizeChatMessages } from '../../lib/chatMessageNormalizer';

export function AskHarpChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [thinkHarder, setThinkHarder] = useState(false);
  const { activeAgent } = usePulseAgents();

  const openclawAgentOverride = toOpenClawAgentOverride(activeAgent?.id);
  const { conversationId, setConversationId } = usePersistentOpenClawConversation(activeAgent?.id ?? 'default');
  const { messages: rawMessages, sendMessage, status, stop, lastError, clearError } = useOpenClawChat(
    conversationId,
    setConversationId,
    openclawAgentOverride
  );

  const messages = useMemo(() => {
    return normalizeChatMessages(rawMessages as any[]);
  }, [rawMessages]);

  const latestThinkingContent = useMemo(() => {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'assistant') continue;
      if (i < lastUserIndex) return undefined;
      return message.reasoning.trim() || undefined;
    }
    return undefined;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isProcessing = status === 'submitted' || status === 'streaming';

  const handleSend = useCallback(
    async (text: string, images: string[]) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;
      clearError();
      try {
        await sendMessage(
          { text: trimmed },
          { body: { conversationId, agentOverride: openclawAgentOverride } }
        );
      } catch (error) {
        console.error('AskHarp send failed:', error);
      }
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
        {isProcessing && (
          <PulseThinkingIndicator
            isThinking
            thinkingContent={latestThinkingContent}
            agentName={activeAgent?.name}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        {lastError && (
          <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {lastError}
          </div>
        )}
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
