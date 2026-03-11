// [claude-code 2026-03-11] T5: added /stop command to skills list
import { Globe, ShieldCheck, FileBarChart, GitBranch, Brain, Wrench, Activity, StopCircle, type LucideIcon } from 'lucide-react';

export interface SkillDef {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  keywords: string[];
}

export const SKILLS: readonly SkillDef[] = [
  { id: 'brief', label: 'Brief', icon: Globe, color: '#A78BFA', description: 'Web search, summarize, and interpret for your instrument', keywords: ['brief', 'search', 'news', 'summarize', 'web'] },
  { id: 'validate', label: 'Validate', icon: ShieldCheck, color: '#F59E0B', description: 'Risk validation against narratives, memos, and live news', keywords: ['validate', 'risk', 'check', 'verify', 'horace'] },
  { id: 'report', label: 'Report', icon: FileBarChart, color: '#60A5FA', description: 'Generate HTML dashboard reports in app palette', keywords: ['report', 'dashboard', 'html', 'chart'] },
  { id: 'track', label: 'Track', icon: GitBranch, color: '#34D399', description: 'Start a new narrative thread', keywords: ['track', 'narrative', 'thread', 'thesis'] },
  { id: 'psych_assist', label: 'PsychAssist', icon: Brain, color: '#E879F9', description: 'Psych analysis, performance review, trading activity', keywords: ['psych', 'mental', 'tilt', 'emotion', 'performance'] },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: '#9CA3AF', description: 'Self-update app and changelog', keywords: ['maintenance', 'update', 'changelog', 'fix'] },
  { id: 'quick_pulse', label: 'QuickPulse', icon: Activity, color: 'var(--pulse-accent)', description: 'Chart screenshot analysis: bias, entries, stop, target', keywords: ['quick', 'pulse', 'chart', 'screenshot', 'snap'] },
  { id: 'stop', label: 'Stop', icon: StopCircle, color: '#EF4444', description: 'Cancel the current run immediately', keywords: ['stop', 'cancel', 'abort', 'halt'] },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];

export function filterSkills(query: string): SkillDef[] {
  if (!query) return [...SKILLS];
  const q = query.toLowerCase();
  return SKILLS.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.keywords.some((k) => k.includes(q))
  );
}
