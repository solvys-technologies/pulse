// [claude-code 2026-03-13] Track 1: Trader nametag with gold gloss shimmer effect
export function TraderNametag({ name }: { name: string }) {
  if (!name) return null;

  return (
    <div
      className="relative bg-[var(--pulse-bg)] border border-[var(--pulse-accent)]/20 rounded-lg px-3 h-8 flex items-center overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(199,159,74,0.25)' }}
    >
      <span className="relative z-10 text-[13px] font-semibold tracking-[0.18em] text-[var(--pulse-accent)] uppercase select-none">
        {name}
      </span>
      <div
        className="absolute inset-0 z-0 nametag-shimmer"
        style={{
          background: 'linear-gradient(135deg, rgba(199,159,74,0.15) 0%, transparent 50%, rgba(199,159,74,0.08) 100%)',
          backgroundSize: '200% 100%',
        }}
      />
      <style>{`
        @keyframes nametag-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .nametag-shimmer {
          animation: nametag-shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
