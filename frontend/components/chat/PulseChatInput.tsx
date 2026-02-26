import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent, type ClipboardEvent } from 'react';
import { Send, Plus, Wrench, Brain, ChevronDown, X } from 'lucide-react';
import { usePulseAgents, type PulseAgent } from '../../contexts/PulseAgentContext';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface PulseChatInputProps {
  onSend: (message: string, images: string[]) => void;
  onStop?: () => void;
  isProcessing?: boolean;
  placeholder?: string;
  thinkHarder: boolean;
  setThinkHarder: (v: boolean) => void;
  onOpenAttach?: () => void;
  onOpenSkills?: () => void;
  disabled?: boolean;
  draftKey?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PulseChatInput({
  onSend,
  onStop,
  isProcessing = false,
  placeholder = 'Message your analysts...',
  thinkHarder,
  setThinkHarder,
  onOpenAttach,
  onOpenSkills,
  disabled = false,
  draftKey = 'pulse_draft_analysis',
}: PulseChatInputProps) {
  const { agents, activeAgent, setActiveAgent } = usePulseAgents();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* Draft persistence — load on mount */
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) setText(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Draft persistence — save on change */
  useEffect(() => {
    if (text) {
      localStorage.setItem(draftKey, text);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [text, draftKey]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  /* Close agent picker on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAgentPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Send */
  const handleSend = useCallback(() => {
    const msg = text.trim();
    if (!msg && images.length === 0) return;
    onSend(msg, images);
    setText('');
    setImages([]);
    localStorage.removeItem(draftKey);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, images, onSend, draftKey]);

  /* Double-space stop & send shortcut */
  const lastSpaceRef = useRef(0);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isProcessing && onStop) {
        onStop();
      } else {
        handleSend();
      }
      return;
    }
    if (e.key === ' ' && isProcessing && onStop) {
      const now = Date.now();
      if (now - lastSpaceRef.current < 400) {
        e.preventDefault();
        onStop();
      }
      lastSpaceRef.current = now;
    }
  };

  /* Paste image support */
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setImages((prev) => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full">
      {/* Image preview strip */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-2 px-2 overflow-x-auto">
          {images.map((src, idx) => (
            <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#D4AF37]/20">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main pill container */}
      <div
        className={`
          relative flex flex-col rounded-[28px] border transition-colors
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
          ${text ? 'border-[#D4AF37]/50' : 'border-[#D4AF37]/20'}
        `}
        style={{ backgroundColor: '#0b0b08' }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          className="resize-none bg-transparent text-[13px] text-white placeholder:text-gray-600 focus:outline-none overflow-y-auto"
          style={{
            padding: '14px 18px 6px',
            maxHeight: '160px',
            lineHeight: '1.5',
          }}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between" style={{ padding: '4px 10px 8px' }}>
          {/* Left: Attach + Skills */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenAttach}
              className="flex items-center justify-center rounded-full text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              style={{ width: '30px', height: '30px' }}
              title="Attach"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onOpenSkills}
              className="flex items-center justify-center rounded-full text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              style={{ width: '30px', height: '30px' }}
              title="Skills"
            >
              <Wrench size={14} />
            </button>
          </div>

          {/* Right: Agent selector + Think Harder + Send */}
          <div className="flex items-center gap-1.5">
            {/* Agent selector pill */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowAgentPicker(!showAgentPicker)}
                className="flex items-center gap-1 rounded-full border border-[#D4AF37]/20 text-gray-400 hover:text-white hover:border-[#D4AF37]/40 transition-colors"
                style={{ padding: '3px 10px 3px 8px', fontSize: '12px' }}
              >
                <span
                  className="flex items-center justify-center rounded-md bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
                  style={{ width: '18px', height: '18px', fontSize: '10px' }}
                >
                  {activeAgent?.icon || '?'}
                </span>
                <span className="max-w-[80px] truncate">{activeAgent?.name || 'Select'}</span>
                <ChevronDown size={12} className="flex-shrink-0" />
              </button>

              {showAgentPicker && (
                <div
                  className="absolute bottom-full mb-1 right-0 w-52 rounded-lg border border-[#D4AF37]/20 bg-[#0a0a00] shadow-xl overflow-hidden z-50"
                >
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setActiveAgent(a); setShowAgentPicker(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#D4AF37]/10 transition-colors ${a.id === activeAgent?.id ? 'bg-[#D4AF37]/15' : ''}`}
                    >
                      <span
                        className="flex items-center justify-center rounded-md bg-[#D4AF37]/10 text-[#D4AF37] font-semibold"
                        style={{ width: '22px', height: '22px', fontSize: '11px', flexShrink: 0 }}
                      >
                        {a.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white truncate">{a.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{a.sector}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Think Harder toggle */}
            <button
              onClick={() => setThinkHarder(!thinkHarder)}
              title={thinkHarder ? 'Extended thinking ON' : 'Extended thinking OFF'}
              className={`flex items-center justify-center rounded-full border transition-all ${
                thinkHarder
                  ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                  : 'border-[#D4AF37]/15 text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30'
              }`}
              style={{ width: '30px', height: '30px' }}
            >
              <Brain size={14} />
            </button>

            {/* Send button */}
            <button
              onClick={isProcessing && onStop ? onStop : handleSend}
              disabled={!text.trim() && images.length === 0 && !isProcessing}
              className={`flex items-center justify-center rounded-full transition-all ${
                isProcessing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#D4AF37] hover:bg-[#C5A030] text-black disabled:opacity-30 disabled:hover:bg-[#D4AF37]'
              }`}
              style={{ width: '30px', height: '30px' }}
              title={isProcessing ? 'Stop' : 'Send'}
            >
              {isProcessing ? (
                <div className="w-3 h-3 rounded-sm bg-white" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
