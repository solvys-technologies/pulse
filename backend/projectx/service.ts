import { db } from "../db";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "./credentials";

interface TradingSignal {
  symbol: string;
  side: 'buy' | 'sell' | 'long' | 'short';
  confidence: number;
  price?: number;
  quantity?: number;
  // Add other signal properties as needed
}

/**
 * Execute test trade (dry run) - logs order payload without sending to API
 * 
 * @param symbol Trading pair symbol (e.g., 'MNQ' or '/MNQ')
 * @param side 'buy'/'long' or 'sell'/'short'
 * @param accountId Account ID to use for the trade
 * @param userId User ID for authentication
 */
export async function executeTestTrade(
  symbol: string,
  side: 'buy' | 'sell' | 'long' | 'short',
  accountId: number,
  userId: string
): Promise<void> {
  try {
    // Check if account exists and algo_enabled flag is true
    const accountResult = await db.queryRow<{
      algo_enabled: boolean;
      projectx_account_id: number | null;
      contracts_per_trade: number | null;
      selected_symbol: string | null;
    }>`
      SELECT algo_enabled, projectx_account_id, contracts_per_trade, selected_symbol
      FROM accounts
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (!accountResult) {
      log.info(`DRY RUN - Account ${accountId} not found. Skipping trade execution.`);
      return;
    }

    if (!accountResult.algo_enabled) {
      log.info(`DRY RUN - Account ${accountId} has algo_enabled=false. Skipping trade execution.`);
      return;
    }

    if (!accountResult.projectx_account_id) {
      log.info(`DRY RUN - Account ${accountId} has no ProjectX account connected. Skipping trade execution.`);
      return;
    }

    // Use user's selected symbol from settings
    const userSymbol = accountResult.selected_symbol || '/MNQ';
    const symbolWithoutSlash = userSymbol.replace(/^\//, '');
    const contracts = accountResult.contracts_per_trade || 1;

    // Get user's ProjectX credentials
    const { username, apiKey } = await getProjectXCredentials(userId);

    // Get active contract
    let contract;
    try {
      contract = await projectx.getActiveContract(symbolWithoutSlash, true, username, apiKey);
    } catch (error) {
      log.error('Error fetching contract for dry run', {
        error: error instanceof Error ? error : new Error(String(error)),
        symbol: symbolWithoutSlash,
      });
      throw new Error(`Failed to fetch contract for ${symbolWithoutSlash}`);
    }

    // Map side to ProjectX format
    const sideMap: Record<string, number> = {
      buy: 0,
      long: 0,
      sell: 1,
      short: 1,
    };
    const projectxSide = sideMap[side] ?? 0;

    // Calculate limit price (use current market price ± small offset for limit orders)
    // For now, we'll use market order type (type: 2) in dry run
    const orderType = 2; // Market order

    // Construct valid Limit Order payload (for logging purposes, but we'll use market order)
    const orderPayload = {
      accountId: accountResult.projectx_account_id,
      contractId: contract.id,
      type: orderType,
      side: projectxSide,
      size: contracts,
      limitPrice: null,
      stopPrice: null,
      trailPrice: null,
      customTag: `dry-run-${Date.now()}`,
      stopLossBracket: null, // Would be calculated in real execution
      takeProfitBracket: null, // Would be calculated in real execution
      username,
      apiKey,
    };

    // DRY RUN: Log payload to console instead of sending
    log.info('DRY RUN - Order Payload', {
      payload: JSON.stringify(orderPayload, null, 2),
      contract: {
        id: contract.id,
        symbol: contract.symbol,
        tickSize: contract.tickSize,
      },
      accountId: accountResult.projectx_account_id,
      userSymbol,
      symbolWithoutSlash,
      side,
      contracts,
      orderType,
    });

    log.info('DRY RUN - Order execution skipped (dry run mode)');
  } catch (error) {
    log.error('Error in executeTestTrade', {
      error: error instanceof Error ? error : new Error(String(error)),
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      symbol,
      side,
      accountId,
      userId,
    });
    throw error;
  }
}

/**
 * Process trading signal from Autotrader Service
 * Executes trade if confidence > 0.85
 */
export async function processTradingSignal(
  signal: TradingSignal,
  accountId: number,
  userId: string
): Promise<void> {
  try {
    log.info('Processing trading signal', {
      symbol: signal.symbol,
      side: signal.side,
      confidence: signal.confidence,
      accountId,
      userId,
    });

    // Check if signal confidence is above threshold
    if (signal.confidence <= 0.85) {
      log.info(`Signal confidence ${signal.confidence} is below threshold 0.85. Skipping execution.`);
      return;
    }

    // Extract symbol and side from signal
    const { symbol, side } = signal;

    // Execute test trade (dry run)
    await executeTestTrade(symbol, side, accountId, userId);

    log.info(`Successfully processed trading signal for ${symbol} ${side} with confidence ${signal.confidence}`);
  } catch (error) {
    log.error('Error processing trading signal', {
      error: error instanceof Error ? error : new Error(String(error)),
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error),
      signal,
      accountId,
      userId,
    });
    throw error;
  }
}
