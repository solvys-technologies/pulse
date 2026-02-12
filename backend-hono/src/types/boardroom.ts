/**
 * Boardroom types
 * Shared backend contracts for boardroom and intervention messages.
 */

export type BoardroomAgent =
  | 'Oracle'
  | 'Feucht'
  | 'Sentinel'
  | 'Charles'
  | 'Horace'
  | 'Harper'
  | 'Unknown';

export interface BoardroomMessage {
  id: string;
  agent: BoardroomAgent;
  emoji: string;
  content: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
}

export interface InterventionMessage {
  id: string;
  sender: 'User' | 'Harper' | 'Unknown';
  content: string;
  timestamp: string;
}
