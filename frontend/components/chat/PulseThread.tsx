// [claude-code 2026-03-07] Custom Thread built on ThreadPrimitive — replaces ChatMessageList
import { type FC, type RefObject } from 'react';
import { ThreadPrimitive, MessagePrimitive, useMessage } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import remarkGfm from 'remark-gfm';
import { CalendarCheck } from 'lucide-react';
import { ChatGreeting } from './ChatGreeting';
import { PulseThinkingIndicator } from './PulseThinkingIndicator';
import { usePulseAgents } from '../../contexts/PulseAgentContext';

/* ------------------------------------------------------------------ */
/*  Markdown renderer                                                   */
/* ------------------------------------------------------------------ */

const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-zinc-200 mb-1.5 mt-2 first:mt-0">{children}</h3>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <code className="block bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 overflow-x-auto my-2">
        {children}
      </code>
    ) : (
      <code className="bg-zinc-800/80 rounded px-1 py-0.5 text-xs font-mono text-zinc-300">{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto">{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-[#D4AF37]/40 pl-3 my-2 text-zinc-400 italic">{children}</blockquote>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  hr: () => <hr className="border-white/10 my-3" />,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:text-[#C5A030] underline underline-offset-2">
      {children}
    </a>
  ),
} as const;

/* ------------------------------------------------------------------ */
/*  Timestamp formatter                                                 */
/* ------------------------------------------------------------------ */

function formatTimestamp(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${mm}/${dd}/${yy} ${time}`;
}

/* ------------------------------------------------------------------ */
/*  Text part — Markdown renderer                                       */
/* ------------------------------------------------------------------ */

const PulseTextPart: FC<{ text: string }> = ({ text }) => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    components={MARKDOWN_COMPONENTS as any}
    className="text-sm text-zinc-300 max-w-none"
  />
);

/* ------------------------------------------------------------------ */
/*  Reasoning part — collapsible thinking pane                         */
/* ------------------------------------------------------------------ */

const PulseReasoningPart: FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  return (
    <details className="mb-2 group/reason">
      <summary className="text-[11px] text-zinc-500 cursor-pointer select-none hover:text-zinc-400 transition-colors flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10" className="transition-transform group-open/reason:rotate-90" fill="currentColor">
          <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Thinking
      </summary>
      <div className="mt-1.5 pl-3 border-l border-zinc-700/50 text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </details>
  );
};

/* ------------------------------------------------------------------ */
/*  User message                                                        */
/* ------------------------------------------------------------------ */

const PulseUserMessage: FC = () => {
  const message = useMessage();
  const createdAt = (message as any).createdAt as Date | undefined;

  return (
    <div className="group/msg flex flex-col items-end">
      <div className="max-w-[82%] rounded-2xl p-4 backdrop-blur-md border transition-colors pulse-user-bubble">
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }) => (
              <p className="text-sm text-white whitespace-pre-wrap break-words">{text}</p>
            ),
          }}
        />
      </div>
      {createdAt && (
        <span className="text-[10px] text-zinc-600 mt-1 mr-1 opacity-0 group-hover/msg:opacity-100 transition-opacity tabular-nums">
          {formatTimestamp(createdAt)}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Assistant message                                                   */
/* ------------------------------------------------------------------ */

const PulseAssistantMessage: FC<{ onCheckpoint?: (id: string, content: string) => void }> = ({ onCheckpoint }) => {
  const message = useMessage();
  const createdAt = (message as any).createdAt as Date | undefined;
  const id = (message as any).id as string | undefined;

  // Extract full text for checkpoint
  const textContent = (message as any).content
    ?.filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('\n') ?? '';

  return (
    <div className="group/msg flex flex-col items-start">
      <div className="max-w-[82%] rounded-2xl p-4 backdrop-blur-md border border-white/10 bg-[#0f0f0b]/92 shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-colors">
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }) => (
              <PulseTextPart text={text} />
            ),
            Reasoning: ({ text }) => (
              <PulseReasoningPart text={text} />
            ),
          }}
        />
      </div>

      {/* Hover row: timestamp + checkpoint */}
      <div className="flex items-center gap-2 mt-1 ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
        {createdAt && (
          <span className="text-[10px] text-zinc-600 tabular-nums">
            {formatTimestamp(createdAt)}
          </span>
        )}
        {onCheckpoint && id && textContent && (
          <button
            onClick={() => onCheckpoint(id, textContent)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-[#D4AF37] transition-colors"
            title="Save checkpoint"
          >
            <CalendarCheck size={10} />
            checkpoint
          </button>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Thread                                                              */
/* ------------------------------------------------------------------ */

interface PulseThreadProps {
  onSend: (msg: string) => void;
  isLoading: boolean;
  agentName?: string;
  onCheckpoint?: (messageId: string, content: string) => void;
  messageRefs?: RefObject<Record<string, HTMLDivElement | null>>;
}

export function PulseThread({ onSend, isLoading, agentName, onCheckpoint }: PulseThreadProps) {
  const { activeAgent } = usePulseAgents();

  const AssistantMsg = () => (
    <PulseAssistantMessage onCheckpoint={onCheckpoint} />
  );

  return (
    <ThreadPrimitive.Root className="flex-1 flex flex-col min-h-0">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-6 pb-8">
        <div className="max-w-3xl mx-auto space-y-4 mb-8">
          {/* Greeting screen — shown when thread is empty */}
          <ThreadPrimitive.Empty>
            <ChatGreeting onSend={onSend} isLoading={isLoading} />
          </ThreadPrimitive.Empty>

          {/* Message list */}
          <ThreadPrimitive.Messages
            components={{
              UserMessage: PulseUserMessage,
              AssistantMessage: AssistantMsg,
            }}
          />

          {/* Thinking indicator — shown while streaming */}
          <ThreadPrimitive.If running>
            <div className="flex justify-start items-center">
              <PulseThinkingIndicator
                isThinking
                agentName={agentName ?? activeAgent?.name}
              />
            </div>
          </ThreadPrimitive.If>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
