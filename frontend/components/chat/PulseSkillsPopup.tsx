// [claude-code 2026-03-09] Rewrite: imports shared SKILLS, permission-aware dimming
import { X, Lock } from 'lucide-react';
import { SKILLS, type SkillId } from '../../lib/skills';

export { type SkillId, SKILLS };

interface PulseSkillsPopupProps {
  open: boolean;
  onClose: () => void;
  activeSkill?: string | null;
  onSelectSkill?: (id: string | null) => void;
  disabledSkills?: Record<string, { reason: string }>;
}

export function PulseSkillsPopup({ open, onClose, activeSkill, onSelectSkill, disabledSkills }: PulseSkillsPopupProps) {
  if (!open) return null;

  const handleClick = (skillId: string) => {
    if (disabledSkills?.[skillId]) return;
    if (onSelectSkill) {
      onSelectSkill(activeSkill === skillId ? null : skillId);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 w-72 rounded-lg border shadow-xl z-50 overflow-hidden pulse-accent-border" style={{ backgroundColor: 'var(--pulse-surface)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b pulse-accent-border">
        <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Skills</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="py-1">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          const active = activeSkill === skill.id;
          const disabled = disabledSkills?.[skill.id];
          return (
            <button
              key={skill.id}
              onClick={() => handleClick(skill.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 pulse-accent-hover transition-colors ${
                disabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              style={active && !disabled ? { backgroundColor: `${skill.color}15` } : undefined}
              title={disabled ? disabled.reason : skill.description}
            >
              <div className="relative flex-shrink-0">
                {disabled ? (
                  <Lock size={15} className="text-gray-600" />
                ) : (
                  <Icon size={15} style={{ color: active ? skill.color : '#6B7280' }} />
                )}
                {active && !disabled && (
                  <div
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className={`text-[12px] font-medium ${active && !disabled ? 'text-white' : disabled ? 'text-gray-600' : 'text-gray-400'}`}>
                  {skill.label}
                </div>
                <div className="text-[10px] text-gray-600 truncate">
                  {disabled ? disabled.reason : skill.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
