export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'infraction';

export type VoiceRuntimeState = Exclude<VoiceOrbState, 'infraction'>;

export const VOICE_ORB_COLORS = {
  idle: '#c79f4a',
  listening: '#22c55e',
  thinking: '#c79f4a',
  speaking: '#d4c9a8',
  infraction: '#ef4444',
} as const;

export function resolveVoiceOrbState(runtimeState: VoiceRuntimeState, hasRecentInfraction: boolean): VoiceOrbState {
  if (hasRecentInfraction) return 'infraction';
  if (runtimeState === 'thinking') return 'thinking';
  if (runtimeState === 'speaking') return 'speaking';
  if (runtimeState === 'listening') return 'listening';
  return 'idle';
}

export function getVoiceOrbColor(state: VoiceOrbState): string {
  return VOICE_ORB_COLORS[state];
}
