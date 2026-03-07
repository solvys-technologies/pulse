import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent, type ClipboardEvent } from 'react';
import { ArrowUp, Square, Plus, Wrench, Brain, X } from 'lucide-react';

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
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

      {/* Main container — 21st-dev-inspired clean shell w/ Pulse palette */}
      <div
        className={[
          'relative flex flex-col rounded-2xl border transition-all duration-200',
          'backdrop-blur-xl shadow-[0_18px_40px_rgba(0,0,0,0.35)]',
          text
            ? 'border-[#D4AF37]/55 ring-1 ring-[#D4AF37]/25'
            : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/35',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
        style={{ background: 'linear-gradient(180deg, rgba(13,12,9,0.98), rgba(8,8,6,0.95))' }}
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
          className="resize-none bg-transparent text-[13px] text-white placeholder:text-zinc-500 focus:outline-none overflow-y-auto"
          style={{
            padding: '14px 16px 8px',
            maxHeight: '170px',
            lineHeight: '1.5',
          }}
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-white/5" style={{ padding: '8px 10px 10px' }}>
          {/* Left: Attach + Skills + Think Harder */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenAttach}
              className="flex items-center justify-center rounded-lg text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              style={{ width: '32px', height: '32px' }}
              title="Attach"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onOpenSkills}
              className="flex items-center justify-center rounded-lg text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              style={{ width: '32px', height: '32px' }}
              title="Skills"
            >
              <Wrench size={14} />
            </button>
            <button
              onClick={() => setThinkHarder(!thinkHarder)}
              title={thinkHarder ? 'Extended thinking ON' : 'Extended thinking OFF'}
              className={`flex items-center justify-center rounded-lg transition-all ${
                thinkHarder
                  ? 'text-[#D4AF37] bg-[#D4AF37]/15'
                  : 'text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
              }`}
              style={{ width: '32px', height: '32px' }}
            >
              <Brain size={14} />
            </button>
          </div>

          {/* Right: Send / Stop */}
          <button
            onClick={isProcessing && onStop ? onStop : handleSend}
            disabled={!text.trim() && images.length === 0 && !isProcessing}
            className={`flex items-center justify-center rounded-full transition-all ${
              isProcessing
                ? 'bg-[#D4AF37] hover:bg-[#C5A030] text-black'
                : 'bg-[#D4AF37] hover:bg-[#C5A030] text-black disabled:opacity-30 disabled:hover:bg-[#D4AF37] shadow-[0_8px_20px_rgba(212,175,55,0.25)]'
            }`}
            style={{ width: '34px', height: '34px' }}
            title={isProcessing ? 'Stop' : 'Send'}
          >
            {isProcessing ? (
              <Square size={12} fill="currentColor" />
            ) : (
              <ArrowUp size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
