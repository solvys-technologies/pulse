import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Finance thinking phrases                                           */
/* ------------------------------------------------------------------ */

const THINKING_PHRASES = [
  'Scanning the tape...',
  'Running risk models...',
  'Reviewing positions...',
  'Consulting the board...',
  'Analyzing macro data...',
  'Checking volatility surface...',
  'Evaluating sentiment...',
  'Processing market signals...',
  'Cross-referencing events...',
  'Calculating exposure...',
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PulseThinkingIndicatorProps {
  isThinking: boolean;
  thinkingContent?: string; // Streamed inner monologue from gateway
  agentName?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PulseThinkingIndicator({ isThinking, thinkingContent, agentName }: PulseThinkingIndicatorProps) {
  const [phrase, setPhrase] = useState(THINKING_PHRASES[0]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isThinking) return;
    let idx = 0;
    setPhrase(THINKING_PHRASES[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % THINKING_PHRASES.length;
      setPhrase(THINKING_PHRASES[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Gold spinner */}
      <div className="relative flex-shrink-0" style={{ width: '24px', height: '24px', marginTop: '2px' }}>
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: '#D4AF37',
            borderRightColor: 'rgba(212,175,55,0.3)',
            animationDuration: '1s',
          }}
        />
        <div
          className="absolute rounded-full bg-[#D4AF37]/20"
          style={{ inset: '6px' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Status line */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#D4AF37] font-medium">{phrase}</span>
          {agentName && (
            <span className="text-[10px] text-gray-600">({agentName})</span>
          )}
        </div>

        {/* Expandable thinking content */}
        {thinkingContent && (
          <div className="mt-1.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expanded ? 'Hide reasoning' : 'Show reasoning'}
            </button>
            {expanded && (
              <div
                className="mt-1.5 text-[12px] text-gray-500 leading-relaxed border-l-2 border-[#D4AF37]/20 max-h-[200px] overflow-y-auto"
                style={{ paddingLeft: '10px' }}
              >
                {thinkingContent}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
