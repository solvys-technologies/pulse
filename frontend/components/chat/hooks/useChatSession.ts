// [claude-code 2026-03-06] Unified chat session hook wrapping useOpenClawChat + persistence + agent routing + part normalization
import { useCallback, useMemo, useState } from 'react';
import { useOpenClawChat } from './useOpenClawChat';
import { usePersistentOpenClawConversation } from '../../../hooks/usePersistentOpenClawConversation';
import { toOpenClawAgentOverride } from '../../../lib/openclawAgentRouting';
import { normalizeToParts } from '../../../lib/chatMessageNormalizer';
import { SKILL_PREFIXES } from '../../../lib/skillPrefixes';
import type { ChatMessage } from '../types';

export interface UseChatSessionOptions {
  agentId: string;
  activeSkill?: string | null;
}

export function useChatSession({ agentId, activeSkill }: UseChatSessionOptions) {
  const { conversationId, setConversationId, clearConversationId } =
    usePersistentOpenClawConversation(agentId);

  const agentOverride = toOpenClawAgentOverride(agentId);

  const {
    messages: useChatMessages,
    sendMessage,
    status,
    setMessages: setUseChatMessages,
    isLoading: _isLoading,
    setIsStreaming,
    stop: rawStop,
    lastError,
    clearError,
  } = useOpenClawChat(conversationId, setConversationId, agentOverride);

  const [lastSentMessage, setLastSentMessage] = useState('');

  // Normalize raw useChat messages into part-aware ChatMessage[]
  const messages: ChatMessage[] = useMemo(
    () => normalizeToParts(useChatMessages as any[]),
    [useChatMessages]
  );

  const isLoading = status === 'streaming' || status === 'submitted';

  // Find latest thinking content: reasoning parts from last assistant message after last user message
  const latestThinkingContent = useMemo(() => {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'assistant') continue;
      if (i < lastUserIndex) return undefined;
      const reasoning = message.parts
        .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
        .map((p) => p.text)
        .join('\n');
      if (reasoning.trim()) return reasoning.trim();
      return undefined;
    }
    return undefined;
  }, [messages]);

  const hasUserMessages = useMemo(
    () => messages.some((m) => m.role === 'user'),
    [messages]
  );

  const send = useCallback(
    async (text: string, _images?: string[]) => {
      if (!text.trim() || isLoading) return;

      let finalText = text;
      if (activeSkill && SKILL_PREFIXES[activeSkill]) {
        finalText = SKILL_PREFIXES[activeSkill] + '\n\n' + text;
      }

      clearError();
      setLastSentMessage(text);

      try {
        await sendMessage(
          { text: finalText },
          { body: { conversationId } }
        );
      } catch (error) {
        console.error('[useChatSession] Failed to send message:', error);
        setIsStreaming(false);
      }
    },
    [activeSkill, isLoading, conversationId, sendMessage, clearError, setIsStreaming, setLastSentMessage]
  );

  const stop = useCallback(() => {
    rawStop();
    setIsStreaming(false);

    // Remove partial assistant message and add cancelled indicator
    setUseChatMessages((prev: any[]) => {
      const lastMessage = prev[prev.length - 1];

      if (lastMessage && lastMessage.role === 'assistant' && status === 'streaming') {
        const cancelledMessage: any = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'This message was cancelled',
          createdAt: new Date(),
          cancelled: true,
        };
        return [...prev.slice(0, -1), cancelledMessage];
      }

      const lastUserMessage = [...prev].reverse().find((msg: any) => msg.role === 'user');
      if (lastUserMessage) {
        const cancelledMessage: any = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'This message was cancelled',
          createdAt: new Date(),
          cancelled: true,
        };
        return [...prev, cancelledMessage];
      }

      return prev;
    });

    // Restore the last sent message
    if (lastSentMessage) {
      setLastSentMessage('');
    }
  }, [rawStop, setIsStreaming, setUseChatMessages, status, lastSentMessage]);

  const newChat = useCallback(() => {
    setUseChatMessages([]);
    clearConversationId();
  }, [setUseChatMessages, clearConversationId]);

  return {
    messages,
    send,
    stop,
    newChat,
    isLoading,
    latestThinkingContent,
    hasUserMessages,
    lastError,
    clearError,
    conversationId,
    status,
    lastSentMessage,
  };
}
