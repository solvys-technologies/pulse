/**
 * ChatInterface Component
 * v2.28.6 Refactor
 */
/**
 * ChatInterface Component
 * Simplified for local single-user mode - no authentication
 */
// [claude-code 2026-02-26] Add chat checkpoints (bookmark + recall) to replace thread-history reliance.
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, X, BarChart3, CalendarCheck, Brain, Eye, Trash2, Bookmark } from "lucide-react";
import { PulseSkillsPopup, type SkillId } from "./chat/PulseSkillsPopup";
import { useOpenClawChat } from "./chat/hooks/useOpenClawChat";
import { useBackend } from "../lib/backend";
import { healingBowlPlayer } from "../utils/healingBowlSounds";
import { useSettings } from "../contexts/SettingsContext";
import ReactMarkdown from "react-markdown";
import { MessageRenderer } from "./chat/MessageRenderer";
import { PulseThinkingIndicator } from "./chat/PulseThinkingIndicator";
import QuickPulseModal from "./analysis/QuickPulseModal";
import { PulseChatInput } from "./chat/PulseChatInput";
import { usePulseAgents } from "../contexts/PulseAgentContext";
import { addCheckpoint, deleteCheckpoint, listCheckpoints, type ChatCheckpoint } from "../lib/chatCheckpoints";
import { usePersistentOpenClawConversation } from "../hooks/usePersistentOpenClawConversation";
import { toOpenClawAgentOverride } from "../lib/openclawAgentRouting";
import { normalizeChatMessages } from "../lib/chatMessageNormalizer";


// [claude-code 2026-03-03] Phase 2: panel memory helper — persists open/closed state across sessions
function usePanelState(key: string, defaultValue: boolean): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  const [state, setState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setAndPersist = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key]);

  return [state, setAndPersist];
}

// [claude-code 2026-03-03] Phase 1B: date-grouped checkpoint sidebar with improved UX
function groupCheckpointsByDate(items: ChatCheckpoint[]): { label: string; items: ChatCheckpoint[] }[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const groups: Record<string, ChatCheckpoint[]> = {};
  const order: string[] = [];

  for (const cp of items) {
    const d = new Date(cp.createdAt).toDateString();
    const label = d === todayStr ? 'Today' : d === yesterdayStr ? 'Yesterday' : d;
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(cp);
  }

  return order.map((label) => ({ label, items: groups[label] }));
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: Date;
  cancelled?: boolean;
}

interface TiltWarning {
  detected: boolean;
  score?: number;
  message?: string;
}

const SUGGESTION_CHIPS: { label: string; prompt: string; icon: typeof BarChart3 }[] = [
  { label: "Run the NTN Report", prompt: "Run the NTN report", icon: BarChart3 },
  { label: "Tale of the Tape", prompt: "Give me the Tale of the Tape (Weekly Summary)", icon: CalendarCheck },
  { label: "Psych Eval", prompt: "Let's do a psych eval", icon: Brain },
  { label: "Update my Blindspots", prompt: "Update my Blindspots", icon: Eye },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Late session. What needs attention?";
  if (hour < 12) return "Good morning. What can I help with?";
  if (hour < 17) return "Good afternoon. What can I help with?";
  return "Good evening. What can I help with?";
}

