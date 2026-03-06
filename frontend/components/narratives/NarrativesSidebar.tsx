// [claude-code 2026-03-06] Pop-out narratives sidebar — slides from right edge like Notion Inbox
import { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { NarrativesList } from './NarrativesList';

interface NarrativesSidebarProps {
  open: boolean;
  onClose: () => void;
  onExpandToFull?: () => void;
}

export function NarrativesSidebar({ open, onClose, onExpandToFull }: NarrativesSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[340px] bg-[#050402] border-l border-[#D4AF37]/20 flex flex-col transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/15">
          <h3 className="text-[13px] font-semibold text-[#f0ead6]">Narratives</h3>
          <div className="flex items-center gap-2">
            {onExpandToFull && (
              <button
                type="button"
                onClick={onExpandToFull}
                title="Open full panel"
                className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-[#f0ead6] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content — compact narrative list */}
        <div className="flex-1 min-h-0">
          {open && <NarrativesList compact />}
        </div>
      </div>
    </>
  );
}
