// [claude-code 2026-03-13] T3: AgentMessage — renders individual boardroom chat messages
import ReactMarkdown from 'react-markdown';

const AGENT_COLORS: Record<string, string> = {
  Harper: '#c79f4a',
  Oracle: '#60a5fa',
  Feucht: '#f59e0b',
  Sentinel: '#10b981',
  Charles: '#ef4444',
  Horace: '#8b5cf6',
};

function formatRelativeTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface AgentMessageProps {
  agent: string;
  emoji: string;
  content: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
}

export function AgentMessage({ agent, emoji, content, timestamp, role }: AgentMessageProps) {
  if (role === 'system') {
    return (
      <div className="flex justify-center py-1.5">
        <span className="text-[11px] italic text-gray-500 max-w-[80%] text-center">
          {content}
        </span>
      </div>
    );
  }

  const isUser = role === 'user';
  const color = AGENT_COLORS[agent] || '#6b7280';

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="max-w-[80%] rounded-xl px-3.5 py-2 pulse-user-bubble text-white">
          <div className="text-sm leading-relaxed">{content}</div>
        </div>
        <span className="text-[10px] text-gray-600 tabular-nums pr-1">
          You · {formatRelativeTime(timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}15` }}
      >
        <span style={{ color }}>{emoji || agent.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold" style={{ color }}>
            {agent}
          </span>
          <span className="text-[10px] text-gray-600 tabular-nums">
            {formatRelativeTime(timestamp)}
          </span>
        </div>
        <div className="mt-1 text-sm text-gray-200 prose prose-invert prose-sm max-w-none break-words">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
