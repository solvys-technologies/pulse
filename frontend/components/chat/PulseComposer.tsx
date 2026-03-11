// [claude-code 2026-03-11] T5: steer strip removed, queue chips added, always full PromptBox
import { useEffect, useState, useCallback } from 'react';
import { useThread, useThreadRuntime } from '@assistant-ui/react';
import { PromptBox } from '../ui/chatgpt-prompt-input';
import { SKILL_PREFIXES } from '../../lib/skillPrefixes';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { API_BASE_URL } from './constants';

interface PulseComposerProps {
  thinkHarder: boolean;
  setThinkHarder: (v: boolean) => void;
  activeSkill: string | null;
  onSelectSkill: (id: string | null) => void;
  showSkills: boolean;
  onToggleSkills: () => void;
  lastError: string | null;
  disabledSkills?: Record<string, { reason: string }>;
  compact?: boolean;
}

export function PulseComposer({
  thinkHarder,
  setThinkHarder,
  activeSkill,
  onSelectSkill,
  showSkills,
  onToggleSkills,
  lastError,
  disabledSkills: propDisabledSkills,
  compact,
}: PulseComposerProps) {
  const runtime = useThreadRuntime();
  const isRunning = useThread((t) => t.isRunning);
  const [apiDisabledSkills, setApiDisabledSkills] = useState<Record<string, { reason: string }>>({});
  const voice = useVoiceAssistant();

  // Fetch skills from backend — merge with prop-level disabled skills
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/skills`);
        if (!res.ok) return;
        const data = await res.json();
        const disabled: Record<string, { reason: string }> = {};
        for (const skill of data.skills ?? []) {
          if (!skill.enabled) {
            disabled[skill.id] = { reason: skill.reason ?? 'Disabled' };
          }
        }
        if (!cancelled) setApiDisabledSkills(disabled);
      } catch {
        // Skills endpoint not available — use prop defaults
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const mergedDisabledSkills = { ...apiDisabledSkills, ...propDisabledSkills };

  const handleSend = useCallback((msg: string, images?: string[]) => {
    let finalText = msg;
    if (activeSkill && SKILL_PREFIXES[activeSkill]) {
      finalText = SKILL_PREFIXES[activeSkill] + '\n\n' + msg;
    }
    const content: Array<{ type: string; text?: string; image?: string }> = [
      { type: 'text', text: finalText },
    ];
    if (images?.length) {
      images.forEach((img) => content.push({ type: 'image', image: img }));
    }
    try {
      runtime.append({ role: 'user', content: content as any });
    } catch (err) {
      console.error('[PulseComposer] Failed to append message:', err);
    }
  }, [runtime, activeSkill]);

  const handleStop = useCallback(() => {
    runtime.cancelRun();
  }, [runtime]);

  return (
    <PromptBox
      onSend={handleSend}
      onStop={handleStop}
      isProcessing={isRunning}
      thinkHarder={thinkHarder}
      setThinkHarder={setThinkHarder}
      lastError={lastError}
      activeSkill={activeSkill}
      onSelectSkill={onSelectSkill}
      showSkills={showSkills}
      onToggleSkills={onToggleSkills}
      disabledSkills={mergedDisabledSkills}
      compact={compact}
      voiceEnabled={voice.enabled}
      voiceState={voice.runtimeState}
      onToggleVoice={voice.toggleEnabled}
    />
  );
}
