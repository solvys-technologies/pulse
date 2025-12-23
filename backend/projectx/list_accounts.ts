import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";

export interface BrokerAccount {
  id: number;
  accountId: string;
  accountName: string;
  accountType?: string;
  balance: number;
  equity: number;
  marginUsed: number;
  buyingPower: number;
  provider: string;
  isPaper: boolean;
  lastSyncedAt?: Date;
}

interface ListAccountsResponse {
  accounts: BrokerAccount[];
}

export const listAccounts = api<void, ListAccountsResponse>(
  { method: "GET", path: "/projectx/accounts", auth: true, expose: true },
  async () => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1ddc4bf4-fc04-438b-b267-60f40fbd0c54', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'list_accounts.ts:25', message: 'API endpoint called', data: { endpoint: '/projectx/accounts', method: 'GET' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const auth = getAuthData()!;

    const rows = await db.rawQueryAll<{
      id: number;
      account_id: string;
      account_name: string;
      account_type: string | null;
      balance: number;
      equity: number;
      margin_used: number;
      buying_power: number;
      last_synced_at: Date | null;
    }>`
      SELECT 
        id,
        account_id,
        account_name,
        account_type,
        balance,
        equity,
        margin_used,
        buying_power,
        last_synced_at
      FROM broker_accounts
      WHERE user_id = ${auth.userID}
      ORDER BY created_at DESC
    `;

    return {
      accounts: rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        accountName: row.account_name,
        accountType: row.account_type || undefined,
        balance: row.balance,
        equity: row.equity,
        marginUsed: row.margin_used,
        buyingPower: row.buying_power,
        provider: 'projectx',
        isPaper: false,
        lastSyncedAt: row.last_synced_at || undefined,
      })),
    };
  }
);
