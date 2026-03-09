// [claude-code 2026-02-26] Replace boardroom chat/history with Notion iframe + countdown timer.

import { useEffect, useMemo, useState } from 'react';
import { InterventionSidebar } from './InterventionSidebar';
import { useBoardroom } from '../hooks/useBoardroom';
import { EmbeddedBrowserFrame } from './layout/EmbeddedBrowserFrame';
import { useSettings } from '../contexts/SettingsContext';

type BoardroomMeetingSchedule = {
  nowIso: string;
  lastMeetingIso: string;
  nextMeetingIso: string;
  meetingWindowMinutes: number;
  live: boolean;
  source: 'cron' | 'fallback';
};

export function BoardroomView() {
  const {
    interventionMessages,
    status,
    sending,
    sendIntervention,
    sendMention,
  } = useBoardroom();

  const { iframeUrls } = useSettings();
  const notionBoardroomUrl =
    iframeUrls.boardroom ||
    import.meta.env.VITE_NOTION_BOARDROOM_URL ||
    'https://www.notion.so/d0b5029cf01f4a5d86932ea0c138d44f';

  const [meetingSchedule, setMeetingSchedule] = useState<BoardroomMeetingSchedule | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSchedule = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/boardroom/meeting-schedule`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        });
        if (!res.ok) return;
        const json = (await res.json()) as BoardroomMeetingSchedule;
        if (!cancelled) setMeetingSchedule(json);
      } catch {
        // best-effort
      }
    };

    fetchSchedule();
    const id = window.setInterval(fetchSchedule, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const nextMeeting = useMemo(() => {
    if (meetingSchedule?.nextMeetingIso) {
      const d = new Date(meetingSchedule.nextMeetingIso);
      if (!Number.isNaN(d.getTime())) return d;
    }

    const explicit = import.meta.env.VITE_BOARDROOM_NEXT_MEETING_ISO as string | undefined;
    if (explicit) {
      const d = new Date(explicit);
      if (!Number.isNaN(d.getTime())) return d;
    }

    const hourRaw = import.meta.env.VITE_BOARDROOM_MEETING_HOUR_LOCAL as string | undefined;
    const hour = Number.isFinite(Number(hourRaw)) ? Number(hourRaw) : 9;

    const now = new Date();
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }, [meetingSchedule?.nextMeetingIso]);

  const countdownText = useMemo(() => {
    const diffMs = nextMeeting.getTime() - nowMs;
    if (diffMs <= 0) return 'Next boardroom: now';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `Next boardroom: ${hh}:${mm}:${ss}`;
  }, [nextMeeting, nowMs]);

  const isLive = meetingSchedule?.live ?? (nextMeeting.getTime() - nowMs <= 0);

  return (
    <div className="h-full w-full flex">
      {/* Main panel: Notion iframe + countdown */}
      <div className="flex-[2] min-w-0 flex flex-col">
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D4AF37]/10">
          <div className="flex items-baseline gap-3 min-w-0">
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D4AF37]">
              Board Room
            </div>
            <div className="text-xs text-gray-300 truncate" title={countdownText}>
              {countdownText}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-green-400' : 'bg-gray-600'
              }`}
              aria-label={isLive ? 'Live' : 'Inactive'}
              title={isLive ? 'Live' : 'Inactive'}
            />
            <div className={`text-[11px] ${isLive ? 'text-green-300' : 'text-gray-500'}`}>
              {isLive ? 'Live' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Notion iframe; URL from VITE_NOTION_BOARDROOM_URL. If embed fails, open in browser. */}
        <div className="flex-1 min-h-0 w-full bg-white relative">
          <EmbeddedBrowserFrame
            title="Boardroom (Notion)"
            src={notionBoardroomUrl}
            className="w-full h-full bg-white"
          />
          <a
            href={notionBoardroomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 text-[10px] text-gray-500 hover:text-[#D4AF37] transition-colors"
          >
            Open in browser
          </a>
        </div>
      </div>

      {/* Intervention sidebar */}
      <div className="w-[360px] border-l border-[#D4AF37]/15">
        <InterventionSidebar
          messages={interventionMessages}
          sending={sending}
          onSend={sendIntervention}
          onMention={sendMention}
          active={status.interventionActive}
        />
      </div>
    </div>
  );
}
