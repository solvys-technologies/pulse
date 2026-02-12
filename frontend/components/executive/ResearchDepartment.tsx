import { useMemo, useState, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Send, Plus, Wrench, Brain } from 'lucide-react';
import { useOpenClawChat } from '../chat/hooks/useOpenClawChat';
import { usePulseAgents } from '../../contexts/PulseAgentContext';

export function ResearchDepartment() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [inputText, setInputText] = useState('');
  const [thinkHarder, setThinkHarder] = useState(false);
  const { messages, sendMessage, status, stop } = useOpenClawChat(conversationId, setConversationId as any);
  const notionResearchUrl = import.meta.env.VITE_NOTION_RESEARCH_URL || 'https://www.notion.so';

  let activeAgent: { name: string; icon: string } | null = null;
  try {
    const ctx = usePulseAgents();
    activeAgent = ctx.activeAgent;
  } catch {
    // fallback
  }
  const agent = activeAgent || { name: 'Harper', icon: 'H' };

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

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg) return;
    setInputText('');
    await sendMessage(
      { text: msg },
      { body: { conversationId } }
    );
  }, [inputText, sendMessage, conversationId]);

  const textareaRef = useMemo(() => ({ current: null as HTMLTextAreaElement | null }), []);

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Main area: full Notion iframe */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Toggle button when sidebar is closed */}
        {!sidebarOpen && (
          <div className="shrink-0 absolute top-2 right-3 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="backdrop-blur-md bg-black/20 rounded-lg p-1.5 text-gray-400 hover:text-[#D4AF37] transition-colors"
              title="Open Research Assistance"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Notion iframe — fills everything from edge to edge */}
        <div className="flex-1 min-h-0 w-full">
          <iframe
            title="Notion Research Department"
            src={notionResearchUrl}
            className="w-full h-full bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>

      {/* Research Assistance sidebar — collapsible */}
      {sidebarOpen && (
        <div className="w-[340px] shrink-0 border-l border-[#D4AF37]/15 bg-[#070704] flex flex-col">
          {/* Sidebar header */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-[#D4AF37] tracking-[0.18em] uppercase">
              Research Assistance
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-gray-400 hover:text-[#D4AF37] transition-colors"
              title="Collapse sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
            {uiMessages.length ? (
              uiMessages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[90%] px-3 py-2 border-l-2 ${
                        isUser
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40'
                          : 'bg-[#6366f1]/10 border-[#6366f1]/40'
                      }`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span
                          className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
                            isUser ? 'text-[#D4AF37]' : 'text-[#6366f1]'
                          }`}
                        >
                          {isUser ? 'You' : agent.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-200 whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2">
                <p className="text-sm font-semibold text-white">{agent.name}</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-[13px] h-[13px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#D97757' }}
                  >
                    <span style={{ fontSize: '6px', color: 'white', fontWeight: 800, lineHeight: 1 }}>A</span>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: '#D97757' }}>Claude Opus 4.6</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1">
                  Ask about your research, or request a report.
                </span>
              </div>
            )}
          </div>

          {/* Input — PulseChatInput style (no agent selector) */}
          <div className="shrink-0 p-3">
            <div
              className={`relative flex flex-col rounded-[28px] border transition-colors ${
                inputText ? 'border-[#D4AF37]/50' : 'border-[#D4AF37]/20'
              }`}
              style={{ backgroundColor: '#0b0b08' }}
            >
              <textarea
                ref={(el) => { textareaRef.current = el; }}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isStreaming) { stop(); } else { handleSend(); }
                  }
                }}
                placeholder={`Message ${agent.name}...`}
                rows={1}
                disabled={isStreaming}
                className="resize-none bg-transparent text-[13px] text-white placeholder:text-gray-600 focus:outline-none overflow-y-auto"
                style={{ padding: '14px 18px 6px', maxHeight: '120px', lineHeight: '1.5' }}
              />

              {/* Bottom bar — Attach + Skills | Think Harder + Send */}
              <div className="flex items-center justify-between" style={{ padding: '4px 10px 8px' }}>
                <div className="flex items-center gap-1">
                  <button
                    className="flex items-center justify-center rounded-full text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                    style={{ width: '30px', height: '30px' }}
                    title="Attach"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="flex items-center justify-center rounded-full text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                    style={{ width: '30px', height: '30px' }}
                    title="Skills"
                  >
                    <Wrench size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
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
                  <button
                    onClick={isStreaming ? () => stop() : () => handleSend()}
                    disabled={!isStreaming && !inputText.trim()}
                    className={`flex items-center justify-center rounded-full transition-all ${
                      isStreaming
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-[#D4AF37] hover:bg-[#C5A030] text-black disabled:opacity-30 disabled:hover:bg-[#D4AF37]'
                    }`}
                    style={{ width: '30px', height: '30px' }}
                    title={isStreaming ? 'Stop' : 'Send'}
                  >
                    {isStreaming ? (
                      <div className="w-3 h-3 rounded-sm bg-white" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
