// [claude-code 2026-03-06] Auto-update banner — checks GitHub for new versions, prompts user to update
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes

interface VersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/version/check`);
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo;
        if (data.updateAvailable) setUpdate(data);
      } catch {
        // Silently fail — version check is non-critical
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!update?.updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-4 px-4 py-2 bg-[var(--pulse-accent)]/10 border-b border-[var(--pulse-accent)]/20 backdrop-blur-sm">
      <span className="text-[12px] text-[var(--pulse-accent)]">
        Pulse {update.latest} is available (you're on {update.current})
      </span>
      <a
        href="https://github.com/solvys-technologies/pulse/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-0.5 rounded text-[11px] font-medium bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/30 transition-colors"
      >
        Update
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        dismiss
      </button>
    </div>
  );
}
