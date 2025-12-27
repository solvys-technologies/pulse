/**
 * API Type Definitions
 * 
 * These types match the expected API responses from your Hono backend.
 * Update these to match your actual backend response types.
 */

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  publishedAt: Date | string;
  impact?: 'high' | 'medium' | 'low';
  symbols?: string[];
}

export interface Account {
  id: string;
  userId: string;
  balance: number;
  dailyPnl: number;
  dailyTarget?: number;
  dailyLossLimit?: number;
  tier?: 'free' | 'pulse' | 'pulse_plus' | 'pulse_pro';
  tradingEnabled?: boolean;
  autoTrade?: boolean;
  riskManagement?: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  side: 'long' | 'short';
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  tiltWarning?: {
    detected: boolean;
    message?: string;
  };
}

export interface NTNReport {
  report: {
    content: string;
  };
}

export interface ProjectXAccount {
  accountId: string;
  accountName: string;
  balance?: number;
}
