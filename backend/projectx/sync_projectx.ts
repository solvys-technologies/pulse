import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { getProjectXCredentials } from "./credentials";
import { db } from "../db";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";

interface SyncProjectXAccountsResponse {
  success: boolean;
  accountsSynced: number;
}

export const syncProjectXAccounts = api<void, SyncProjectXAccountsResponse>(
  { method: "POST", path: "/projectx/sync", auth: true, expose: true },
  async (): Promise<SyncProjectXAccountsResponse> => {
    const auth = getAuthData()!;

    try {
      // Get credentials
      const { username, apiKey } = await getProjectXCredentials(auth.userID);

      // Pass credentials to searchAccounts
      // Note: We need to update existing searchAccounts signature to accept username/apiKey
      // Currently in projectx_client.ts: searchAccounts(onlyActive: boolean = true)
      // I'll need to update projectx_client.ts as well to accept credentials
      // But wait! projectx_client.ts helper `searchAccounts` implementation calls `getAuthToken()` which automatically
      // uses the global secrets if no args are passed.
      // I should update `projectx_client.ts` to allow passing credentials to `searchAccounts` too.
      // Checking projectx_client.ts... searchAccounts currently takes only (onlyActive).
      // I need to update projectx_client.ts first or hack it. I'll update projectx_client.ts properly.

      // Assuming I'll update projectx_client.ts to: searchAccounts(onlyActive: boolean, username?: string, apiKey?: string)
      const accounts = await projectx.searchAccounts(true, username, apiKey);

      let synced = 0;

      for (const account of accounts) {
        await db.exec`
          INSERT INTO broker_accounts (
            connection_id, user_id, account_id, account_name, account_type,
            balance, equity, margin_used, buying_power, last_synced_at
          )
          VALUES (
            0,
            ${auth.userID},
            ${account.id.toString()},
            ${account.name},
            'live',
            ${account.balance},
            ${account.balance},
            0,
            ${account.balance},
            NOW()
          )
          ON CONFLICT (user_id, account_id)
          DO UPDATE SET
            account_name = EXCLUDED.account_name,
            balance = EXCLUDED.balance,
            equity = EXCLUDED.equity,
            buying_power = EXCLUDED.buying_power,
            last_synced_at = EXCLUDED.last_synced_at,
            updated_at = NOW()
        `;

        // If this is a tradeable account, update the main balance record too
        if (account.canTrade) {
          await db.exec`
            INSERT INTO accounts (user_id, balance, equity, margin_used, daily_pnl, total_pnl)
            VALUES (${auth.userID}, ${account.balance}, ${account.balance}, 0, 0, 0)
            ON CONFLICT (user_id)
            DO UPDATE SET
              balance = EXCLUDED.balance,
              equity = EXCLUDED.equity,
              updated_at = NOW()
          `;
        }

        synced++;
      }

      log.info("ProjectX accounts synced", {
        userId: auth.userID,
        accountCount: synced,
      });

      return { success: true, accountsSynced: synced };
    } catch (error) {
      log.error("Failed to sync ProjectX accounts", { error, userId: auth.userID });
      // Don't fail the whole request, just return 0 synced but log error
      // Actually throwing error might be better for UI feedback if credentials are wrong
      if (error instanceof Error && error.message.includes("credentials")) {
        throw error;
      }
      return { success: false, accountsSynced: 0 };
    }
  }
);
