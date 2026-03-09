// [claude-code 2026-03-08] Migrated to AssistantRuntimeProvider + PulseThread (same as main ChatInterface)
import { useCallback, useState } from 'react';
import { AssistantRuntimeProvider, useThread, useThreadRuntime } from '@assistant-ui/react';
import { usePulseAgents } from '../../contexts/PulseAgentContext';
import { useOpenClawRuntime } from './useOpenClawRuntime';
import { PulseThread } from './PulseThread';
import { ChatInputArea } from './ChatInputArea';
import { SKILL_PREFIXES } from '../../lib/skillPrefixes';

function AskHarpInner({ lastError }: { lastError: string | null }) {
  const { activeAgent } = usePulseAgents();
  const runtime = useThreadRuntime();
  const isRunning = useThread((t) => t.isRunning);

  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [thinkHarder, setThinkHarder] = useState(false);

  const handleSend = useCallback((msg: string) => {
    let finalText = msg;
    if (activeSkill && SKILL_PREFIXES[activeSkill]) {
      finalText = SKILL_PREFIXES[activeSkill] + '\n\n' + msg;
    }
    runtime.append({ role: 'user', content: [{ type: 'text', text: finalText }] });
  }, [runtime, activeSkill]);

  const handleStop = useCallback(() => runtime.cancelRun(), [runtime]);

  const handleSteer = useCallback((msg: string) => {
    if (!msg.trim()) return;
    runtime.append({ role: 'user', content: [{ type: 'text', text: msg }] });
  }, [runtime]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.07),transparent_38%),#070704]">
      <PulseThread
        onSend={handleSend}
        isLoading={isRunning}
        agentName={activeAgent?.name}
      />
      <div className="bg-[linear-gradient(180deg,rgba(7,7,4,0.2),rgba(7,7,4,0.88))]">
        <ChatInputArea
          onSend={handleSend}
          onStop={handleStop}
          onSteer={handleSteer}
          isLoading={isRunning}
          thinkHarder={thinkHarder}
          setThinkHarder={setThinkHarder}
          lastError={lastError}
          activeSkill={activeSkill}
          onSelectSkill={setActiveSkill}
          showSkills={showSkills}
          onToggleSkills={() => setShowSkills((v) => !v)}
        />
      </div>
    </div>
  );
}

export function AskHarpChatPanel() {
  const { activeAgent } = usePulseAgents();
  const { runtime, lastError } = useOpenClawRuntime(activeAgent?.id ?? 'default');

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskHarpInner lastError={lastError} />
    </AssistantRuntimeProvider>
  );
}
