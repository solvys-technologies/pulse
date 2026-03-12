// [claude-code 2026-03-11] T2e: persistent thread support from Gateway settings
import { useCallback, useEffect, useState } from 'react';
import { openClawConversationStorageKey } from '../lib/openclawAgentRouting';

// [claude-code 2026-03-09] Added surfaceId for per-surface session isolation
export function usePersistentOpenClawConversation(
  pulseAgentId: string | undefined | null,
  surfaceId?: string,
) {
  const [conversationId, setConversationIdState] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check if persistent thread is enabled in Gateway settings
    const persistentEnabled = localStorage.getItem('pulse_gateway_persistent_thread_enabled') === 'true';
    const persistentId = localStorage.getItem('pulse_gateway_persistent_thread_id');

    if (persistentEnabled && persistentId) {
      setConversationIdState(persistentId);
      return;
    }

    const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
    const stored = localStorage.getItem(key) || undefined;
    setConversationIdState(stored);
  }, [pulseAgentId, surfaceId]);

  const setConversationId = useCallback(
    (id: string) => {
      const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
      localStorage.setItem(key, id);

      // Also update persistent thread ID if persistent mode is enabled
      const persistentEnabled = localStorage.getItem('pulse_gateway_persistent_thread_enabled') === 'true';
      if (persistentEnabled) {
        localStorage.setItem('pulse_gateway_persistent_thread_id', id);
      }

      setConversationIdState(id);
    },
    [pulseAgentId, surfaceId]
  );

  const clearConversationId = useCallback(() => {
    // Only clear the per-agent key, not the persistent thread
    const key = openClawConversationStorageKey(pulseAgentId, surfaceId);
    localStorage.removeItem(key);
    setConversationIdState(undefined);
  }, [pulseAgentId, surfaceId]);

  return { conversationId, setConversationId, clearConversationId };
}

