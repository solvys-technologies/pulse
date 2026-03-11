// [claude-code 2026-03-09] ERStoreAdapter singleton factory — swap here for Postgres migration
import type { ERStoreAdapter } from './adapter.js';
import { NotionERAdapter } from './notion-adapter.js';

let _adapter: ERStoreAdapter | null = null;

export function getERStoreAdapter(): ERStoreAdapter {
  if (!_adapter) {
    _adapter = new NotionERAdapter();
  }
  return _adapter;
}
