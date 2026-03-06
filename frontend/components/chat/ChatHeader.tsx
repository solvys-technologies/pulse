// [claude-code 2026-03-06] Top button bar — extracted from ChatInterface
import { CalendarCheck } from 'lucide-react';

interface ChatHeaderProps {
  onRunNTN: () => void;
  onNewChat: () => void;
  onToggleCheckpoints: () => void;
  showCheckpoints: boolean;
  isLoading: boolean;
}

export function ChatHeader({ onRunNTN, onNewChat, onToggleCheckpoints, showCheckpoints, isLoading }: ChatHeaderProps) {
  return (
    <div className="bg-transparent">
      <div className="h-14 flex items-center justify-end px-6 mt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onRunNTN}
            disabled={isLoading}
            className="px-3 py-1.5 hover:bg-[#D4AF37]/10 disabled:opacity-50 rounded text-[13px] text-zinc-400 hover:text-[#D4AF37] transition-all whitespace-nowrap"
          >
            Run NTN Report
          </button>
          <button
            onClick={onNewChat}
            className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors"
          >
            New Chat
          </button>
          <button
            onClick={onToggleCheckpoints}
            className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors flex items-center gap-1.5"
            title="Checkpoints (bookmarks) replace thread history"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Checkpoints
          </button>
        </div>
      </div>
    </div>
  );
}
