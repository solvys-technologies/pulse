import { BoardroomChat } from './BoardroomChat';
import { InterventionSidebar } from './InterventionSidebar';
import { useBoardroom } from '../hooks/useBoardroom';

export function BoardroomView() {
  const { messages, interventionMessages, status, loading, sending, sendIntervention, sendMention } =
    useBoardroom();

  return (
    <div className="h-full w-full flex">
      <div className="flex-[2] min-w-0">
        <BoardroomChat
          messages={messages}
          loading={loading}
          active={status.boardroomActive}
        />
      </div>

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
