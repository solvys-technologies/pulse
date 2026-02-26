import React from 'react';
import { FortyFortyCard } from './FortyFortyCard';
import { Crosshair } from 'lucide-react';

// TODO: Add additional model cards as they're built:
// - FlushCard (Flush model)
// - RipperCard (Ripper model)  
// - VIXFixerCard (VIX Fixer model)

export function ModelDashboard() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#D4AF37]/10">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-lg font-bold text-[#D4AF37]">Trading Models</h2>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">PIC Playbook execution system</p>
      </div>

      {/* Models list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <FortyFortyCard expanded />

        {/* Placeholder slots for future models */}
        <div className="border border-dashed border-[#D4AF37]/10 rounded-lg p-4 text-center">
          <p className="text-[11px] text-gray-600">Flush Model — Coming Soon</p>
        </div>
        <div className="border border-dashed border-[#D4AF37]/10 rounded-lg p-4 text-center">
          <p className="text-[11px] text-gray-600">Ripper Model — Coming Soon</p>
        </div>
        <div className="border border-dashed border-[#D4AF37]/10 rounded-lg p-4 text-center">
          <p className="text-[11px] text-gray-600">VIX Fixer — Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