export default function ChatInterface() {
  const backend = useBackend();
  const { alertConfig } = useSettings();
  const { activeAgent } = usePulseAgents();
  const { conversationId, setConversationId, clearConversationId } = usePersistentOpenClawConversation(activeAgent?.id ?? 'default');
  const openclawAgentOverride = toOpenClawAgentOverride(activeAgent?.id);
  // Local mode - always authenticated
  const isSignedIn = true;
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [tiltWarning, setTiltWarning] = useState<TiltWarning | undefined>();
  const [showCheckpoints, setShowCheckpoints] = usePanelState('pulse:panel:checkpoints', false);
  const [checkpointVersion, setCheckpointVersion] = useState(0);
  const [showSkills, setShowSkills] = useState(false);
  const [activeSkills, setActiveSkills] = useState<Set<SkillId>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local input state for textarea
  const [input, setInput] = useState("");
  
  // Store the last sent message so we can restore it if stopped
  const [lastSentMessage, setLastSentMessage] = useState<string>("");

  const [showQuickPulseModal, setShowQuickPulseModal] = useState(false);
  const [thinkHarder, setThinkHarder] = useState(false);

  // OpenClaw chat hook
  const {
    messages: useChatMessages,
    sendMessage,
    status,
    setMessages: setUseChatMessages,
    setIsStreaming,
    stop,
    lastError,
    clearError,
  } = useOpenClawChat(conversationId, setConversationId, openclawAgentOverride);

  const isLoading = status === 'streaming' || status === 'submitted';

  const normalizedMessages = useMemo(
    () => normalizeChatMessages(useChatMessages as any[]),
    [useChatMessages]
  );
  const rawMessageById = useMemo(() => {
    const map = new Map<string, any>();
    (useChatMessages || []).forEach((msg: any) => {
      map.set(String(msg.id), msg);
    });
    return map;
  }, [useChatMessages]);

  // Convert useChat messages to local display shape
  const messages: Message[] = normalizedMessages.map((msg) => {
    const raw = rawMessageById.get(msg.id);
    if (!msg.text) {
      console.warn('[ChatInterface] Message has no content:', JSON.stringify(raw ?? msg, null, 2));
    }
    return {
      id: msg.id,
      role: msg.role,
      content: msg.text,
      reasoning: msg.reasoning || undefined,
      timestamp: raw?.createdAt || new Date(),
      cancelled: Boolean(raw?.cancelled),
    };
  });

  const latestThinkingContent = useMemo(() => {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== 'assistant') continue;
      if (i < lastUserIndex) return undefined;
      if (message.reasoning?.trim()) return message.reasoning.trim();
      return undefined;
    }
    return undefined;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = input;
    }
  }, [input]);

  const checkpointItems = useMemo<ChatCheckpoint[]>(() => {
    return listCheckpoints(conversationId);
  }, [conversationId, showCheckpoints, checkpointVersion]);

  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const createCheckpointFromMessage = useCallback((messageId: string, content: string) => {
    if (!conversationId) return;
    const trimmed = (content || '').trim();
    const excerpt = trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed;
    const title = (excerpt.split('\n')[0] || 'Checkpoint').slice(0, 64);
    addCheckpoint({ conversationId, messageId, title, excerpt });
    setCheckpointVersion((v) => v + 1);
    setShowCheckpoints(true);
  }, [conversationId]);

  const jumpToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current[messageId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    healingBowlPlayer.setSound(alertConfig.healingBowlSound);
  }, [alertConfig.healingBowlSound]);

  useEffect(() => {
    const hasUserMessages = messages.some((m) => m.role === "user");
    if (hasUserMessages) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

    // Store the message before sending so we can restore it if stopped
    clearError();
    setLastSentMessage(messageText);
    setShowSuggestions(false);

    try {
      await sendMessage({
        text: messageText
      }, {
        body: {
          conversationId
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
      alert('Failed to send message. Please try again.');
    }

    if (!customMessage) {
      setInput("");
    }
  };

  // Clear lastSentMessage when streaming finishes successfully
  useEffect(() => {
    if (!isLoading && lastSentMessage) {
      // Only clear if we're not in an error state
      setLastSentMessage("");
    }
  }, [isLoading, lastSentMessage]);

  const handleStop = () => {
    // Stop the streaming
    stop();
    setIsStreaming(false);
    
    // Remove any partial assistant message and add a cancelled indicator
    setUseChatMessages((prev: any[]) => {
      const lastMessage = prev[prev.length - 1];
      
      // If there's an incomplete assistant message, replace it with a cancelled message
      if (lastMessage && lastMessage.role === 'assistant' && status === 'streaming') {
        const cancelledMessage: any = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'This message was cancelled',
          createdAt: new Date(),
          cancelled: true, // Flag to mark as cancelled
        };
        return [...prev.slice(0, -1), cancelledMessage];
      }
      
      // If no partial message, just add a cancelled indicator after the last user message
      const lastUserMessage = [...prev].reverse().find((msg: any) => msg.role === 'user');
      if (lastUserMessage) {
        const cancelledMessage: any = {
          id: `cancelled-${Date.now()}`,
          role: 'assistant',
          content: 'This message was cancelled',
          createdAt: new Date(),
          cancelled: true,
        };
        return [...prev, cancelledMessage];
      }
      
      return prev;
    });
    
    // Restore the last sent message to the input box
    if (lastSentMessage) {
      setInput(lastSentMessage);
      setLastSentMessage("");
    }
  };

  const handleCheckTape = async () => {
    setShowSuggestions(false);
    try {
      await sendMessage({
        text: "Check the Tape"
      }, {
        body: { conversationId }
      });
    } catch (error) {
      console.error('Failed to send check tape command:', error);
    }
  };

  const handleDailyRecap = async () => {
    setShowSuggestions(false);
    try {
      await sendMessage({
        text: "Generate daily recap"
      }, {
        body: { conversationId }
      });
    } catch (error) {
      console.error('Failed to send daily recap command:', error);
    }
  };

  const handleQuickPulseComplete = async (result: any) => {
    // Format the analysis result as a markdown message
    const kpiSection = result.kpi ? `
### Key Levels
* **Entry 1:** ${result.kpi.entry1 || 'N/A'}
* **Entry 2:** ${result.kpi.entry2 || 'N/A'}
* **Stop:** ${result.kpi.stop || 'N/A'}
* **Target:** ${result.kpi.target || 'N/A'}
` : '';

    const messageContent = `
## ⚡ Quick Pulse Vision

**Bias:** ${result.bias} ${result.confidence ? `(${result.confidence}%)` : ''}

**Rationale:**
${result.rationale}
${kpiSection}
    `.trim();

    // Append as an assistant message
    // Note: In a real app, you might want to send a 'user' message first saying "Here is a chart..." 
    // but for now we just show the result.
    // Actually, let's send a hidden user message or just the result. 
    // Since sendMessage() sends to the API, we might not want to re-trigger the AI.
    // useChat's sendMessage sends a message. setMessages updates local state.

    // We want to just display it.
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: messageContent,
      timestamp: new Date()
    };

    setUseChatMessages((prev: any[]) => [...prev, newMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with buttons */}
      <div className="bg-transparent">
        <div className="h-14 flex items-center justify-end px-6 mt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSend("Run the NTN report")}
              disabled={isLoading}
              className="px-3 py-1.5 hover:bg-[#D4AF37]/10 disabled:opacity-50 rounded text-[13px] text-zinc-400 hover:text-[#D4AF37] transition-all whitespace-nowrap"
            >
              Run NTN Report
            </button>
            <button
              onClick={() => {
                setUseChatMessages([]);
                clearConversationId();
                setShowSuggestions(true);
              }}
              className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={() => {
                setShowCheckpoints(!showCheckpoints);
              }}
              className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors flex items-center gap-1.5"
              title="Checkpoints (bookmarks) replace thread history"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Checkpoints
            </button>
          </div>
        </div>
      </div>

      {/* Tilt Warning Banner */}
      {tiltWarning?.detected && (
        <div className="bg-orange-500/10 border-b border-orange-500/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-500">
              Emotional Tilt Detected (Score: {((tiltWarning.score ?? 0) * 100).toFixed(0)}%)
            </p>
            <p className="text-xs text-orange-400/80">{tiltWarning.message}</p>
          </div>
        </div>
      )}

      {/* Phase 2: Main body — docked panels + chat (History left, Checkpoints right) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* CENTER: Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 pb-8">
            <div className="max-w-3xl mx-auto space-y-4 mb-8">
              {showSuggestions && messages.length === 0 && (
                <AnalysisGreeting onSend={handleSend} isLoading={isLoading} />
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-xl p-4 backdrop-blur-md
                      ${message.role === "user"
                        ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20"
                        : message.cancelled
                        ? "bg-white/2 border border-white/5 opacity-50"
                        : "bg-white/5 border border-white/10"
                      }
                    `}
                  >
                    <div ref={(el) => { messageRefs.current[message.id] = el; }} />
                    {message.role === "assistant" ? (
                      <div className={`text-sm mb-2 max-w-none ${message.cancelled ? "text-zinc-500 italic" : "text-zinc-300"}`}>
                        {message.cancelled ? (
                          <p className="text-xs">{message.content}</p>
                        ) : (
                          <MessageRenderer
                            content={message.content}
                            onRenderWidget={(_widget: any) => null}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-300 mb-2 whitespace-pre-wrap">{message.content}</p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[9px] font-mono ${message.cancelled ? "text-zinc-700" : "text-zinc-600"}`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {message.role === 'assistant' && !message.cancelled && (
                        <button
                          onClick={() => createCheckpointFromMessage(message.id, message.content)}
                          className="opacity-60 hover:opacity-100 transition-opacity text-zinc-500 hover:text-[#D4AF37]"
                          title="Create checkpoint"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(isLoading || !!latestThinkingContent) && (
                <div className="flex justify-start items-center">
                  <PulseThinkingIndicator
                    isThinking
                    thinkingContent={latestThinkingContent}
                    agentName={activeAgent?.name}
                  />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="pt-4 pb-4 px-4 bg-[#050500]/80 backdrop-blur-md">
            <div className="relative w-full max-w-3xl mx-auto">
              {showSkills && (
                <PulseSkillsPopup
                  open={showSkills}
                  onClose={() => setShowSkills(false)}
                  activeSkills={activeSkills}
                  onToggle={(id) => setActiveSkills((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  })}
                />
              )}
              {lastError && (
                <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {lastError}
                </div>
              )}
              <PulseChatInput
                onSend={(msg) => handleSend(msg)}
                onStop={handleStop}
                isProcessing={isLoading}
                thinkHarder={thinkHarder}
                setThinkHarder={setThinkHarder}
                onOpenSkills={() => setShowSkills((v) => !v)}
                placeholder="Analyze your performance, the news, or the markets..."
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Checkpoints — docked, slides in/out */}
        <div className={`flex-shrink-0 overflow-hidden transition-[width] duration-[240ms] ease-in-out ${showCheckpoints ? 'w-80' : 'w-0'} border-l border-[#D4AF37]/20`}>
          <div className="w-80 h-full flex flex-col bg-[#0a0a00]">
            {/* Header */}
            <div className="h-14 border-b border-[#D4AF37]/20 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-base font-semibold text-[#D4AF37] tracking-wide">Checkpoints</h2>
              </div>
              <button
                onClick={() => setShowCheckpoints(false)}
                className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-[#D4AF37]/70" />
              </button>
            </div>

            {/* Hint bar */}
            <div className="px-4 py-2.5 border-b border-white/5">
              <p className="text-[11px] text-zinc-500 leading-snug">
                Bookmark key moments — hover any assistant reply and tap the checkpoint icon.
              </p>
            </div>

            {/* Checkpoint list — date grouped */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {!conversationId ? (
                <div className="text-center text-zinc-500 text-sm py-8">Start a chat to create checkpoints.</div>
              ) : checkpointItems.length === 0 ? (
                <div className="flex flex-col items-center text-center py-10 px-4 gap-3">
                  <CalendarCheck className="w-8 h-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No checkpoints yet.</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Hover an assistant message and click the <span className="text-[#D4AF37]/80">checkpoint</span> icon to save it here.
                  </p>
                </div>
              ) : (
                groupCheckpointsByDate(checkpointItems).map((group) => (
                  <div key={group.label} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D4AF37]/50">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-[#D4AF37]/10" />
                      <span className="text-[10px] text-zinc-600">{group.items.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((cp) => (
                        <div
                          key={cp.id}
                          className="group relative w-full p-2.5 bg-zinc-900/40 border border-zinc-800/80 hover:border-[#D4AF37]/30 hover:bg-zinc-900/70 rounded-lg transition-all cursor-pointer"
                          onClick={() => jumpToMessage(cp.messageId)}
                        >
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                              {new Date(cp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm text-zinc-200 font-medium truncate">{cp.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed pl-[calc(10px+0.5rem)]">
                            {cp.excerpt}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pl-[calc(10px+0.5rem)]">
                            <button
                              onClick={(e) => { e.stopPropagation(); jumpToMessage(cp.messageId); }}
                              className="px-2 py-0.5 bg-[#D4AF37]/15 text-[#D4AF37] rounded text-[11px] font-medium hover:bg-[#D4AF37]/25 transition-colors"
                            >
                              Jump
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const insert = `Checkpoint: ${cp.title}\n${cp.excerpt}\n`;
                                setInput((prev) => (prev ? `${prev}\n\n${insert}` : insert));
                                setShowCheckpoints(false);
                              }}
                              className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-zinc-400 rounded text-[11px] transition-colors"
                            >
                              Insert
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCheckpoint(cp.id);
                                setCheckpointVersion((v) => v + 1);
                              }}
                              className="ml-auto p-1 hover:bg-[#D4AF37]/10 rounded transition-colors"
                              title="Delete checkpoint"
                            >
                              <Trash2 className="w-3 h-3 text-zinc-600 hover:text-[#D4AF37]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer count */}
            {checkpointItems.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 text-[10px] text-zinc-600 text-center">
                {checkpointItems.length} checkpoint{checkpointItems.length !== 1 ? 's' : ''} saved
              </div>
            )}
          </div>
        </div>

      </div>

      <QuickPulseModal
        isOpen={showQuickPulseModal}
        onClose={() => setShowQuickPulseModal(false)}
        onAnalysisComplete={handleQuickPulseComplete}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analysis Greeting — shown when no messages in Analysis tab          */
/* ------------------------------------------------------------------ */

function AnalysisGreeting({ onSend, isLoading }: { onSend: (msg: string) => void; isLoading: boolean }) {
  let activeAgent: { name: string; icon: string; sector: string; description: string } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = usePulseAgents();
    activeAgent = ctx.activeAgent;
  } catch {
    // Provider not mounted yet — fallback
  }

  const agent = activeAgent || { name: 'Harper', icon: 'H', sector: 'Chief Analyst', description: 'Executive strategy and oversight' };
  const greeting = getGreeting();

  // Role subtitle based on agent
  const getSubtitle = () => {
    switch (agent.name) {
      case 'Harper': return "I'm Harper, your Chief Agentic Officer. What needs orchestrating today?";
      case 'Oracle': return "I'm Oracle, your Market Intelligence Analyst. What data shall we review?";
      case 'Feucht': return "I'm Feucht, your Risk Management Specialist. What exposure needs attention?";
      case 'Sentinel': return "I'm Sentinel, your Compliance Monitor. What needs verification?";
      case 'Charles': return "I'm Charles, your Quantitative Strategist. What patterns should we analyze?";
      case 'Horace': return "I'm Horace, your Portfolio Architect. What allocations need review?";
      default: return `I'm ${agent.name}. What needs orchestrating today?`;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 max-w-[580px] mx-auto w-full">
      {/* Agent name — large, centered, no icon */}
      <div className="flex flex-col items-center gap-2.5">
        <h2 className="text-[22px] font-semibold text-white tracking-tight">{agent.name}</h2>

        {/* Anthropic model badge */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-[14px] h-[14px] rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#D97757' }}
          >
            <span style={{ fontSize: '7px', color: 'white', fontWeight: 800, lineHeight: 1 }}>A</span>
          </div>
          <span className="text-[12px] font-medium" style={{ color: '#D97757' }}>
            Claude Opus 4.6
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[13px] text-gray-500 mt-0.5">{getSubtitle()}</p>
      </div>

      {/* Large greeting */}
      <h1 className="text-[26px] font-bold text-white tracking-tight text-center leading-snug mt-1">
        {greeting}
      </h1>

      {/* Suggestion chips — 2×2 grid, card style with icons */}
      <div className="grid grid-cols-2 gap-3 w-full mt-3">
        {SUGGESTION_CHIPS.map((chip, index) => {
          const Icon = chip.icon;
          return (
            <button
              key={index}
              onClick={() => onSend(chip.prompt)}
              disabled={isLoading}
              className="flex items-center gap-3 px-4 py-3.5 bg-transparent border border-white/10 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 disabled:opacity-50 rounded-xl text-left transition-all group"
            >
              <Icon className="w-[18px] h-[18px] text-gray-500 group-hover:text-[#D4AF37] transition-colors shrink-0" />
              <span className="text-[13px] text-zinc-300 group-hover:text-white transition-colors">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
