import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Trash2, Users, FileText } from 'lucide-react';
import { getAllThreads, deleteThread, type BoardroomThread } from '../../lib/boardroomThreadStore';

interface BoardroomThreadListProps {
  onSelectThread: (thread: BoardroomThread) => void;
  refreshKey?: number; // bump to re-fetch
}

export function BoardroomThreadList({ onSelectThread, refreshKey }: BoardroomThreadListProps) {
  const [threads, setThreads] = useState<BoardroomThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllThreads().then((t) => {
      if (!cancelled) {
        setThreads(t);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteThread(id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading threads…
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <FileText className="w-8 h-8 text-gray-600" />
        <span className="text-sm text-gray-500">No saved boardroom sessions</span>
        <span className="text-xs text-gray-600">
          Sessions are auto-saved when the boardroom is active
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onSelectThread(thread)}
          className="w-full text-left p-3 rounded-lg bg-black/30 border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all group"
        >
          {/* Title */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-gray-200 truncate flex-1 leading-tight">
              {thread.title}
            </span>
            <button
              onClick={(e) => handleDelete(e, thread.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
              title="Delete thread"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3 h-3 text-[#D4AF37]/60" />
            <div className="flex gap-1 flex-wrap">
              {thread.participants.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]/80 border border-[#D4AF37]/15"
                >
                  {p}
                </span>
              ))}
              {thread.participants.length > 5 && (
                <span className="text-[10px] text-gray-500">+{thread.participants.length - 5}</span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(thread.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{thread.messageCount} msg{thread.messageCount !== 1 ? 's' : ''}</span>
            </div>
            {thread.meetingNotes && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#D4AF37]/50" />
                <span className="text-[#D4AF37]/50">notes</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
