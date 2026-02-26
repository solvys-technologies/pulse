/**
 * ChatInterface Component
 * v2.28.6 Refactor
 */
/**
 * ChatInterface Component
 * Simplified for local single-user mode - no authentication
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Paperclip, Image, FileText, Link2, AlertTriangle, TrendingUp, History, X, Pin, Archive, Edit2, MoreVertical, Square, BarChart3, CalendarCheck, Brain, Eye } from "lucide-react";
import { useOpenClawChat } from "./chat/hooks/useOpenClawChat";
import { useBackend } from "../lib/backend";
import { healingBowlPlayer } from "../utils/healingBowlSounds";
import { useSettings } from "../contexts/SettingsContext";
import ReactMarkdown from "react-markdown";
import { MessageRenderer } from "./chat/MessageRenderer";
import QuickPulseModal from "./analysis/QuickPulseModal";
import { PulseChatInput } from "./chat/PulseChatInput";
import { usePulseAgents } from "../contexts/PulseAgentContext";


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

const THINKING_TERMS = [
  "finagling",
  "polagaling",
  "doodling",
  "tinkering",
  "pondering",
  "mulling",
  "ruminating",
  "contemplating",
  "considering",
  "weighing",
  "deliberating",
  "reflecting",
  "analyzing",
  "assessing",
  "evaluating",
  "bullish momentum",
  "uptrend confirmation",
  "breakout potential",
  "accumulation phase",
  "support holding",
  "resistance breaking",
  "volume expansion",
  "liquidity building",
  "risk-on sentiment",
  "fundamental strength",
  "earnings beat",
  "guidance raise",
  "positive catalyst",
  "momentum building",
];

interface ConversationSession {
  conversationId: string;
  updatedAt: Date;
  messageCount: number;
  preview: string;
  erStatus?: "Stable" | "Tilt" | "Neutral";
  pnl?: number;
  isArchived?: boolean;
  isPinned?: boolean;
  customName?: string;
  isStale?: boolean; // Stale after 24 hours
}

export default function ChatInterface() {
  const backend = useBackend();
  const { alertConfig } = useSettings();
  // Local mode - always authenticated
  const isSignedIn = true;
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [thinkingText, setThinkingText] = useState("");
  const [tiltWarning, setTiltWarning] = useState<TiltWarning | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
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
  } = useOpenClawChat(conversationId, setConversationId);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Debug: log raw messages from useChat
  console.log('[ChatInterface] useChatMessages:', JSON.stringify(useChatMessages, null, 2));
  console.log('[ChatInterface] status:', status);

  // Convert useChat messages to our Message format for display
  const messages: Message[] = (useChatMessages || [])
    .filter((msg: any) => msg.role !== 'system')
    .map((msg: any) => {
      // Handle potential parts array if present (multi-modal) or fallback to content string
      // The AI SDK Message type might have parts or content.
      let content = msg.content || '';
      
      // Try extracting from parts array (UI message format)
      if (msg.parts && Array.isArray(msg.parts)) {
        const textParts = msg.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('');
        if (textParts) content = textParts;
      }
      
      // Fallback: if still empty, try text property
      if (!content && msg.text) {
        content = msg.text;
      }
      
      // Debug log for message structure
      if (!content) {
        console.warn('[ChatInterface] Message has no content:', JSON.stringify(msg, null, 2));
      }

      return {
        id: msg.id,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: content || '', // Ensure never undefined
        timestamp: msg.createdAt || new Date(),
        cancelled: msg.cancelled || false, // Preserve cancelled flag
      };
    });

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

  useEffect(() => {
    healingBowlPlayer.setSound(alertConfig.healingBowlSound);
  }, [alertConfig.healingBowlSound]);

  useEffect(() => {
    if (!isLoading) {
      setThinkingText("");
      return;
    }
    let currentIndex = 0;
    setThinkingText(THINKING_TERMS[0]);
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % THINKING_TERMS.length;
      setThinkingText(THINKING_TERMS[currentIndex]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const hasUserMessages = messages.some((m) => m.role === "user");
    if (hasUserMessages) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const loadConversationHistory = async () => {
    if (!isSignedIn) {
      setConversations([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const response = await backend.ai.listConversations();
      const conversationsList = Array.isArray(response) ? response : [];
      const enrichedConversations = await Promise.all(
        conversationsList.map(async (conv: any) => {
          const now = new Date();
          const convDate = new Date(conv.updatedAt);
          const hoursSinceUpdate = (now.getTime() - convDate.getTime()) / (1000 * 60 * 60);
          const isStale = hoursSinceUpdate > 24;

          let erStatus: "Stable" | "Tilt" | "Neutral" | undefined;
          let pnl: number | undefined;

          try {
            const erSessions = await backend.er.getERSessions();
            const convDay = new Date(conv.updatedAt).toDateString();
            const sessions = Array.isArray(erSessions) ? erSessions : [];
            const sessionForDay = sessions.find(
              (s: any) => new Date(s.sessionStart).toDateString() === convDay
            );
            if (sessionForDay) {
              erStatus = sessionForDay.finalScore > 0.5 ? "Stable" : sessionForDay.finalScore < -0.5 ? "Tilt" : "Neutral";
            }
            const account = await backend.account.get();
            pnl = account.dailyPnl;
          } catch (error) { }

          return {
            ...conv,
            erStatus,
            pnl,
            isStale,
            isArchived: false,
            isPinned: false,
            customName: undefined,
          };
        })
      );
      setConversations(enrichedConversations);
    } catch (error) {
      console.error("Failed to load conversation history:", error);
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleArchiveConversation = (convId: string) => {
    setConversations(prev => prev.map(c =>
      c.conversationId === convId ? { ...c, isArchived: !c.isArchived } : c
    ));
  };

  const handlePinConversation = (convId: string) => {
    setConversations(prev => prev.map(c =>
      c.conversationId === convId ? { ...c, isPinned: !c.isPinned } : c
    ));
  };

  const handleRenameConversation = (convId: string, newName: string) => {
    setConversations(prev => prev.map(c =>
      c.conversationId === convId ? { ...c, customName: newName } : c
    ));
    setEditingConversationId(null);
    setRenameValue("");
  };

  const formatSessionTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const loadConversation = async (convId: string) => {
    const conv = conversations.find(c => c.conversationId === convId);
    if (conv?.isStale) {
      alert("This chat thread has gone stale after 24 hours. You can view it, but cannot send new messages. Start a new chat to continue the conversation.");
    }

    setShowHistory(false);
    try {
      const response = await backend.ai.getConversation(convId);
      const loadedMessages = (response.messages || []).map((msg: any, idx: number) => ({
        id: `${convId}-${idx}`,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        createdAt: new Date(),
      }));
      setUseChatMessages(loadedMessages);
      setConversationId(convId);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      loadConversationHistory();
    } else {
      setConversations([]);
    }
  }, [isSignedIn]);

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

    if (conversationId) {
      const conv = conversations.find(c => c.conversationId === conversationId);
      if (conv?.isStale) {
        alert("This chat thread has gone stale after 24 hours. You cannot send new messages in this thread.");
        return;
      }
    }

    // Store the message before sending so we can restore it if stopped
    setLastSentMessage(messageText);
    setShowSuggestions(false);
    setThinkingText(THINKING_TERMS[0]);

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
                setConversationId(undefined);
                setShowSuggestions(true);
              }}
              className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) {
                  loadConversationHistory();
                }
              }}
              className="px-3 py-1.5 hover:bg-white/5 rounded text-xs font-medium text-zinc-400 whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              History
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

      {/* Conversation History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="w-80 bg-[#0a0a00] border-l border-[#D4AF37]/20 flex flex-col">
            <div className="h-16 border-b border-[#D4AF37]/20 flex items-center justify-between px-4">
              <h2 className="text-lg font-semibold text-[#D4AF37]">Conversation History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-[#D4AF37]/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-[#D4AF37]" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4 space-y-2">
              {loadingHistory ? (
                <div className="text-center text-zinc-500 text-sm py-8">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-8">No previous conversations</div>
              ) : (
                conversations
                  .sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                  })
                  .filter(c => !c.isArchived)
                  .map((conv) => {
                    const convDate = new Date(conv.updatedAt);
                    const isStale = conv.isStale || false;
                    const erStatus = conv.erStatus || "Neutral";
                    const pnl = conv.pnl || 0;
                    const erColor = erStatus === "Stable" ? "text-emerald-400" : erStatus === "Tilt" ? "text-red-500" : "text-zinc-400";
                    const pnlColor = pnl >= 0 ? "text-emerald-400" : "text-red-500";
                    const isEditing = editingConversationId === conv.conversationId;

                    return (
                      <div
                        key={conv.conversationId}
                        className={`group relative w-full p-3 bg-zinc-900/50 border ${isStale ? "border-zinc-700/50 opacity-60" : "border-zinc-800"
                          } hover:border-[#D4AF37]/40 hover:bg-zinc-900 rounded-lg transition-all ${isStale ? "cursor-not-allowed" : ""}`}
                      >
                        {isStale && (
                          <div className="text-xs text-amber-500 mb-2 font-medium">
                            ⚠️ Chat threads go stale after 24 hours
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-xs text-zinc-400 mb-1">
                              {convDate.toLocaleDateString()} {formatSessionTime(convDate)}
                            </div>
                            <div className="flex items-center gap-3 text-xs mb-1">
                              <span className={erColor}>
                                ER: {erStatus}
                              </span>
                              <span className={pnlColor}>
                                P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                              </span>
                            </div>
                            {conv.customName ? (
                              <div className="text-sm text-zinc-300 font-medium mb-1">{conv.customName}</div>
                            ) : (
                              conv.preview && (
                                <div className="text-sm text-zinc-300 truncate">{conv.preview}...</div>
                              )
                            )}
                            <div className="text-xs text-zinc-500">{conv.messageCount} messages</div>
                          </div>
                          {conv.isPinned && (
                            <Pin className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                          )}
                        </div>
                        {!isStale && (
                          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePinConversation(conv.conversationId);
                              }}
                              className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
                              title={conv.isPinned ? "Unpin" : "Pin"}
                            >
                              <Pin className={`w-3.5 h-3.5 ${conv.isPinned ? "text-[#D4AF37] fill-[#D4AF37]" : "text-zinc-400"}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConversationId(conv.conversationId);
                                setRenameValue(conv.customName || "");
                              }}
                              className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveConversation(conv.conversationId);
                              }}
                              className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          </div>
                        )}
                        {isEditing && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleRenameConversation(conv.conversationId, renameValue);
                                }
                                if (e.key === "Escape") {
                                  setEditingConversationId(null);
                                  setRenameValue("");
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameConversation(conv.conversationId, renameValue)}
                              className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded text-xs"
                            >
                              Save
                            </button>
                          </div>
                        )}
                        {!isStale && (
                          <button
                            onClick={() => loadConversation(conv.conversationId)}
                            className="absolute inset-0 w-full h-full opacity-0"
                          />
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

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
                {message.role === "assistant" ? (
                  <div className={`text-sm mb-2 max-w-none ${message.cancelled ? "text-zinc-500 italic" : "text-zinc-300"}`}>
                    {message.cancelled ? (
                      <p className="text-xs">{message.content}</p>
                    ) : (
                      <MessageRenderer
                        content={message.content}
                        onRenderWidget={(widget: any) => null}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-300 mb-2 whitespace-pre-wrap">{message.content}</p>
                )}
                <span className={`text-[9px] font-mono ${message.cancelled ? "text-zinc-700" : "text-zinc-600"}`}>
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start items-center gap-3">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/40 animate-ping"></div>
                <div className="absolute inset-1 rounded-full border-2 border-[#D4AF37]/60 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full bg-[#D4AF37]/20"></div>
              </div>
              <span className="text-sm text-[#D4AF37] font-medium">{thinkingText}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — PulseChatInput */}
      <div className="sticky bottom-0 pt-4 pb-4 px-4 bg-[#050500]/80 backdrop-blur-md">
        <div className="w-full max-w-3xl mx-auto">
          <PulseChatInput
            onSend={(msg) => handleSend(msg)}
            onStop={handleStop}
            isProcessing={isLoading}
            thinkHarder={thinkHarder}
            setThinkHarder={setThinkHarder}
            placeholder="Analyze your performance, the news, or the markets..."
          />
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

