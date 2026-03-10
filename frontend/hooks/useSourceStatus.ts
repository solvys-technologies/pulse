// [claude-code 2026-03-10] Source status hook — polls /api/riskflow/sources once on mount
import { useEffect, useState } from 'react';

export interface SourceStatus {
  notion: boolean;
  twitterCli: boolean;
  xApi: boolean;
}

const DEFAULT_STATUS: SourceStatus = { notion: false, twitterCli: false, xApi: false };

export function useSourceStatus(): SourceStatus {
  const [status, setStatus] = useState<SourceStatus>(DEFAULT_STATUS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/riskflow/sources')
      .then((r) => r.json())
      .then((data: SourceStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
