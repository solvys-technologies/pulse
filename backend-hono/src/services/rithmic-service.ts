/**
 * Rithmic Service
 * Stub for Rithmic broker integration; no real API calls yet.
 */

import type { RithmicConnectionStatus } from '../types/rithmic.js';

export function hasCredentials(_userId: string): boolean {
  return false
}

export function getConnectionStatus(_userId: string): RithmicConnectionStatus {
  return {
    connected: false,
    message: 'Rithmic not configured',
  }
}

export async function executeOrder(
  _userId: string,
  _params: { symbol: string; direction: 'long' | 'short'; quantity: number; [key: string]: unknown }
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  return { success: false, error: 'Rithmic execution not implemented' }
}
