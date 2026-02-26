import React, { createContext, useContext, useEffect, useState } from 'react';
import { riskFlowPoller, type RiskFlowAlert } from '../lib/riskflow-feed';

interface RiskFlowContextValue {
  alerts: RiskFlowAlert[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

const RiskFlowContext = createContext<RiskFlowContextValue>({
  alerts: [],
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
});

export function RiskFlowProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<RiskFlowAlert[]>([]);

  useEffect(() => {
    riskFlowPoller.start();
    const unsub = riskFlowPoller.subscribe(setAlerts);
    return () => {
      unsub();
      riskFlowPoller.stop();
    };
  }, []);

  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;
  const lowCount = alerts.filter(a => a.severity === 'low').length;

  return (
    <RiskFlowContext.Provider value={{ alerts, highCount, mediumCount, lowCount }}>
      {children}
    </RiskFlowContext.Provider>
  );
}

export function useRiskFlow(): RiskFlowContextValue {
  return useContext(RiskFlowContext);
}
