// [claude-code 2026-03-06] Rewrite: 7 Pulse-native skills, single-select activation with legacy backward compat
import { X, Globe, ShieldCheck, FileBarChart, GitBranch, Brain, Wrench, Activity } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Skills config                                                      */
/* ------------------------------------------------------------------ */

const SKILLS = [
  { id: 'brief', label: 'Brief', icon: Globe, color: '#A78BFA', description: 'Web search, summarize, and interpret for your instrument' },
  { id: 'validate', label: 'Validate', icon: ShieldCheck, color: '#F59E0B', description: 'Risk validation against narratives, memos, and live news' },
  { id: 'report', label: 'Report', icon: FileBarChart, color: '#60A5FA', description: 'Generate HTML dashboard reports in app palette' },
  { id: 'track', label: 'Track', icon: GitBranch, color: '#34D399', description: 'Start a new narrative thread' },
  { id: 'psych_assist', label: 'PsychAssist', icon: Brain, color: '#E879F9', description: 'Psych analysis, performance review, trading activity' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: '#9CA3AF', description: 'Self-update app and changelog' },
  { id: 'quick_pulse', label: 'QuickPulse', icon: Activity, color: '#D4AF37', description: 'Chart screenshot → bias, entries, stop, target' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];
export { SKILLS };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface PulseSkillsPopupProps {
  open: boolean;
  onClose: () => void;
  // New single-select API
  activeSkill?: string | null;
  onSelectSkill?: (id: string | null) => void;
  // Legacy multi-select API (deprecated, for backward compat)
  activeSkills?: Set<SkillId>;
  onToggle?: (id: SkillId) => void;
}

export function PulseSkillsPopup({ open, onClose, activeSkill, onSelectSkill, activeSkills, onToggle }: PulseSkillsPopupProps) {
  if (!open) return null;

  const isLegacy = !onSelectSkill && onToggle;

  const isActive = (skillId: SkillId): boolean => {
    if (isLegacy && activeSkills) {
      return activeSkills.has(skillId);
    }
    return activeSkill === skillId;
  };

  const handleClick = (skillId: SkillId) => {
    if (isLegacy && onToggle) {
      onToggle(skillId);
      return;
    }
    if (onSelectSkill) {
      onSelectSkill(activeSkill === skillId ? null : skillId);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 w-72 rounded-lg border border-[#D4AF37]/20 bg-[#0a0a00] shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#D4AF37]/10">
        <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Skills</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="py-1">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          const active = isActive(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => handleClick(skill.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#D4AF37]/5 transition-colors"
              style={active ? { backgroundColor: `${skill.color}15` } : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={15} style={{ color: active ? skill.color : '#6B7280' }} />
                {active && (
                  <div
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className={`text-[12px] font-medium ${active ? 'text-white' : 'text-gray-400'}`}>
                  {skill.label}
                </div>
                <div className="text-[10px] text-gray-600 truncate">{skill.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
