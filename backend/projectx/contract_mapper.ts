import { ProjectXContract, getAvailableContracts } from "./projectx_client";
import log from "encore.dev/log";

// Map user-friendly symbols to ProjectX symbolId
const SYMBOL_MAPPING: Record<string, string> = {
  "ES": "F.US.EP",      // E-Mini S&P 500
  "NQ": "F.US.ENQ",     // E-mini NASDAQ-100
  "RTY": "F.US.RTY",    // E-mini Russell 2000
  "YM": "F.US.EMD",     // E-mini MidCap 400
  "MES": "F.US.MES",    // Micro E-mini S&P 500
  "MNQ": "F.US.MNQ",    // Micro E-mini Nasdaq-100
  "M2K": "F.US.M2K",    // Micro E-mini Russell 2000
};

interface ActiveContractCache {
  contract: ProjectXContract;
  timestamp: number;
}

const contractCache = new Map<string, ActiveContractCache>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

/**
 * Get the active contract for a given symbol (e.g., "ES" → active CON.F.US.EP.X25 contract)
 * This handles contract rollovers automatically by always selecting the activeContract.
 * 
 * Sequence:
 * 1. Strip leading slash from symbol (e.g., "/MNQ" → "MNQ")
 * 2. Map symbol to ProjectX symbolId (e.g., "MNQ" → "F.US.MNQ")
 * 3. Search TopStep API for all available contracts
 * 4. Filter for the active contract matching the symbolId
 * 5. Return the discovered contract to use for placing orders
 */
export async function getActiveContract(symbol: string, live: boolean, username?: string, apiKey?: string): Promise<ProjectXContract> {
  // Include credentials in cache key to avoid sharing contracts between users
  const credHash = username ? `${username.substring(0, 3)}***` : 'default';
  const cacheKey = `${symbol}-${live}-${credHash}`;
  const cached = contractCache.get(cacheKey);

  // Return cached contract if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.contract;
  }

  // Map user-friendly symbol to ProjectX symbolId
  const symbolId = SYMBOL_MAPPING[symbol];
  if (!symbolId) {
    throw new Error(`Unknown symbol: ${symbol}. Supported symbols: ${Object.keys(SYMBOL_MAPPING).join(', ')}`);
  }

  // Get all available contracts from TopStep API (using user's credentials)
  const allContracts = await getAvailableContracts(live, username, apiKey);

  // Filter by symbolId and activeContract flag
  const activeContracts = allContracts.filter(
    c => c.symbolId === symbolId && c.activeContract
  );

  if (activeContracts.length === 0) {
    throw new Error(`No active contract found for ${symbol} (symbolId: ${symbolId})`);
  }

  if (activeContracts.length > 1) {
    log.warn("Multiple active contracts found, using first one", {
      symbol,
      symbolId,
      contracts: activeContracts.map(c => c.id),
    });
  }

  const activeContract = activeContracts[0];

  // Cache the result
  contractCache.set(cacheKey, {
    contract: activeContract,
    timestamp: Date.now(),
  });

  log.info("Active contract resolved", {
    symbol,
    symbolId,
    contractId: activeContract.id,
    contractName: activeContract.name,
    description: activeContract.description,
  });

  return activeContract;
}

/**
 * Clear the contract cache (useful for testing or force refresh)
 */
export function clearContractCache(): void {
  contractCache.clear();
}
