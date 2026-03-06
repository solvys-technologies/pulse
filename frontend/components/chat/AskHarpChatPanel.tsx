// [claude-code 2026-03-06] Refactored to use useChatSession + ChatMessageBubble
import { useRef, useEffect, useState } from 'react';
import { usePulseAgents } from '../../contexts/PulseAgentContext';
import { useChatSession } from './hooks/useChatSession';
import { PulseChatInput } from './PulseChatInput';
import { PulseThinkingIndicator } from './PulseThinkingIndicator';
import { ChatMessageBubble } from './ChatMessageBubble';

export function AskHarpChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [thinkHarder, setThinkHarder] = useState(false);
  const { activeAgent } = usePulseAgents();

  const { messages, send, stop, isLoading, latestThinkingContent, lastError, clearError } =
    useChatSession({ agentId: activeAgent?.id ?? 'default' });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    clearError();
    send(trimmed);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.07),transparent_38%),#070704]">
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
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        {(isLoading || !!latestThinkingContent) && (
          <PulseThinkingIndicator
            isThinking
            thinkingContent={latestThinkingContent}
            agentName={activeAgent?.name}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 border-t border-white/5 bg-[linear-gradient(180deg,rgba(7,7,4,0.2),rgba(7,7,4,0.88))]">
        {lastError && (
          <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {lastError}
          </div>
        )}
        <PulseChatInput
          onSend={handleSend}
          onStop={stop}
          isProcessing={isLoading}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          placeholder="Message your analysts..."
          draftKey="pulse_draft_askharp"
        />
      </div>
    </div>
  );
}
