import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { riskFlowPoller, type RiskFlowAlert } from '../lib/riskflow-feed';

interface RiskFlowContextValue {
  alerts: RiskFlowAlert[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  clearAll: () => void;
  removeAlert: (id: string) => void;
}

const RiskFlowContext = createContext<RiskFlowContextValue>({
  alerts: [],
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  clearAll: () => {},
  removeAlert: () => {},
});

export function RiskFlowProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<RiskFlowAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    riskFlowPoller.start();
    const unsub = riskFlowPoller.subscribe(setAlerts);
    return () => {
      unsub();
      riskFlowPoller.stop();
    };
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  const highCount = visibleAlerts.filter((a) => a.severity === 'high').length;
  const mediumCount = visibleAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = visibleAlerts.filter((a) => a.severity === 'low').length;

  const clearAll = useCallback(() => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      alerts.forEach((a) => next.add(a.id));
      return next;
    });
  }, [alerts]);

  const removeAlert = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  return (
    <RiskFlowContext.Provider
      value={{
        alerts: visibleAlerts,
        highCount,
        mediumCount,
        lowCount,
        clearAll,
        removeAlert,
      }}
    >
      {children}
    </RiskFlowContext.Provider>
  );
}

export function useRiskFlow(): RiskFlowContextValue {
  return useContext(RiskFlowContext);
}
