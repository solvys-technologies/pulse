/**
 * useOpenClawChat Hook
 * Simple chat hook for local OpenClaw processing
 */

import { useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { API_BASE_URL } from '../constants.js';

export function useOpenClawChat(
  conversationId: string | undefined,
  setConversationId: (id: string) => void,
  agentOverride?: string
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchFn = useCallback(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    let body = init?.body;
    if (body && conversationId) {
      try {
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
        if (typeof bodyObj === 'object' && bodyObj !== null) {
          bodyObj.conversationId = conversationId;
          body = JSON.stringify(bodyObj);
        }
      } catch {
        // Ignore
      }
    }

    try {
      const response = await fetch(fullUrl, { ...init, headers, body });

      if (!response.ok) {
        let errText = `Chat request failed (${response.status})`;
        try {
          const json = await response.clone().json();
          if (json?.error) errText = String(json.error);
          else if (json?.message) errText = String(json.message);
        } catch {
          // no-op
        }
        setLastError(errText);
      } else {
        setLastError(null);
      }

      const convId = response.headers.get('X-Conversation-Id');
      if (convId) setConversationId(convId);

      return response;
    } catch (error) {
      setLastError('Cannot reach chat backend (expected on localhost:8080).');
      throw error;
    }
  }, [conversationId, setConversationId]);

  const {
    messages: useChatMessages,
    sendMessage,
    status,
    setMessages: setUseChatMessages,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/api/ai/chat`,
      fetch: fetchFn,
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '',
          })),
          ...(conversationId && { conversationId }),
          ...(agentOverride && { agentOverride }),
        },
      }),
    }),
    onFinish: () => setIsStreaming(false),
    onError: (error) => {
      setIsStreaming(false);
      if (!lastError) {
        setLastError(error instanceof Error ? error.message : 'Chat request failed');
      }
    },
  });

  return {
    messages: useChatMessages,
    sendMessage,
    status,
    setMessages: setUseChatMessages,
    isLoading: isStreaming || status === 'streaming' || status === 'submitted',
    setIsStreaming,
    stop,
    lastError,
    clearError: () => setLastError(null),
  };
}
