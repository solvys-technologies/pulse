import { useState } from 'react';
import { X, FileText, Image, Activity } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AttachTab = 'docs' | 'media' | 'riskflow';

interface PulseAttachPopupProps {
  open: boolean;
  onClose: () => void;
  onAttachFile?: (file: File) => void;
  onAttachRiskFlow?: (itemId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PulseAttachPopup({ open, onClose, onAttachFile, onAttachRiskFlow }: PulseAttachPopupProps) {
  const [tab, setTab] = useState<AttachTab>('media');

  if (!open) return null;

  const tabs: { id: AttachTab; label: string; icon: typeof FileText }[] = [
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'riskflow', label: 'RiskFlow', icon: Activity },
  ];

  return (
    <div className="absolute bottom-full mb-2 left-0 w-72 rounded-lg border border-[#D4AF37]/20 bg-[#0a0a00] shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#D4AF37]/10">
        <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">Attach</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4AF37]/10">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
              tab === id ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', minHeight: '100px' }}>
        {tab === 'docs' && (
          <div className="text-center text-[12px] text-gray-500">
            <FileText size={24} className="mx-auto mb-2 text-gray-600" />
            <p>Document attachment coming soon.</p>
          </div>
        )}
        {tab === 'media' && (
          <div className="text-center">
            <label className="cursor-pointer inline-flex flex-col items-center gap-2 border-2 border-dashed border-[#D4AF37]/20 rounded-lg p-4 w-full hover:border-[#D4AF37]/40 transition-colors">
              <Image size={24} className="text-gray-600" />
              <span className="text-[12px] text-gray-400">Drop or click to upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onAttachFile) onAttachFile(file);
                  onClose();
                }}
              />
            </label>
          </div>
        )}
        {tab === 'riskflow' && (
          <div className="text-center text-[12px] text-gray-500">
            <Activity size={24} className="mx-auto mb-2 text-gray-600" />
            <p>Attach a RiskFlow item to your message.</p>
            <p className="text-[10px] text-gray-600 mt-1">Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
