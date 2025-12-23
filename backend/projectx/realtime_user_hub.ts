/**
 * TopstepX User Hub SignalR Connection
 * Handles real-time user account, order, position, and trade updates
 */

import { HubConnectionBuilder, HttpTransportType, HubConnection, HubConnectionState } from "@microsoft/signalr";
import log from "encore.dev/log";
import {
  GatewayUserAccount,
  GatewayUserOrder,
  GatewayUserPosition,
  GatewayUserTrade,
  UserHubCallbacks,
} from "./realtime_types";

const USER_HUB_URL = "wss://rtc.topstepx.com/hubs/user";

export class UserHub {
  private connection: HubConnection | null = null;
  private accountId: number;
  private token: string;
  private callbacks: UserHubCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(accountId: number, token: string, callbacks: UserHubCallbacks) {
    this.accountId = accountId;
    this.token = token;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the TopstepX User Hub
   */
  async connect(): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      log.info("User hub already connected", { accountId: this.accountId });
      return;
    }

    try {
      // Build SignalR connection with JWT token
      this.connection = new HubConnectionBuilder()
        .withUrl(USER_HUB_URL, {
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
            log.info("User hub reconnecting", {
              accountId: this.accountId,
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
        log.warn("User hub reconnecting", { accountId: this.accountId, error: error?.message });
      });

      this.connection.onreconnected(async (connectionId) => {
        log.info("User hub reconnected", { accountId: this.accountId, connectionId });
        this.reconnectAttempts = 0;
        // Re-subscribe after reconnection
        await this.subscribe();
      });

      this.connection.onclose(async (error) => {
        log.error("User hub connection closed", { accountId: this.accountId, error: error?.message });

        // Attempt manual reconnection if auto-reconnect fails
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(5000 * this.reconnectAttempts, 60000);
          log.info("Attempting manual reconnection", {
            accountId: this.accountId,
            attempt: this.reconnectAttempts,
            delayMs: delay
          });
          setTimeout(() => this.connect(), delay);
        }
      });

      // Start connection
      await this.connection.start();
      log.info("User hub connected successfully", { accountId: this.accountId });

      // Subscribe to events
      await this.subscribe();

    } catch (error) {
      log.error("Failed to connect to user hub", {
        accountId: this.accountId,
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

    // GatewayUserAccount - account balance and status updates
    this.connection.on("GatewayUserAccount", (data: GatewayUserAccount) => {
      log.info("Received account update", { accountId: this.accountId, data });
      if (this.callbacks.onAccount) {
        this.callbacks.onAccount(data);
      }
    });

    // GatewayUserOrder - order status updates
    this.connection.on("GatewayUserOrder", (data: GatewayUserOrder) => {
      log.info("Received order update", { accountId: this.accountId, orderId: data.id, status: data.status });
      if (this.callbacks.onOrder) {
        this.callbacks.onOrder(data);
      }
    });

    // GatewayUserPosition - position updates
    this.connection.on("GatewayUserPosition", (data: GatewayUserPosition) => {
      log.info("Received position update", { accountId: this.accountId, positionId: data.id, unrealizedPnL: data.unrealizedPnL });
      if (this.callbacks.onPosition) {
        this.callbacks.onPosition(data);
      }
    });

    // GatewayUserTrade - trade execution updates
    this.connection.on("GatewayUserTrade", (data: GatewayUserTrade) => {
      log.info("Received trade update", { accountId: this.accountId, tradeId: data.id, price: data.price, size: data.size });
      if (this.callbacks.onTrade) {
        this.callbacks.onTrade(data);
      }
    });
  }

  /**
   * Subscribe to user events
   */
  private async subscribe(): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error("Cannot subscribe: connection not established");
    }

    try {
      // Subscribe to all user account events
      await this.connection.invoke("SubscribeAccounts");
      log.info("Subscribed to accounts", { accountId: this.accountId });

      // Subscribe to orders for this account
      await this.connection.invoke("SubscribeOrders", this.accountId);
      log.info("Subscribed to orders", { accountId: this.accountId });

      // Subscribe to positions for this account
      await this.connection.invoke("SubscribePositions", this.accountId);
      log.info("Subscribed to positions", { accountId: this.accountId });

      // Subscribe to trades for this account
      await this.connection.invoke("SubscribeTrades", this.accountId);
      log.info("Subscribed to trades", { accountId: this.accountId });

    } catch (error) {
      log.error("Failed to subscribe to user events", {
        accountId: this.accountId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from user events
   */
  private async unsubscribe(): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke("UnsubscribeAccounts");
      await this.connection.invoke("UnsubscribeOrders", this.accountId);
      await this.connection.invoke("UnsubscribePositions", this.accountId);
      await this.connection.invoke("UnsubscribeTrades", this.accountId);
      log.info("Unsubscribed from user events", { accountId: this.accountId });
    } catch (error) {
      log.error("Failed to unsubscribe from user events", {
        accountId: this.accountId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Disconnect from the User Hub
   */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await this.unsubscribe();
      await this.connection.stop();
      this.connection = null;
      log.info("User hub disconnected", { accountId: this.accountId });
    } catch (error) {
      log.error("Failed to disconnect from user hub", {
        accountId: this.accountId,
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
}
