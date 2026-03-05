import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBackend } from '../lib/backend';
import { openClawConversationStorageKey } from '../lib/openclawAgentRouting';
import type { VoiceRuntimeState } from '../types/voice';

const VOICE_ENABLED_STORAGE_KEY = 'pulse_voice_assistant_enabled:v1';
const HARPER_CONVERSATION_STORAGE_KEY = openClawConversationStorageKey('harper');

interface VoiceSendResult {
  conversationId?: string;
  responseText?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

interface InfractionPromptInput {
  erScore?: number;
  infractionCount?: number;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function useVoiceAssistant() {
  const backend = useBackend();

  const [enabled, setEnabledState] = useState(false);
  const [runtimeState, setRuntimeState] = useState<VoiceRuntimeState>('idle');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastUserText, setLastUserText] = useState('');
  const [lastAssistantText, setLastAssistantText] = useState('');

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(false);
  const busyRef = useRef(false);

  const speechRecognitionSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (typeof (window as any).webkitSpeechRecognition !== 'undefined' ||
        typeof (window as any).SpeechRecognition !== 'undefined'),
    []
  );

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const persistConversationId = useCallback((id: string | null) => {
    setConversationId(id);
    if (id) {
      safeLocalStorageSet(HARPER_CONVERSATION_STORAGE_KEY, id);
    }
  }, []);

  const playAudio = useCallback(async (audioBase64: string, mimeType?: string) => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const source = `data:${mimeType || 'audio/mpeg'};base64,${audioBase64}`;
    await new Promise<void>((resolve) => {
      const audio = new Audio(source);
      audioRef.current = audio;

      const cleanup = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
    });
  }, []);

  const playWithSpeechSynthesis = useCallback(async (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 800));
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const sendText = useCallback(
    async (text: string, mode: 'chat' | 'infraction' = 'chat'): Promise<VoiceSendResult | null> => {
      const prompt = text.trim();
      if (!prompt || busyRef.current) return null;

      busyRef.current = true;
      setLastUserText(prompt);
      setRuntimeState('thinking');

      try {
        const response = (await backend.voice.speak({
          text: prompt,
          mode,
          conversationId: conversationId || undefined,
          includeAudio: true,
          agent: 'harper-cao',
        })) as VoiceSendResult;

        if (response.conversationId) {
          persistConversationId(response.conversationId);
        }

        const assistantText = response.responseText || '';
        setLastAssistantText(assistantText);

        if (assistantText) {
          setRuntimeState('speaking');
          if (response.audioBase64) {
            await playAudio(response.audioBase64, response.audioMimeType);
          } else {
            await playWithSpeechSynthesis(assistantText);
          }
        }

        setRuntimeState(enabledRef.current ? 'listening' : 'idle');
        return response;
      } catch (error) {
        console.error('[VoiceAssistant] Failed to send text:', error);
        setRuntimeState(enabledRef.current ? 'listening' : 'idle');
        return null;
      } finally {
        busyRef.current = false;
      }
    },
    [backend, conversationId, persistConversationId, playAudio, playWithSpeechSynthesis]
  );

  const respondToInfraction = useCallback(
    async ({ erScore, infractionCount }: InfractionPromptInput = {}) => {
      if (!enabledRef.current) return null;
      const scoreText = Number.isFinite(erScore) ? `Current ER score is ${Number(erScore).toFixed(2)}.` : 'Current ER score unavailable.';
      const countText = Number.isFinite(infractionCount)
        ? `Detected infractions in recent window: ${Math.max(0, Number(infractionCount))}.`
        : 'Detected infractions in recent window are unavailable.';
      const prompt = `${scoreText} ${countText} Provide a short de-escalation intervention for the trader with one immediate action and one reminder.`;
      return sendText(prompt, 'infraction');
    },
    [sendText]
  );

  const startRecognition = useCallback(() => {
    if (!enabledRef.current || !speechRecognitionSupported || recognitionRef.current) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (enabledRef.current && !busyRef.current) {
        setRuntimeState('listening');
      }
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) {
          finalText += `${result[0]?.transcript ?? ''} `;
        }
      }

      const trimmed = finalText.trim();
      if (!trimmed) return;

      stopRecognition();
      void sendText(trimmed, 'chat');
    };

    recognition.onerror = () => {
      if (enabledRef.current && !busyRef.current) {
        setRuntimeState('listening');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (!enabledRef.current) {
        setRuntimeState('idle');
        return;
      }

      if (busyRef.current) {
        return;
      }

      window.setTimeout(() => {
        if (enabledRef.current && !busyRef.current) {
          startRecognition();
        }
      }, 220);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendText, speechRecognitionSupported, stopRecognition]);

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      setEnabledState(nextEnabled);
      enabledRef.current = nextEnabled;
      safeLocalStorageSet(VOICE_ENABLED_STORAGE_KEY, nextEnabled ? 'true' : 'false');

      if (!nextEnabled) {
        stopRecognition();
        stopPlayback();
        setRuntimeState('idle');
        return;
      }

      startRecognition();
    },
    [startRecognition, stopPlayback, stopRecognition]
  );

  const toggleEnabled = useCallback(() => {
    setEnabled(!enabledRef.current);
  }, [setEnabled]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const savedEnabled = safeLocalStorageGet(VOICE_ENABLED_STORAGE_KEY) === 'true';
    const savedConversationId = safeLocalStorageGet(HARPER_CONVERSATION_STORAGE_KEY);

    if (savedConversationId) {
      setConversationId(savedConversationId);
    }

    if (savedEnabled) {
      setEnabled(savedEnabled);
    }
  }, [setEnabled]);

  useEffect(() => {
    if (
      enabled &&
      speechRecognitionSupported &&
      runtimeState === 'listening' &&
      !recognitionRef.current &&
      !busyRef.current
    ) {
      startRecognition();
    }
  }, [enabled, runtimeState, speechRecognitionSupported, startRecognition]);

  useEffect(() => {
    return () => {
      stopRecognition();
      stopPlayback();
    };
  }, [stopPlayback, stopRecognition]);

  return {
    enabled,
    runtimeState,
    conversationId,
    lastUserText,
    lastAssistantText,
    isSupported: speechRecognitionSupported,
    setEnabled,
    toggleEnabled,
    sendText,
    respondToInfraction,
  };
}
