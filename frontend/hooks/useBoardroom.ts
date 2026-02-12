import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackend } from '../lib/backend';
import type { BoardroomMessage, InterventionMessage } from '../lib/services';

const POLL_INTERVAL_MS = 5000;

export function useBoardroom() {
  const backend = useBackend();

  const [messages, setMessages] = useState<BoardroomMessage[]>([]);
  const [interventionMessages, setInterventionMessages] = useState<InterventionMessage[]>([]);
  const [status, setStatus] = useState<{ boardroomActive: boolean; interventionActive: boolean }>({
    boardroomActive: false,
    interventionActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [msgs, intMsgs, st] = await Promise.all([
        backend.boardroom.getMessages(),
        backend.boardroom.getInterventionMessages(),
        backend.boardroom.getStatus(),
      ]);
      if (!mountedRef.current) return;
      setMessages(msgs);
      setInterventionMessages(intMsgs);
      setStatus(st);
    } catch (err) {
      console.error('[useBoardroom] poll failed:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const id = window.setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [fetchAll]);

  const sendIntervention = useCallback(
    async (message: string) => {
      setSending(true);
      try {
        await backend.boardroom.sendIntervention(message);
        // Immediately re-fetch both intervention and boardroom messages (relay writes to both)
        const [intMsgs, msgs] = await Promise.all([
          backend.boardroom.getInterventionMessages(),
          backend.boardroom.getMessages(),
        ]);
        if (mountedRef.current) {
          setInterventionMessages(intMsgs);
          setMessages(msgs);
        }
      } catch (err) {
        console.error('[useBoardroom] send failed:', err);
        throw err;
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [backend],
  );

  const sendMention = useCallback(
    async (message: string, agent: string) => {
      setSending(true);
      try {
        await backend.boardroom.sendMention(message, agent);
        // Re-fetch boardroom messages to show the mention
        const msgs = await backend.boardroom.getMessages();
        if (mountedRef.current) setMessages(msgs);
      } catch (err) {
        console.error('[useBoardroom] mention send failed:', err);
        throw err;
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [backend],
  );

  return { messages, interventionMessages, status, loading, sending, sendIntervention, sendMention, refresh: fetchAll };
}
