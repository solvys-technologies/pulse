// [claude-code 2026-03-05] Shared severity config extracted from RiskFlowPanel
import type { AlertSeverity } from './riskflow-feed';

export const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; bg: string; text: string; border: string; glow?: string }> = {
  high: {
    label: 'HIGH',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  },
  medium: {
    label: 'MED',
    bg: 'bg-[#D4AF37]/20',
    text: 'text-[#D4AF37]',
    border: 'border-[#D4AF37]/40',
  },
  low: {
    label: 'LOW',
    bg: 'bg-zinc-700/30',
    text: 'text-zinc-500',
    border: 'border-zinc-700/40',
  },
};
