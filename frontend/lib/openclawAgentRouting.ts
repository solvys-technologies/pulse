export type PulseAgentId = string;

/**
 * Map Pulse UI agents to OpenClaw agent roles.
 * We keep this intentionally string-based to avoid importing backend types.
 */
export function toOpenClawAgentOverride(pulseAgentId: PulseAgentId | undefined | null): string | undefined {
  if (!pulseAgentId) return undefined;

  switch (pulseAgentId) {
    case 'harper':
      return 'harper-cao';
    case 'oracle':
      return 'pma-1';
    case 'charles':
      return 'pma-2';
    case 'feucht':
      return 'futures-desk';
    case 'sentinel':
      return 'fundamentals-desk';
    case 'horace':
      return 'harper-cao';
    default:
      return undefined;
  }
}

// [claude-code 2026-03-09] Added surfaceId for per-surface session isolation (no context bleed)
export function openClawConversationStorageKey(
  pulseAgentId: PulseAgentId | undefined | null,
  surfaceId?: string,
): string {
  const agent = pulseAgentId ?? 'default';
  return surfaceId
    ? `pulse_openclaw_conversation:${surfaceId}:${agent}`
    : `pulse_openclaw_conversation:${agent}`;
}

