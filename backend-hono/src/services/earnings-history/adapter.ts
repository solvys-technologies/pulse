// [claude-code 2026-03-09] ERStoreAdapter interface — clean boundary for Postgres migration
import type {
  EarningsReview,
  EarningsHistoryFilter,
  EarningsHistoryPage,
  EarningsReviewCreate,
  EarningsReviewUpdate,
} from '../../types/earnings-history.js';

export interface ERStoreAdapter {
  list(filter: EarningsHistoryFilter): Promise<EarningsHistoryPage>;
  getById(id: string): Promise<EarningsReview | null>;
  create(data: EarningsReviewCreate): Promise<EarningsReview>;
  update(id: string, data: EarningsReviewUpdate): Promise<EarningsReview | null>;
  delete(id: string): Promise<boolean>;
  searchByRelevance(query: string, symbol?: string, limit?: number): Promise<EarningsReview[]>;
  ensureDatabase(): Promise<string>;
}
