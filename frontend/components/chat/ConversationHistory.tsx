import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit3, Check, MessageSquare, Clock } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messageCount: number;
}

interface ConversationHistoryProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ConversationHistory({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!open) return null;

  return (
    <div
      className="fixed top-0 right-0 h-full z-50 flex"
      style={{ width: '300px' }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative ml-auto h-full flex flex-col border-l border-[#D4AF37]/20 bg-[#0a0a00]"
        style={{ width: '280px', animation: 'slideInRight 200ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/10">
          <span className="text-[13px] font-semibold text-white">Conversations</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="flex items-center justify-center rounded-md text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              style={{ width: '28px', height: '28px' }}
              title="New conversation"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-md text-gray-500 hover:text-white transition-colors"
              style={{ width: '28px', height: '28px' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 && (
            <div className="text-center py-10">
              <MessageSquare size={24} className="mx-auto mb-2 text-gray-700" />
              <p className="text-[12px] text-gray-600">No conversations yet.</p>
            </div>
          )}
          {conversations.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = editingId === conv.id;
            return (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-[#D4AF37]/10' : 'hover:bg-[#D4AF37]/5'
                }`}
                onClick={() => { if (!isEditing) onSelect(conv.id); }}
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { onRename(conv.id, editTitle); setEditingId(null); }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-[12px] text-white border-b border-[#D4AF37]/30 focus:outline-none"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); onRename(conv.id, editTitle); setEditingId(null); }}
                        className="text-[#D4AF37]"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-[12px] text-white truncate">{conv.title}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <Clock size={9} />
                        {relativeTime(conv.updated_at)}
                        <span className="mx-0.5">·</span>
                        {conv.messageCount} msgs
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title); }}
                      className="text-gray-500 hover:text-[#D4AF37] transition-colors"
                      title="Rename"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
