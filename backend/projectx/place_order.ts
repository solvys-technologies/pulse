import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "../account/get_projectx_credentials";

interface PlaceOrderRequest {
  accountId: number;
  symbol: string;
  side: "buy" | "sell";
  size: number;
  orderType: "market" | "limit" | "stop" | "trailingStop" | "joinBid" | "joinAsk";
  limitPrice?: number;
  stopPrice?: number;
  trailPrice?: number;
  customTag?: string;
  stopLossTicks?: number;
  takeProfitTicks?: number;
}

interface PlaceOrderResponse {
  orderId: number;
  status: string;
  message: string;
}

export const placeOrder = api<PlaceOrderRequest, PlaceOrderResponse>(
  { method: "POST", path: "/projectx/order", auth: true, expose: true },
  async (req): Promise<PlaceOrderResponse> => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1ddc4bf4-fc04-438b-b267-60f40fbd0c54', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'place_order.ts:30', message: 'API endpoint called', data: { endpoint: '/projectx/order', method: 'POST', orderType: req.orderType }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const auth = getAuthData()!;

    // Fetch user's ProjectX credentials from database
    const credentials = await getProjectXCredentials(auth.userID);
    if (!credentials.username || !credentials.apiKey) {
      throw new Error("ProjectX credentials not configured. Please add your TopstepX Username and API Key in Settings > ProjectX Integration.");
    }

    const contracts = await projectx.searchContracts(req.symbol, true, credentials.username, credentials.apiKey);

    if (contracts.length === 0) {
      throw new Error(`Contract not found for symbol: ${req.symbol}`);
    }

    const contract = contracts[0];

    if (req.orderType === "trailingStop" && !req.trailPrice) {
      throw new Error("trailPrice is required for trailingStop order type");
    }

    if ((req.orderType === "joinBid" || req.orderType === "joinAsk") && !req.limitPrice) {
      throw new Error("limitPrice is required for joinBid and joinAsk order types");
    }

    const orderTypeMap: Record<string, number> = {
      limit: 1,
      market: 2,
      stop: 4,
      trailingStop: 5,
      joinBid: 6,
      joinAsk: 7,
    };

    const sideMap: Record<string, number> = {
      buy: 0,
      sell: 1,
    };

    const stopLossBracket = req.stopLossTicks
      ? { ticks: req.stopLossTicks, type: 4 }  // Stop order
      : null;

    const takeProfitBracket = req.takeProfitTicks
      ? { ticks: req.takeProfitTicks, type: 1 }  // Limit order
      : null;

    const result = await projectx.placeOrder({
      accountId: req.accountId,
      contractId: contract.id,
      type: orderTypeMap[req.orderType],
      side: sideMap[req.side],
      size: req.size,
      limitPrice: req.limitPrice || null,
      stopPrice: req.stopPrice || null,
      trailPrice: req.trailPrice || null,
      customTag: req.customTag || null,
      stopLossBracket,
      takeProfitBracket,
      username: credentials.username,
      apiKey: credentials.apiKey,
    });

    await db.exec`
      INSERT INTO system_events (user_id, event_type, severity, title, message, metadata)
      VALUES (
        ${auth.userID},
        'trade',
        'success',
        'Order Placed',
        ${`Order placed: ${req.side.toUpperCase()} ${req.size} ${req.symbol} @ ${req.orderType}`},
        ${JSON.stringify({ orderId: result.orderId, contractId: contract.id, customTag: req.customTag })}
      )
    `;

    log.info("Order placed via ProjectX", {
      userId: auth.userID,
      orderId: result.orderId,
      symbol: req.symbol,
      contractId: contract.id,
    });

    return {
      orderId: result.orderId,
      status: "submitted",
      message: `Order placed successfully`,
    };
  }
);
