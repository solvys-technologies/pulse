import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import * as projectx from "./projectx_client";
import { getProjectXCredentials } from "./credentials";

interface ListOrdersRequest {
  accountId: number;
}

interface ListOrdersResponse {
  orders: projectx.Order[];
}

export const listOrders = api<ListOrdersRequest, ListOrdersResponse>(
  { method: "GET", path: "/projectx/orders", auth: true, expose: true },
  async (req): Promise<ListOrdersResponse> => {
    const auth = getAuthData()!;

    // Get user-specific credentials
    const credentials = await getProjectXCredentials(auth.userID);

    const orders = await projectx.searchOpenOrders(
      req.accountId,
      credentials.username,
      credentials.apiKey
    );

    log.info("Open orders retrieved via ProjectX", {
      userId: auth.userID,
      accountId: req.accountId,
      orderCount: orders.length,
    });

    return { orders };
  }
);
