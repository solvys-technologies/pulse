import { secret } from "encore.dev/config";
import { db } from "../db";
import { decrypt } from "../utils/crypto";

const projectXUsernameSecret = secret("ProjectXUsername");
const projectXApiKeySecret = secret("ProjectXApiKey");

export interface ProjectXCredentials {
    username: string;
    apiKey: string;
}

export async function getProjectXCredentials(userId: string): Promise<ProjectXCredentials> {
    // 1. Try to get from Encore Secrets (Global/Dev) - PRIMARY
    try {
        const username = projectXUsernameSecret();
        const apiKey = projectXApiKeySecret();

        if (username && apiKey) {
            return { username, apiKey };
        }
    } catch (e) {
        // Secrets not configured or failed to load
    }

    // 2. Fallback to Database (User settings)
    const row = await db.queryRow<{
        topstepx_username: string | null;
        topstepx_api_key: string | null;
    }>`
    SELECT topstepx_username, topstepx_api_key 
    FROM accounts 
    WHERE user_id = ${userId}
  `;

    if (row?.topstepx_username && row?.topstepx_api_key) {
        // If the DB values are encrypted, we cannot decrypt without an encryption key.
        // To keep deploy friction low, we do NOT require an EncryptionKey secret.
        // Instead, prefer Encore secrets (ProjectXUsername/ProjectXApiKey). DB values should be stored as plaintext.
        const looksEncrypted = (val: string) => val.split(":").length === 3;

        if (looksEncrypted(row.topstepx_username) || looksEncrypted(row.topstepx_api_key)) {
            throw new Error(
                "ProjectX credentials appear encrypted in the database, but EncryptionKey is not configured. " +
                "Set ProjectXUsername and ProjectXApiKey as Encore secrets instead."
            );
        }

        // Plaintext fallback (or backward compatible no-op decrypt)
        const username = await decrypt(row.topstepx_username, null);
        const apiKey = await decrypt(row.topstepx_api_key, null);
        return { username, apiKey };
    }

    throw new Error("ProjectX credentials not configured. Please set ProjectXUsername and ProjectXApiKey secrets in Encore or add them in Settings.");
}
