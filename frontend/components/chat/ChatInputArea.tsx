// [claude-code 2026-03-09] Input area wrapper — images, attach panel, slash picker
import { useState, useCallback } from 'react';
import { PulseChatInput } from './PulseChatInput';
import { PulseSkillsPopup } from './PulseSkillsPopup';
import { PulseAttachPopup } from './PulseAttachPopup';
import { SkillBadge } from './SkillBadge';

interface ChatInputAreaProps {
  onSend: (msg: string, images?: string[]) => void;
  onStop: () => void;
  onSteer?: (msg: string) => void;
  isLoading: boolean;
  thinkHarder: boolean;
  setThinkHarder: (v: boolean) => void;
  lastError: string | null;
  activeSkill: string | null;
  onSelectSkill: (id: string | null) => void;
  showSkills: boolean;
  onToggleSkills: () => void;
  onAttachImage?: (dataUrl: string) => void;
}

export function ChatInputArea({
  onSend,
  onStop,
  onSteer,
  isLoading,
  thinkHarder,
  setThinkHarder,
  lastError,
  activeSkill,
  onSelectSkill,
  showSkills,
  onToggleSkills,
  onAttachImage,
}: ChatInputAreaProps) {
  const [showAttach, setShowAttach] = useState(false);

  const handleAttachImage = useCallback((dataUrl: string) => {
    onAttachImage?.(dataUrl);
  }, [onAttachImage]);

  return (
    <div className="pt-4 pb-4 px-4 bg-[linear-gradient(180deg,rgba(5,5,0,0.15),rgba(5,5,0,0.88))] backdrop-blur-xl">
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
        {/* Slide-up attach panel — anchored above input */}
        <PulseAttachPopup
          open={showAttach}
          onClose={() => setShowAttach(false)}
          onAttachImage={handleAttachImage}
        />
        <PulseChatInput
          onSend={(msg, imgs) => onSend(msg, imgs)}
          onStop={onStop}
          onSteer={onSteer}
          isProcessing={isLoading}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          onOpenAttach={() => setShowAttach((v) => !v)}
          onOpenSkills={onToggleSkills}
          placeholder="Analyze your performance, the news, or the markets..."
        />
      </div>
    </div>
  );
}
