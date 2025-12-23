import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { connectUserHub, disconnectUserHub } from "./signalr_client";
import * as cache from "../cache";

interface UplinkResponse {
  success: boolean;
  accountsSynced: number;
  message: string;
}

export const uplinkProjectX = api<void, UplinkResponse>(
  { method: "POST", path: "/projectx/uplink", auth: true, expose: true },
  async (): Promise<UplinkResponse> => {
    const auth = getAuthData()!;

    try {
      const accounts = await projectx.searchAccounts(true);

      if (accounts.length === 0) {
        return {
          success: false,
          accountsSynced: 0,
          message: "No active accounts found in ProjectX",
        };
      }

      let synced = 0;
      let primaryAccountId: number | null = null;

      for (const account of accounts) {
        if (!account.isVisible) continue;

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

        if (account.canTrade && primaryAccountId === null) {
          primaryAccountId = account.id;

          await db.exec`
            INSERT INTO accounts (user_id, balance, equity, margin_used, daily_pnl, total_pnl, projectx_account_id)
            VALUES (${auth.userID}, ${account.balance}, ${account.balance}, 0, 0, 0, ${primaryAccountId})
            ON CONFLICT (user_id)
            DO UPDATE SET
              balance = EXCLUDED.balance,
              equity = EXCLUDED.equity,
              projectx_account_id = EXCLUDED.projectx_account_id,
              updated_at = NOW()
          `;
        }

        synced++;
      }

      if (primaryAccountId) {
        try {
          await connectUserHub(primaryAccountId, {
            onAccount: async (data) => {
              log.info("Account update received", { data });

              if (data.accountId === primaryAccountId) {
                await db.exec`
                  UPDATE accounts
                  SET balance = ${data.balance || 0},
                      equity = ${data.equity || 0},
                      margin_used = ${data.marginUsed || 0},
                      updated_at = NOW()
                  WHERE user_id = ${auth.userID}
                `;

                await cache.del(`account:${auth.userID}`);
              }
            },
            onPosition: async (data) => {
              log.info("Position update received", { data });
            },
            onOrder: async (data) => {
              log.info("Order update received", { data });
            },
            onTrade: async (data) => {
              log.info("Trade update received", { data });
            },
          });

          log.info("Real-time uplink established", {
            userId: auth.userID,
            accountId: primaryAccountId,
            accountCount: synced,
          });
        } catch (error) {
          log.error("Failed to establish real-time uplink", { error });
        }
      }

      return {
        success: true,
        accountsSynced: synced,
        message: `Uplink established: ${synced} account${synced !== 1 ? 's' : ''} synced`,
      };
    } catch (error) {
      log.error("Failed to uplink ProjectX", { error, userId: auth.userID });
      const errorMessage = error instanceof Error ? error.message : "Failed to establish uplink";

      if (errorMessage.includes("ProjectX credentials not configured")) {
        return {
          success: false,
          accountsSynced: 0,
          message: "ProjectX credentials not configured. Please set ProjectXUsername and ProjectXApiKey in Leap Settings.",
        };
      }

      return {
        success: false,
        accountsSynced: 0,
        message: errorMessage,
      };
    }
  }
);

interface DownlinkResponse {
  success: boolean;
  message: string;
}

export const downlinkProjectX = api<void, DownlinkResponse>(
  { method: "POST", path: "/projectx/downlink", auth: true, expose: true },
  async (): Promise<DownlinkResponse> => {
    const auth = getAuthData()!;

    try {
      const accountRow = await db.queryRow<{ account_id: string }>`
        SELECT account_id
        FROM broker_accounts
        WHERE user_id = ${auth.userID}
        LIMIT 1
      `;

      if (accountRow) {
        const accountId = parseInt(accountRow.account_id);
        await disconnectUserHub(accountId);
      }

      log.info("Real-time uplink disconnected", { userId: auth.userID });

      return {
        success: true,
        message: "Uplink disconnected",
      };
    } catch (error) {
      log.error("Failed to downlink ProjectX", { error, userId: auth.userID });
      return {
        success: false,
        message: "Failed to disconnect uplink",
      };
    }
  }
);
