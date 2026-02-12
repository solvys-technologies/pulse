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
  gatewayUrl: 'http://localhost:8878',
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GATEWAY_URL = 'http://localhost:8878';
const HEALTH_INTERVAL_MS = 30_000; // 30 seconds
const MAX_BACKOFF_MS = 60_000;

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

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const wasDisconnected = status === 'disconnected' || status === 'error' || status === 'connecting';
        setStatus('connected');
        setLastHealthCheck(new Date().toISOString());
        backoffRef.current = 2000; // reset backoff

        if (wasDisconnected) {
          // Dismiss any lingering connecting toast
          if (connectingToastRef.current) {
            dismissToast(connectingToastRef.current);
            connectingToastRef.current = null;
          }
          addToast('Gateway connected', 'success');
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      const wasConnected = status === 'connected';
      setStatus('disconnected');

      if (wasConnected) {
        addToast('Gateway disconnected — retrying...', 'error');
      }

      // Exponential backoff retry
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      retryTimerRef.current = setTimeout(checkHealth, backoffRef.current);
    }
  }, [status, addToast, dismissToast]);

  const reconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setStatus('connecting');
    connectingToastRef.current = addToast('Reconnecting to gateway...', 'updating');
    backoffRef.current = 2000;
    checkHealth();
  }, [checkHealth, addToast]);

  // Initial connection + periodic health checks
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GatewayContext.Provider value={{ status, lastHealthCheck, reconnect, gatewayUrl: GATEWAY_URL }}>
      {children}
    </GatewayContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export const useGateway = () => useContext(GatewayContext);
