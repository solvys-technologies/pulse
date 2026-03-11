// [claude-code 2026-03-09] Earnings Review history types — psych journaling for earnings events

export interface EarningsReview {
  id: string;
  symbol: string;
  earningsDate: string;
  setupType: string;
  direction: 'long' | 'short' | 'flat';
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  emotionalState: string;
  thesis: string;
  postReview: string;
  lessons: string[];
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  tags: string[];
  notionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EarningsHistoryFilter {
  symbol?: string;
  setupType?: string;
  dateFrom?: string;
  dateTo?: string;
  grade?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}

export interface EarningsHistoryPage {
  items: EarningsReview[];
  total: number;
  hasMore: boolean;
}

export interface EarningsReviewCreate {
  symbol: string;
  earningsDate: string;
  setupType: string;
  direction: 'long' | 'short' | 'flat';
  emotionalState?: string;
  thesis: string;
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  postReview?: string;
  lessons?: string[];
  grade?: string;
  tags?: string[];
}

export interface EarningsReviewUpdate {
  postReview?: string;
  emotionalState?: string;
  lessons?: string[];
  grade?: string;
  tags?: string[];
  exitPrice?: number;
  pnl?: number;
}

export interface EarningsContextRequest {
  symbol?: string;
  query?: string;
  maxTokens?: number;
  limit?: number;
}

export interface EarningsContextResponse {
  reviews: EarningsReview[];
  totalMatched: number;
  tokenEstimate: number;
  truncated: boolean;
}
