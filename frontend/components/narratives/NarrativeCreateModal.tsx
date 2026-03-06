// [claude-code 2026-03-06] Modal for creating a new narrative
import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateNarrativeParams, NarrativeVolatility } from '../../lib/services';

interface NarrativeCreateModalProps {
  week: string;
  onClose: () => void;
  onCreate: (data: CreateNarrativeParams) => void;
}

export function NarrativeCreateModal({ week, onClose, onCreate }: NarrativeCreateModalProps) {
  const [title, setTitle] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [instrumentsStr, setInstrumentsStr] = useState('');
  const [volatility, setVolatility] = useState<NarrativeVolatility>('low');
  const [catalysts, setCatalysts] = useState('');
  const [impact, setImpact] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    setSubmitting(true);
    onCreate({
      title: title.trim(),
      week,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      instruments: instrumentsStr.split(',').map((t) => t.trim()).filter(Boolean),
      volatility,
      catalysts: catalysts.trim(),
      impact,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0a0a00] border border-[#D4AF37]/30 rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[#f0ead6]">New Narrative</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-[#f0ead6]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fed Rate Cut Delay"
              className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Tags (comma-sep)</label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="rates, inflation"
                className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Instruments</label>
              <input
                type="text"
                value={instrumentsStr}
                onChange={(e) => setInstrumentsStr(e.target.value)}
                placeholder="NQ, ES, AAPL"
                className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Volatility</label>
              <select
                value={volatility}
                onChange={(e) => setVolatility(e.target.value as NarrativeVolatility)}
                className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] focus:outline-none focus:border-[#D4AF37]/50"
              >
                <option value="low">Low</option>
                <option value="gaining">Gaining</option>
                <option value="hot">Hot</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Impact (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={impact}
                onChange={(e) => setImpact(Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
                className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#f0ead6]/50 uppercase tracking-wider block mb-1">Catalysts</label>
            <textarea
              value={catalysts}
              onChange={(e) => setCatalysts(e.target.value)}
              placeholder="What could trigger movement..."
              rows={2}
              className="w-full bg-[#050402] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[12px] text-[#f0ead6] placeholder:text-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-[#f0ead6] hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="text-[11px] px-3 py-1.5 rounded bg-[#D4AF37] text-black font-semibold hover:bg-[#FFD060] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
