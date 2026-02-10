export interface ExecutiveKpi {
  label: string;
  value: string;
  meta: string;
}

export interface ExecutiveAlert {
  title: string;
  detail: string;
}

export interface ExecutiveAgentHealth {
  name: string;
  status: string;
  lastCheckin: string;
}

export interface ExecutiveBriefItem {
  title: string;
  detail: string;
}

export interface ExecutiveScheduleItem {
  title: string;
  detail: string;
}

export const executiveKpis: ExecutiveKpi[] = [
  { label: 'Net Exposure', value: '42%', meta: '+6% WoW · Within guardrails' },
  { label: 'Gross Leverage', value: '1.8x', meta: 'Stable · Limit 2.2x' },
  { label: 'Intraday PnL', value: '+$480k', meta: 'Momentum aligned' },
  { label: 'Risk Mode', value: 'Selective', meta: 'Risk budget 68%' },
];

export const executiveAlerts: ExecutiveAlert[] = [
  {
    title: 'CPI head fake detected',
    detail: 'Macro agent suggests trimming beta into 10:00 data release.',
  },
  {
    title: 'PMA-2 throttle request',
    detail: 'Volatility band widened; awaiting H.E. approval.',
  },
  {
    title: 'Energy block alert',
    detail: 'Crude inventory anomaly + options sweep in CL 86C.',
  },
];

export const executiveAgentHealth: ExecutiveAgentHealth[] = [
  { name: 'Harper / CAO', status: 'Operational', lastCheckin: '2 min ago' },
  { name: 'PMA-1', status: 'Monitoring', lastCheckin: '6 min ago' },
  { name: 'PMA-2', status: 'Awaiting Approval', lastCheckin: '1 min ago' },
  { name: 'Futures Desk', status: 'Hedging', lastCheckin: '4 min ago' },
];

export const executiveNeedToKnow: ExecutiveBriefItem[] = [
  {
    title: 'Liquidity depth favors range expansion',
    detail: 'Watch 12:30 re-open; keep stops 5 pts beyond extremes.',
  },
  { title: 'RiskFlow bias: defensive', detail: 'Reduce duration in rate-sensitive book.' },
  { title: 'Research memo: AI infra pricing', detail: 'Comp stack suggests margin compression in Q2.' },
];

export const executiveSchedule: ExecutiveScheduleItem[] = [
  { title: '09:30 NY Open', detail: 'Harper sets session bias' },
  { title: '10:00 CPI Print', detail: 'Risk pause window' },
  { title: '14:15 RiskFlow Sync', detail: 'Executive checkpoint' },
];

