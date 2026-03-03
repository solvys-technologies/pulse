import { useCallback, useEffect, useState } from 'react';
import { openClawConversationStorageKey } from '../lib/openclawAgentRouting';

export function usePersistentOpenClawConversation(pulseAgentId: string | undefined | null) {
  const [conversationId, setConversationIdState] = useState<string | undefined>(undefined);

  useEffect(() => {
    const key = openClawConversationStorageKey(pulseAgentId);
    const stored = localStorage.getItem(key) || undefined;
    setConversationIdState(stored);
  }, [pulseAgentId]);

  const setConversationId = useCallback(
    (id: string) => {
      const key = openClawConversationStorageKey(pulseAgentId);
      localStorage.setItem(key, id);
      setConversationIdState(id);
    },
    [pulseAgentId]
  );

  const clearConversationId = useCallback(() => {
    const key = openClawConversationStorageKey(pulseAgentId);
    localStorage.removeItem(key);
    setConversationIdState(undefined);
  }, [pulseAgentId]);

  return { conversationId, setConversationId, clearConversationId };
}

