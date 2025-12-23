import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "./credentials";

interface ModifyOrderRequest {
  orderId: number;
  accountId: number;
  size?: number;
  limitPrice?: number;
  stopPrice?: number;
  trailPrice?: number;
}

interface ModifyOrderResponse {
  success: boolean;
  message: string;
}

export const modifyOrder = api<ModifyOrderRequest, ModifyOrderResponse>(
  { method: "PUT", path: "/projectx/order/:orderId", auth: true, expose: true },
  async (req): Promise<ModifyOrderResponse> => {
    const auth = getAuthData()!;

    // Get user-specific credentials
    const credentials = await getProjectXCredentials(auth.userID);

    const result = await projectx.modifyOrder({
      accountId: req.accountId,
      orderId: req.orderId,
      size: req.size ?? null,
      limitPrice: req.limitPrice ?? null,
      stopPrice: req.stopPrice ?? null,
      trailPrice: req.trailPrice ?? null,
      username: credentials.username,
      apiKey: credentials.apiKey,
    });

    log.info("Order modified via ProjectX", {
      userId: auth.userID,
      orderId: req.orderId,
      accountId: req.accountId,
    });

    return {
      success: result.success,
      message: result.errorMessage || "Order modified successfully",
    };
  }
);
