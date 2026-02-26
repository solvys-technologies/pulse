import { useState } from 'react';
import { History, Radio } from 'lucide-react';
import { BoardroomChat } from './BoardroomChat';
import { InterventionSidebar } from './InterventionSidebar';
import { BoardroomThreadList } from './boardroom/BoardroomThreadList';
import { BoardroomThreadReplay } from './boardroom/BoardroomThreadReplay';
import { useBoardroom } from '../hooks/useBoardroom';
import type { BoardroomThread } from '../lib/boardroomThreadStore';

type ViewMode = 'live' | 'history' | 'replay';

export function BoardroomView() {
  const {
    messages,
    interventionMessages,
    status,
    loading,
    sending,
    sendIntervention,
    sendMention,
    threadRefreshKey,
  } = useBoardroom();

  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [selectedThread, setSelectedThread] = useState<BoardroomThread | null>(null);

  const handleSelectThread = (thread: BoardroomThread) => {
    setSelectedThread(thread);
    setViewMode('replay');
  };

  const handleBackFromReplay = () => {
    setSelectedThread(null);
    setViewMode('history');
  };

  const handleBackToLive = () => {
    setSelectedThread(null);
    setViewMode('live');
  };

  // Replay view — full screen
  if (viewMode === 'replay' && selectedThread) {
    return (
      <div className="h-full w-full">
        <BoardroomThreadReplay thread={selectedThread} onBack={handleBackFromReplay} />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex">
      {/* Main panel: live chat or thread history */}
      <div className="flex-[2] min-w-0 flex flex-col">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-[#D4AF37]/10">
          <button
            onClick={handleBackToLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'live'
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Radio className="w-3 h-3" />
            Live
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <History className="w-3 h-3" />
            Thread History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {viewMode === 'live' ? (
            <BoardroomChat
              messages={messages}
              loading={loading}
              active={status.boardroomActive}
            />
          ) : (
            <div className="p-4 h-full overflow-hidden">
              <BoardroomThreadList
                onSelectThread={handleSelectThread}
                refreshKey={threadRefreshKey}
              />
            </div>
          )}
        </div>
      </div>

      {/* Intervention sidebar — always visible in live/history mode */}
      <div className="w-[360px] border-l border-[#D4AF37]/15">
        <InterventionSidebar
          messages={interventionMessages}
          sending={sending}
          onSend={sendIntervention}
          onMention={sendMention}
          active={status.interventionActive}
          title="Intervention"
        />
      </div>
    </div>
  );
}
