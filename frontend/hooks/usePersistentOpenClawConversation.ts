import { useCallback, useEffect, useState } from 'react';
import { openClawConversationStorageKey } from '../lib/openclawAgentRouting';

// [claude-code 2026-03-09] Added surfaceId for per-surface session isolation
export function usePersistentOpenClawConversation(
  pulseAgentId: string | undefined | null,
  surfaceId?: string,
) {
  const [conversationId, setConversationIdState] = useState<string | undefined>(undefined);

  useEffect(() => {
    const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
    const stored = localStorage.getItem(key) || undefined;
    setConversationIdState(stored);
  }, [pulseAgentId, surfaceId]);

  const setConversationId = useCallback(
    (id: string) => {
      const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
      localStorage.setItem(key, id);
      setConversationIdState(id);
    },
    [pulseAgentId, surfaceId]
  );

  const clearConversationId = useCallback(() => {
    const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
    localStorage.removeItem(key);
    setConversationIdState(undefined);
  }, [pulseAgentId, surfaceId]);

  return { conversationId, setConversationId, clearConversationId };
}

