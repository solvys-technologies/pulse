// [claude-code 2026-03-07] assistant-ui runtime hook — wraps useOpenClawChat via useAISDKRuntime
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { useOpenClawChat } from './hooks/useOpenClawChat';
import { usePersistentOpenClawConversation } from '../../hooks/usePersistentOpenClawConversation';
import { toOpenClawAgentOverride } from '../../lib/openclawAgentRouting';

export function useOpenClawRuntime(agentId: string) {
  const { conversationId, setConversationId, clearConversationId } =
    usePersistentOpenClawConversation(agentId);

  const agentOverride = toOpenClawAgentOverride(agentId);
  const chat = useOpenClawChat(conversationId, setConversationId, agentOverride);

  // useAISDKRuntime expects UseChatHelpers shape — add missing fields
  const chatHelpers = {
    ...chat,
    id: agentId,
    error: undefined as Error | undefined,
  };
  const runtime = useAISDKRuntime(chatHelpers);

  return { runtime, conversationId, clearConversationId, lastError: chat.lastError, clearError: chat.clearError };
}
