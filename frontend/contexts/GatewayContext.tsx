// [claude-code 2026-03-11] Gateway context repurposed for OpenRouter health check (Windows cross-platform)
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useToast } from './ToastContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type GatewayStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface GatewayContextValue {
  status: GatewayStatus;
  lastHealthCheck: string | null;
  reconnect: () => void;
  gatewayUrl: string;
}

const GatewayContext = createContext<GatewayContextValue>({
  status: 'disconnected',
  lastHealthCheck: null,
  reconnect: () => {},
  gatewayUrl: 'https://openrouter.ai/api/v1',
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HEALTH_INTERVAL_MS = 60_000; // 60 seconds (OpenRouter is cloud-hosted, less frequent checks)
const MAX_BACKOFF_MS = 120_000;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GatewayStatus>('connecting');
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  const backoffRef = useRef(2000);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast, dismissToast } = useToast();
  const connectingToastRef = useRef<string | null>(null);

  // For Windows version, gateway is always OpenRouter (no local gateway)
  const gatewayUrl = OPENROUTER_API_URL;

  const checkHealth = useCallback(async () => {
    try {
      // Check if backend API is reachable (which validates OpenRouter connectivity)
      const res = await fetch('http://localhost:8080/health', { signal: AbortSignal.timeout(5000) });
      const contentType = res.headers.get('content-type') || '';
      const looksLikeJson = contentType.includes('application/json');
      if (res.ok && looksLikeJson) {
        const wasDisconnected = status === 'disconnected' || status === 'error' || status === 'connecting';
        setStatus('connected');
        setLastHealthCheck(new Date().toISOString());
        backoffRef.current = 2000;

        if (wasDisconnected) {
          if (connectingToastRef.current) {
            dismissToast(connectingToastRef.current);
            connectingToastRef.current = null;
          }
          if (!sessionStorage.getItem('gateway_connected_shown')) {
            sessionStorage.setItem('gateway_connected_shown', '1');
            addToast('Backend connected', 'success');
          }
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (_err) {
      const wasConnected = status === 'connected';
      setStatus('disconnected');

      if (wasConnected) {
        addToast('Backend disconnected — retrying...', 'error');
      }

      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      retryTimerRef.current = setTimeout(checkHealth, backoffRef.current);
    }
  }, [status, addToast, dismissToast]);

  const reconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setStatus('connecting');
    connectingToastRef.current = addToast('Reconnecting to backend...', 'updating');
    backoffRef.current = 2000;
    checkHealth();
  }, [checkHealth, addToast]);

  useEffect(() => {
    setStatus('connecting');
    backoffRef.current = 2000;
    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GatewayContext.Provider value={{ status, lastHealthCheck, reconnect, gatewayUrl }}>
      {children}
    </GatewayContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export const useGateway = () => useContext(GatewayContext);
