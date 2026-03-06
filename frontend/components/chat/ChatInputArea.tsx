// [claude-code 2026-03-06] Input area wrapper — extracted from ChatInterface
import { PulseChatInput } from './PulseChatInput';
import { PulseSkillsPopup } from './PulseSkillsPopup';
import { SkillBadge } from './SkillBadge';

interface ChatInputAreaProps {
  onSend: (msg: string) => void;
  onStop: () => void;
  isLoading: boolean;
  thinkHarder: boolean;
  setThinkHarder: (v: boolean) => void;
  lastError: string | null;
  activeSkill: string | null;
  onSelectSkill: (id: string | null) => void;
  showSkills: boolean;
  onToggleSkills: () => void;
}

export function ChatInputArea({
  onSend,
  onStop,
  isLoading,
  thinkHarder,
  setThinkHarder,
  lastError,
  activeSkill,
  onSelectSkill,
  showSkills,
  onToggleSkills,
}: ChatInputAreaProps) {
  return (
    <div className="pt-4 pb-4 px-4 bg-[linear-gradient(180deg,rgba(5,5,0,0.15),rgba(5,5,0,0.88))] backdrop-blur-xl border-t border-white/5">
      <div className="relative w-full max-w-3xl mx-auto">
        {activeSkill && (
          <div className="mb-2">
            <SkillBadge skillId={activeSkill} onDismiss={() => onSelectSkill(null)} />
          </div>
        )}
        {showSkills && (
          <PulseSkillsPopup
            open={showSkills}
            onClose={() => onToggleSkills()}
            activeSkill={activeSkill}
            onSelectSkill={onSelectSkill}
          />
        )}
        {lastError && (
          <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {lastError}
          </div>
        )}
        <PulseChatInput
          onSend={(msg) => onSend(msg)}
          onStop={onStop}
          isProcessing={isLoading}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          onOpenSkills={onToggleSkills}
          placeholder="Analyze your performance, the news, or the markets..."
        />
      </div>
    </div>
  );
}
