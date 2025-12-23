/**
 * TopstepX Market Data Hub SignalR Connection
 * Handles real-time market quotes, depth of market (DOM), and trade updates
 */

import { HubConnectionBuilder, HttpTransportType, HubConnection, HubConnectionState } from "@microsoft/signalr";
import log from "encore.dev/log";
import {
  GatewayQuote,
  GatewayDepth,
  GatewayTrade,
  MarketHubCallbacks,
} from "./realtime_types";

const MARKET_HUB_URL = "wss://rtc.topstepx.com/hubs/market";

export class MarketHub {
  private connection: HubConnection | null = null;
  private token: string;
  private callbacks: MarketHubCallbacks;
  private subscribedContracts: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(token: string, callbacks: MarketHubCallbacks) {
    this.token = token;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the TopstepX Market Hub
   */
  async connect(): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      log.info("Market hub already connected");
      return;
    }

    try {
      // Build SignalR connection with JWT token
      this.connection = new HubConnectionBuilder()
        .withUrl(MARKET_HUB_URL, {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
          accessTokenFactory: () => this.token,
          timeout: 30000,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 4s, 8s, 16s, 32s, then 60s
            if (retryContext.previousRetryCount === 0) {
              return 0;
            }
            const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 60000);
            log.info("Market hub reconnecting", {
              attempt: retryContext.previousRetryCount + 1,
              delayMs: delay
            });
            return delay;
          },
        })
        .build();

      // Register event handlers
      this.registerEventHandlers();

      // Handle reconnection events
      this.connection.onreconnecting((error) => {
        log.warn("Market hub reconnecting", { error: error?.message });
      });

      this.connection.onreconnected(async (connectionId) => {
        log.info("Market hub reconnected", { connectionId });
        this.reconnectAttempts = 0;
        // Re-subscribe to all contracts after reconnection
        await this.resubscribeAll();
      });

      this.connection.onclose(async (error) => {
        log.error("Market hub connection closed", { error: error?.message });

        // Attempt manual reconnection if auto-reconnect fails
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(5000 * this.reconnectAttempts, 60000);
          log.info("Attempting manual reconnection", {
            attempt: this.reconnectAttempts,
            delayMs: delay
          });
          setTimeout(() => this.connect(), delay);
        }
      });

      // Start connection
      await this.connection.start();
      log.info("Market hub connected successfully");

    } catch (error) {
      log.error("Failed to connect to market hub", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Register SignalR event handlers
   */
  private registerEventHandlers(): void {
    if (!this.connection) return;

    // GatewayQuote - real-time price quotes
    this.connection.on("GatewayQuote", (contractId: string, data: GatewayQuote) => {
      log.debug("Received quote update", { contractId, lastPrice: data.lastPrice });
      if (this.callbacks.onQuote) {
        this.callbacks.onQuote(contractId, data);
      }
    });

    // GatewayDepth - market depth (order book) updates
    this.connection.on("GatewayDepth", (contractId: string, data: GatewayDepth) => {
      log.debug("Received depth update", { contractId, price: data.price, volume: data.volume, type: data.type });
      if (this.callbacks.onDepth) {
        this.callbacks.onDepth(contractId, data);
      }
    });

    // GatewayTrade - market trade executions
    this.connection.on("GatewayTrade", (contractId: string, data: GatewayTrade) => {
      log.debug("Received market trade", { contractId, price: data.price, volume: data.volume, side: data.side });
      if (this.callbacks.onTrade) {
        this.callbacks.onTrade(contractId, data);
      }
    });
  }

  /**
   * Subscribe to real-time quotes for a contract
   */
  async subscribeQuotes(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error("Cannot subscribe: connection not established");
    }

    try {
      await this.connection.invoke("SubscribeContractQuotes", contractId);
      log.info("Subscribed to contract quotes", { contractId });
    } catch (error) {
      log.error("Failed to subscribe to contract quotes", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Subscribe to real-time trades for a contract
   */
  async subscribeTrades(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error("Cannot subscribe: connection not established");
    }

    try {
      await this.connection.invoke("SubscribeContractTrades", contractId);
      log.info("Subscribed to contract trades", { contractId });
    } catch (error) {
      log.error("Failed to subscribe to contract trades", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Subscribe to real-time market depth for a contract
   */
  async subscribeDepth(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error("Cannot subscribe: connection not established");
    }

    try {
      await this.connection.invoke("SubscribeContractMarketDepth", contractId);
      log.info("Subscribed to contract market depth", { contractId });
    } catch (error) {
      log.error("Failed to subscribe to contract market depth", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Subscribe to all market data for a contract (quotes, trades, depth)
   */
  async subscribeContract(contractId: string): Promise<void> {
    await this.subscribeQuotes(contractId);
    await this.subscribeTrades(contractId);
    await this.subscribeDepth(contractId);
    this.subscribedContracts.add(contractId);
    log.info("Subscribed to all market data for contract", { contractId });
  }

  /**
   * Unsubscribe from contract quotes
   */
  async unsubscribeQuotes(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke("UnsubscribeContractQuotes", contractId);
      log.info("Unsubscribed from contract quotes", { contractId });
    } catch (error) {
      log.error("Failed to unsubscribe from contract quotes", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Unsubscribe from contract trades
   */
  async unsubscribeTrades(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke("UnsubscribeContractTrades", contractId);
      log.info("Unsubscribed from contract trades", { contractId });
    } catch (error) {
      log.error("Failed to unsubscribe from contract trades", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Unsubscribe from contract market depth
   */
  async unsubscribeDepth(contractId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke("UnsubscribeContractMarketDepth", contractId);
      log.info("Unsubscribed from contract market depth", { contractId });
    } catch (error) {
      log.error("Failed to unsubscribe from contract market depth", {
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Unsubscribe from all market data for a contract
   */
  async unsubscribeContract(contractId: string): Promise<void> {
    await this.unsubscribeQuotes(contractId);
    await this.unsubscribeTrades(contractId);
    await this.unsubscribeDepth(contractId);
    this.subscribedContracts.delete(contractId);
    log.info("Unsubscribed from all market data for contract", { contractId });
  }

  /**
   * Re-subscribe to all previously subscribed contracts (used after reconnection)
   */
  private async resubscribeAll(): Promise<void> {
    const contracts = Array.from(this.subscribedContracts);
    log.info("Re-subscribing to contracts after reconnection", { count: contracts.length });

    for (const contractId of contracts) {
      try {
        await this.subscribeQuotes(contractId);
        await this.subscribeTrades(contractId);
        await this.subscribeDepth(contractId);
      } catch (error) {
        log.error("Failed to re-subscribe to contract", {
          contractId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Disconnect from the Market Hub
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      // Unsubscribe from all contracts
      const contracts = Array.from(this.subscribedContracts);
      for (const contractId of contracts) {
        await this.unsubscribeContract(contractId);
      }

      await this.connection.stop();
      this.connection = null;
      this.subscribedContracts.clear();
      log.info("Market hub disconnected");
    } catch (error) {
      log.error("Failed to disconnect from market hub", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.connection !== null && this.connection.state === HubConnectionState.Connected;
  }

  /**
   * Get connection state
   */
  getState(): HubConnectionState | null {
    return this.connection?.state || null;
  }

  /**
   * Get list of subscribed contracts
   */
  getSubscribedContracts(): string[] {
    return Array.from(this.subscribedContracts);
  }
}
