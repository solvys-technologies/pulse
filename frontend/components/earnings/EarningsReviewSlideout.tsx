// [claude-code 2026-03-09] EarningsReviewSlideout — detail view + inline edit for ER journal entries
import React, { useState, useCallback } from 'react';
import { X, Edit3, Save, Trash2, ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from 'lucide-react';
import type { EarningsReview, EarningsReviewUpdate } from '../../types/earnings-history';

interface SlideoutProps {
  review: EarningsReview;
  onClose: () => void;
  onUpdate: (id: string, data: EarningsReviewUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'F'];

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === 'long') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/15 px-2 py-0.5 rounded">
      <ArrowUpRight className="w-3 h-3" /> LONG
    </span>
  );
  if (direction === 'short') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/15 px-2 py-0.5 rounded">
      <ArrowDownRight className="w-3 h-3" /> SHORT
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-zinc-700/50 px-2 py-0.5 rounded">
      <Minus className="w-3 h-3" /> FLAT
    </span>
  );
}

export function EarningsReviewSlideout({ review, onClose, onUpdate, onDelete }: SlideoutProps) {
  const [editing, setEditing] = useState(false);
  const [postReview, setPostReview] = useState(review.postReview);
  const [emotionalState, setEmotionalState] = useState(review.emotionalState);
  const [lessonsText, setLessonsText] = useState(review.lessons.join('; '));
  const [grade, setGrade] = useState(review.grade ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const data: EarningsReviewUpdate = {};
    if (postReview !== review.postReview) data.postReview = postReview;
    if (emotionalState !== review.emotionalState) data.emotionalState = emotionalState;
    if (lessonsText !== review.lessons.join('; ')) {
      data.lessons = lessonsText.split(';').map((l) => l.trim()).filter(Boolean);
    }
    if (grade !== (review.grade ?? '')) data.grade = grade || undefined;

    if (Object.keys(data).length > 0) {
      await onUpdate(review.id, data);
    }
    setSaving(false);
    setEditing(false);
  }, [review, postReview, emotionalState, lessonsText, grade, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this earnings review entry?')) return;
    setDeleting(true);
    await onDelete(review.id);
    setDeleting(false);
  }, [review.id, onDelete]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-[420px] max-w-full h-full flex flex-col border-l border-[#c79f4a]/20 animate-slide-in-right"
        style={{ backgroundColor: '#070704' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#c79f4a]/15">
          <div className="flex items-center gap-2 min-w-0">
            <DirectionBadge direction={review.direction} />
            <span className="text-[14px] font-bold text-[#f0ead6] truncate">{review.symbol}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded text-zinc-500 hover:text-[#c79f4a] hover:bg-[#c79f4a]/10"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded text-[#c79f4a] hover:bg-[#c79f4a]/10"
                title="Save"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] uppercase text-zinc-500 mb-0.5">Earnings Date</div>
              <div className="text-[12px] text-[#f0ead6]">{review.earningsDate || '—'}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-zinc-500 mb-0.5">Setup</div>
              <div className="text-[12px] text-[#f0ead6]">{review.setupType || '—'}</div>
            </div>
            {review.entryPrice != null && (
              <div>
                <div className="text-[9px] uppercase text-zinc-500 mb-0.5">Entry</div>
                <div className="text-[12px] text-[#f0ead6] font-mono">${review.entryPrice.toFixed(2)}</div>
              </div>
            )}
            {review.exitPrice != null && (
              <div>
                <div className="text-[9px] uppercase text-zinc-500 mb-0.5">Exit</div>
                <div className="text-[12px] text-[#f0ead6] font-mono">${review.exitPrice.toFixed(2)}</div>
              </div>
            )}
            {review.pnl != null && (
              <div>
                <div className="text-[9px] uppercase text-zinc-500 mb-0.5">P&L</div>
                <div className={`text-[12px] font-mono font-semibold ${review.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {review.pnl >= 0 ? '+' : ''}${Math.abs(review.pnl).toFixed(2)}
                </div>
              </div>
            )}
            <div>
              <div className="text-[9px] uppercase text-zinc-500 mb-0.5">Grade</div>
              {editing ? (
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-[11px] text-[#f0ead6] focus:border-[#c79f4a] focus:outline-none"
                >
                  <option value="">—</option>
                  {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : (
                <div className="text-[12px] text-[#f0ead6]">{review.grade || '—'}</div>
              )}
            </div>
          </div>

          {/* Emotional State */}
          <div>
            <div className="text-[9px] uppercase text-zinc-500 mb-1">Emotional State</div>
            {editing ? (
              <input
                value={emotionalState}
                onChange={(e) => setEmotionalState(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-[#f0ead6] focus:border-[#c79f4a] focus:outline-none"
              />
            ) : (
              <div className="text-[11px] text-[#f0ead6]/80 leading-relaxed">
                {review.emotionalState || <span className="text-zinc-600 italic">Not recorded</span>}
              </div>
            )}
          </div>

          {/* Thesis */}
          <div>
            <div className="text-[9px] uppercase text-zinc-500 mb-1">Pre-ER Thesis</div>
            <div className="text-[11px] text-[#f0ead6]/80 leading-relaxed whitespace-pre-wrap">
              {review.thesis || <span className="text-zinc-600 italic">No thesis recorded</span>}
            </div>
          </div>

          {/* Post Review */}
          <div>
            <div className="text-[9px] uppercase text-zinc-500 mb-1">Post-ER Review</div>
            {editing ? (
              <textarea
                value={postReview}
                onChange={(e) => setPostReview(e.target.value)}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-[#f0ead6] focus:border-[#c79f4a] focus:outline-none resize-none"
                placeholder="Post-earnings reflection..."
              />
            ) : (
              <div className="text-[11px] text-[#f0ead6]/80 leading-relaxed whitespace-pre-wrap">
                {review.postReview || <span className="text-zinc-600 italic">No review yet — click edit to add</span>}
              </div>
            )}
          </div>

          {/* Lessons */}
          <div>
            <div className="text-[9px] uppercase text-zinc-500 mb-1">Lessons / Takeaways</div>
            {editing ? (
              <textarea
                value={lessonsText}
                onChange={(e) => setLessonsText(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-[#f0ead6] focus:border-[#c79f4a] focus:outline-none resize-none"
                placeholder="Separate with semicolons..."
              />
            ) : (
              <div>
                {review.lessons.length > 0 ? (
                  <ul className="space-y-1">
                    {review.lessons.map((lesson, i) => (
                      <li key={i} className="text-[11px] text-[#f0ead6]/80 flex items-start gap-1.5">
                        <span className="text-[#c79f4a] mt-0.5">•</span>
                        {lesson}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[11px] text-zinc-600 italic">No lessons recorded</span>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {review.tags.length > 0 && (
            <div>
              <div className="text-[9px] uppercase text-zinc-500 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {review.tags.map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notion link */}
          {review.notionUrl && (
            <a
              href={review.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#c79f4a]/60 hover:text-[#c79f4a]"
            >
              <ExternalLink className="w-3 h-3" /> View in Notion
            </a>
          )}

          {/* Timestamps */}
          <div className="text-[9px] text-zinc-600 pt-2 border-t border-zinc-800">
            Created: {new Date(review.createdAt).toLocaleDateString()} · Updated: {new Date(review.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
