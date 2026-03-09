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

    // Attach GitHub OAuth token for GitHub Models (DeepSeek R1)
    const ghToken = localStorage.getItem('github_token');
    if (ghToken) headers.set('X-GitHub-Token', ghToken);

    let body = init?.body;
    if (body && conversationId) {
      try {
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
        if (typeof bodyObj === 'object' && bodyObj !== null) {
          bodyObj.conversationId = conversationId;
          body = JSON.stringify(bodyObj);
        }
      } catch (e) {
        console.warn('[useOpenClawChat] Could not inject conversationId:', e);
      }
    }

    // [claude-code 2026-03-09] Added 65s frontend timeout + throw on error response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65_000);

    try {
      const response = await fetch(fullUrl, { ...init, headers, body, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errText = `Chat request failed (${response.status})`;
        try {
          const json = await response.clone().json();
          if (json?.error) errText = String(json.error);
          else if (json?.message) errText = String(json.message);
        } catch { /* response may not be JSON */ }
        setLastError(errText);
        throw new Error(errText);
      }

      setLastError(null);
      const convId = response.headers.get('X-Conversation-Id');
      if (convId) setConversationId(convId);

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setLastError('Request timed out — please try again.');
        throw error;
      }
      if (!(error instanceof Error) || !error.message.startsWith('Chat request failed')) {
        setLastError('Cannot reach chat backend (expected on localhost:8080).');
      }
      throw error;
    }
  }, [conversationId, setConversationId]);

  const {
    messages: useChatMessages,
    sendMessage,
    status,
    setMessages: setUseChatMessages,
    stop,
    regenerate,
    resumeStream,
    addToolResult,
    addToolOutput,
    addToolApprovalResponse,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/api/ai/chat`,
      fetch: fetchFn,
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages: messages.map((msg) => {
            const parts = msg.parts ?? [];
            const hasImages = parts.some((p: any) => p.type === 'image');
            if (hasImages) {
              const contentParts = parts
                .filter((p: any) => p.type === 'text' || p.type === 'image')
                .map((p: any) =>
                  p.type === 'text'
                    ? { type: 'text' as const, text: p.text }
                    : { type: 'image_url' as const, image_url: { url: p.image } }
                );
              return { role: msg.role, content: contentParts };
            }
            return {
              role: msg.role,
              content: parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '',
            };
          }),
          ...(conversationId && { conversationId }),
          ...(agentOverride && { agentOverride }),
        },
      }),
    }),
    onFinish: () => setIsStreaming(false),
    onError: (error) => {
      setIsStreaming(false);
      if (!lastError) {
        const msg = error instanceof Error ? error.message : 'Chat request failed';
        // Replace browser-level network errors with a friendlier message
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          setLastError('Backend unavailable — start it with `cd backend-hono && npm run dev`');
        } else {
          setLastError(msg);
        }
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
    regenerate,
    resumeStream,
    addToolResult,
    addToolOutput,
    addToolApprovalResponse,
    lastError,
    clearError: () => setLastError(null),
  };
}
