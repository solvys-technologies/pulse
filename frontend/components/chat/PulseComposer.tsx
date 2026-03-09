// [claude-code 2026-03-07] Composer wired to assistant-ui thread runtime — replaces ChatInputArea
import { useEffect, useState } from 'react';
import { useThread, useThreadRuntime } from '@assistant-ui/react';
import { ChatInputArea } from './ChatInputArea';
import { SKILL_PREFIXES } from '../../lib/skillPrefixes';

interface PulseComposerProps {
  thinkHarder: boolean;
  setThinkHarder: (v: boolean) => void;
  activeSkill: string | null;
  onSelectSkill: (id: string | null) => void;
  showSkills: boolean;
  onToggleSkills: () => void;
  lastError: string | null;
}

export function PulseComposer({
  thinkHarder,
  setThinkHarder,
  activeSkill,
  onSelectSkill,
  showSkills,
  onToggleSkills,
  lastError,
}: PulseComposerProps) {
  const runtime = useThreadRuntime();
  const isRunning = useThread((t) => t.isRunning);
  const [queuedSteer, setQueuedSteer] = useState<string | null>(null);

  useEffect(() => {
    if (isRunning || !queuedSteer) return;

    runtime.append({ role: 'user', content: [{ type: 'text', text: queuedSteer }] });
    setQueuedSteer(null);
  }, [isRunning, queuedSteer, runtime]);

  const handleSend = (msg: string) => {
    let finalText = msg;
    if (activeSkill && SKILL_PREFIXES[activeSkill]) {
      finalText = SKILL_PREFIXES[activeSkill] + '\n\n' + msg;
    }
    runtime.append({ role: 'user', content: [{ type: 'text', text: finalText }] });
  };

  const handleStop = () => {
    runtime.cancelRun();
  };

  const handleSteer = (msg: string) => {
    const text = msg.trim();
    if (!text) return;

    // Avoid assistant-ui internal queue edge cases that can blank the thread after timeout.
    // Keep one local queued steer and flush it right after the active run finishes.
    if (isRunning) {
      setQueuedSteer(text);
      return;
    }

    runtime.append({ role: 'user', content: [{ type: 'text', text: text }] });
  };

  return (
    <ChatInputArea
      onSend={handleSend}
      onStop={handleStop}
      onSteer={handleSteer}
      isLoading={isRunning}
      thinkHarder={thinkHarder}
      setThinkHarder={setThinkHarder}
      lastError={lastError}
      activeSkill={activeSkill}
      onSelectSkill={onSelectSkill}
      showSkills={showSkills}
      onToggleSkills={onToggleSkills}
    />
  );
}
