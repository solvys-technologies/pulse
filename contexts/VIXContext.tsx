import React, { createContext, useContext, useEffect, useState } from 'react';
import { vixFeed, type VIXData } from '../lib/vix-feed';

interface VIXContextValue {
  data: VIXData | null;
}

const VIXContext = createContext<VIXContextValue>({ data: null });

export function VIXProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<VIXData | null>(vixFeed.current);

  useEffect(() => {
    vixFeed.start();
    const unsub = vixFeed.subscribe(setData);
    return () => {
      unsub();
      vixFeed.stop();
    };
  }, []);

  return <VIXContext.Provider value={{ data }}>{children}</VIXContext.Provider>;
}

export function useVIX() {
  return useContext(VIXContext);
}
