import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { notionDocs, type NotionDoc } from './mockNotionExecutiveData';
import { useOpenClawChat } from '../chat/hooks/useOpenClawChat';

function Tag({ text }: { text: string }) {
  return (
    <span className="text-[10px] tracking-[0.22em] uppercase text-gray-400 border border-[#D4AF37]/10 rounded-full px-2 py-0.5">
      {text}
    </span>
  );
}

export function NotionExecutiveView() {
  const [query, setQuery] = useState('');
  const [activeDocId, setActiveDocId] = useState(notionDocs[0]?.id ?? '');
  const activeDoc = useMemo(
    () => notionDocs.find((d) => d.id === activeDocId) ?? notionDocs[0],
    [activeDocId]
  );

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notionDocs;
    return notionDocs.filter((d) => {
      const hay = `${d.title} ${d.tags.join(' ')} ${d.excerpt}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, stop } = useOpenClawChat(conversationId, setConversationId as any);

  const uiMessages = useMemo(() => {
    return (messages || [])
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => {
        const text =
          m.content ||
          (Array.isArray(m.parts)
            ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
            : '');
        return {
          id: String(m.id),
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(text || ''),
        };
      });
  }, [messages]);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(
      { text },
      {
        body: { conversationId },
      }
    );
  };

  return (
    <div className="h-full w-full p-6">
      <div className="mb-6">
        <div className="text-xs tracking-[0.28em] uppercase text-gray-500">Pulse Executive</div>
        <h1 className="mt-2 text-2xl font-semibold text-white">Notion Browser + Executive Thread</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Notion browser */}
        <div className="xl:col-span-8 rounded-xl border border-[#D4AF37]/15 bg-[#0a0a00] overflow-hidden">
          <div className="border-b border-[#D4AF37]/20 px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#D4AF37] tracking-[0.18em] uppercase">Notion Browser</h2>
            <span className="text-[10px] tracking-[0.22em] uppercase text-gray-500 border border-[#D4AF37]/15 rounded-full px-3 py-1">
              Research Corpus
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#D4AF37]/10 p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memos, playbooks, and logs"
                  className="w-full bg-[#050500] border border-[#D4AF37]/15 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
                />
              </div>

              <div className="mt-4 space-y-2">
                {filteredDocs.map((doc) => {
                  const active = doc.id === activeDoc?.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setActiveDocId(doc.id)}
                      className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                        active
                          ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10'
                          : 'border-[#D4AF37]/10 bg-black/20 hover:bg-[#D4AF37]/5'
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">{doc.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{doc.updated}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 p-5">
              {activeDoc ? (
                <>
                  <div className="text-xl font-semibold text-white">{activeDoc.title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeDoc.tags.map((t) => (
                      <Tag key={t} text={t} />
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-200">{activeDoc.excerpt}</div>
                  <div className="mt-4 text-xs text-gray-500">Last updated: {activeDoc.updated}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400">No doc selected.</div>
              )}
            </div>
          </div>
        </div>

        {/* Executive thread */}
        <div className="xl:col-span-4 rounded-xl border border-[#D4AF37]/15 bg-[#0a0a00] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-[#D4AF37]/20 px-5 py-4">
            <h2 className="text-sm font-semibold text-[#D4AF37] tracking-[0.18em] uppercase">Executive Thread</h2>
            <span className="text-[10px] tracking-[0.22em] uppercase text-gray-500 border border-[#D4AF37]/15 rounded-full px-3 py-1">
              Harper
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {uiMessages.length ? (
              uiMessages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border px-4 py-3 ${
                    m.role === 'user'
                      ? 'border-[#D4AF37]/20 bg-[#D4AF37]/10'
                      : 'border-[#D4AF37]/10 bg-black/20'
                  }`}
                >
                  <div className="text-[10px] tracking-[0.22em] uppercase text-gray-500">
                    {m.role === 'user' ? 'You' : 'Harper'}
                  </div>
                  <div className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">Ask Harper about this memo, or request a report.</div>
            )}
          </div>

          <div className="border-t border-[#D4AF37]/15 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Harper or request a report"
                className="flex-1 bg-[#050500] border border-[#D4AF37]/15 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isStreaming}
              />
              <button
                onClick={isStreaming ? () => stop() : () => handleSend()}
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-[0.22em] uppercase border transition-colors ${
                  isStreaming
                    ? 'border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-[#D4AF37]/30 text-[#D4AF37] bg-[#050500] hover:bg-[#D4AF37]/10'
                }`}
              >
                {isStreaming ? 'Stop' : 'Send'}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Uses Pulse’s existing OpenClaw-powered chat (`/api/ai/chat`).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

