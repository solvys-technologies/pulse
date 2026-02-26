import { useState } from 'react';
import { X, Globe, BarChart3, BookOpen, Code, Monitor } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Skills config                                                      */
/* ------------------------------------------------------------------ */

const SKILLS = [
  { id: 'web_search', label: 'Web Search', icon: Globe, color: '#A78BFA', description: 'Search the web for real-time information' },
  { id: 'market_scanner', label: 'Market Scanner', icon: BarChart3, color: '#D4AF37', description: 'Scan instruments, levels, and flows' },
  { id: 'research', label: 'Research', icon: BookOpen, color: '#60A5FA', description: 'Deep dive into reports and filings' },
  { id: 'code_exec', label: 'Code Execution', icon: Code, color: '#34D399', description: 'Run Python or JS for analysis' },
  { id: 'browser', label: 'Browser', icon: Monitor, color: '#F59E0B', description: 'Browse and interact with web pages' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface PulseSkillsPopupProps {
  open: boolean;
  onClose: () => void;
  activeSkills: Set<SkillId>;
  onToggle: (id: SkillId) => void;
}

export function PulseSkillsPopup({ open, onClose, activeSkills, onToggle }: PulseSkillsPopupProps) {
  if (!open) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 w-64 rounded-lg border border-[#D4AF37]/20 bg-[#0a0a00] shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#D4AF37]/10">
        <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Skills</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="py-1">
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          const active = activeSkills.has(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => onToggle(skill.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#D4AF37]/5 transition-colors"
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
