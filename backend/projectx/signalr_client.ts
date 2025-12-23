import { HubConnectionBuilder, HttpTransportType, HubConnection } from "@microsoft/signalr";
import log from "encore.dev/log";
import { getAuthToken } from "./projectx_client";

const USER_HUB_URL = "https://rtc.topstepx.com/hubs/user";
const MARKET_HUB_URL = "https://rtc.topstepx.com/hubs/market";

let userConnection: HubConnection | null = null;
let marketConnection: HubConnection | null = null;

export async function connectUserHub(accountId: number, callbacks: {
  onAccount?: (data: any) => void;
  onOrder?: (data: any) => void;
  onPosition?: (data: any) => void;
  onTrade?: (data: any) => void;
}): Promise<HubConnection> {
  if (userConnection && userConnection.state === "Connected") {
    return userConnection;
  }

  const token = await getAuthToken();

  userConnection = new HubConnectionBuilder()
    .withUrl(USER_HUB_URL, {
      skipNegotiation: true,
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => token,
      timeout: 10000,
    })
    .withAutomaticReconnect()
    .build();

  if (callbacks.onAccount) {
    userConnection.on("GatewayUserAccount", callbacks.onAccount);
  }
  if (callbacks.onOrder) {
    userConnection.on("GatewayUserOrder", callbacks.onOrder);
  }
  if (callbacks.onPosition) {
    userConnection.on("GatewayUserPosition", callbacks.onPosition);
  }
  if (callbacks.onTrade) {
    userConnection.on("GatewayUserTrade", callbacks.onTrade);
  }

  await userConnection.start();

  await userConnection.invoke("SubscribeAccounts");
  await userConnection.invoke("SubscribeOrders", accountId);
  await userConnection.invoke("SubscribePositions", accountId);
  await userConnection.invoke("SubscribeTrades", accountId);

  userConnection.onreconnected(async () => {
    log.info("User hub reconnected");
    await userConnection!.invoke("SubscribeAccounts");
    await userConnection!.invoke("SubscribeOrders", accountId);
    await userConnection!.invoke("SubscribePositions", accountId);
    await userConnection!.invoke("SubscribeTrades", accountId);
  });

  log.info("User hub connected", { accountId });

  return userConnection;
}

export async function connectMarketHub(contractId: string, callbacks: {
  onQuote?: (contractId: string, data: any) => void;
  onTrade?: (contractId: string, data: any) => void;
  onDepth?: (contractId: string, data: any) => void;
}): Promise<HubConnection> {
  if (marketConnection && marketConnection.state === "Connected") {
    return marketConnection;
  }

  const token = await getAuthToken();

  marketConnection = new HubConnectionBuilder()
    .withUrl(MARKET_HUB_URL, {
      skipNegotiation: true,
      transport: HttpTransportType.WebSockets,
      accessTokenFactory: () => token,
      timeout: 10000,
    })
    .withAutomaticReconnect()
    .build();

  if (callbacks.onQuote) {
    marketConnection.on("GatewayQuote", callbacks.onQuote);
  }
  if (callbacks.onTrade) {
    marketConnection.on("GatewayTrade", callbacks.onTrade);
  }
  if (callbacks.onDepth) {
    marketConnection.on("GatewayDepth", callbacks.onDepth);
  }

  await marketConnection.start();

  await marketConnection.invoke("SubscribeContractQuotes", contractId);
  await marketConnection.invoke("SubscribeContractTrades", contractId);
  await marketConnection.invoke("SubscribeContractMarketDepth", contractId);

  marketConnection.onreconnected(async () => {
    log.info("Market hub reconnected");
    await marketConnection!.invoke("SubscribeContractQuotes", contractId);
    await marketConnection!.invoke("SubscribeContractTrades", contractId);
    await marketConnection!.invoke("SubscribeContractMarketDepth", contractId);
  });

  log.info("Market hub connected", { contractId });

  return marketConnection;
}

export async function disconnectUserHub(accountId: number): Promise<void> {
  if (userConnection && userConnection.state === "Connected") {
    await userConnection.invoke("UnsubscribeAccounts");
    await userConnection.invoke("UnsubscribeOrders", accountId);
    await userConnection.invoke("UnsubscribePositions", accountId);
    await userConnection.invoke("UnsubscribeTrades", accountId);
    await userConnection.stop();
    log.info("User hub disconnected", { accountId });
  }
}

export async function disconnectMarketHub(contractId: string): Promise<void> {
  if (marketConnection && marketConnection.state === "Connected") {
    await marketConnection.invoke("UnsubscribeContractQuotes", contractId);
    await marketConnection.invoke("UnsubscribeContractTrades", contractId);
    await marketConnection.invoke("UnsubscribeContractMarketDepth", contractId);
    await marketConnection.stop();
    log.info("Market hub disconnected", { contractId });
  }
}
