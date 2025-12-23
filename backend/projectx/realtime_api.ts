/**
 * TopstepX Real-time WebSocket API Endpoints
 * Provides REST API for managing real-time connections
 */

import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import { realtimeManager } from "./realtime_manager";
import { RealtimeMessage, ConnectionStatus } from "./realtime_types";

// In-memory store for queued messages per user session
// This is a simple queue that frontend can poll
const messageQueues = new Map<string, RealtimeMessage[]>();
const MAX_QUEUE_SIZE = 100;

/**
 * Start a real-time session for the authenticated user
 */
interface StartSessionRequest {
  accountId: number;
}

interface StartSessionResponse {
  success: boolean;
  message: string;
}

export const startRealtimeSession = api<StartSessionRequest, StartSessionResponse>(
  { method: "POST", path: "/projectx/realtime/start", auth: true, expose: true },
  async ({ accountId }) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/1ddc4bf4-fc04-438b-b267-60f40fbd0c54',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'realtime_api.ts:31',message:'API endpoint called',data:{endpoint:'/projectx/realtime/start',method:'POST',accountId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const auth = getAuthData()!;
    const userId = auth.userID;

    try {
      // Create message callback that queues messages
      const messageCallback = (message: RealtimeMessage) => {
        const queueKey = getQueueKey(userId, accountId);
        let queue = messageQueues.get(queueKey);

        if (!queue) {
          queue = [];
          messageQueues.set(queueKey, queue);
        }

        // Add message to queue
        queue.push(message);

        // Limit queue size
        if (queue.length > MAX_QUEUE_SIZE) {
          queue.shift(); // Remove oldest message
        }
      };

      await realtimeManager.startSession(userId, accountId, messageCallback);

      log.info("Started real-time session via API", { userId, accountId });

      return {
        success: true,
        message: "Real-time session started successfully",
      };
    } catch (error) {
      log.error("Failed to start real-time session", {
        userId,
        accountId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to start real-time session",
      };
    }
  }
);

/**
 * Stop a real-time session
 */
interface StopSessionRequest {
  accountId: number;
}

interface StopSessionResponse {
  success: boolean;
  message: string;
}

export const stopRealtimeSession = api<StopSessionRequest, StopSessionResponse>(
  { method: "POST", path: "/projectx/realtime/stop", auth: true, expose: true },
  async ({ accountId }) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    try {
      await realtimeManager.stopSession(userId, accountId);

      // Clear message queue
      const queueKey = getQueueKey(userId, accountId);
      messageQueues.delete(queueKey);

      log.info("Stopped real-time session via API", { userId, accountId });

      return {
        success: true,
        message: "Real-time session stopped successfully",
      };
    } catch (error) {
      log.error("Failed to stop real-time session", {
        userId,
        accountId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to stop real-time session",
      };
    }
  }
);

/**
 * Subscribe to real-time market data for a contract
 */
interface SubscribeContractRequest {
  accountId: number;
  contractId: string;
}

interface SubscribeContractResponse {
  success: boolean;
  message: string;
}

export const subscribeContract = api<SubscribeContractRequest, SubscribeContractResponse>(
  { method: "POST", path: "/projectx/realtime/subscribe", auth: true, expose: true },
  async ({ accountId, contractId }) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    try {
      await realtimeManager.subscribeContract(userId, accountId, contractId);

      log.info("Subscribed to contract via API", { userId, accountId, contractId });

      return {
        success: true,
        message: `Subscribed to contract ${contractId}`,
      };
    } catch (error) {
      log.error("Failed to subscribe to contract", {
        userId,
        accountId,
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to subscribe to contract",
      };
    }
  }
);

/**
 * Unsubscribe from real-time market data for a contract
 */
interface UnsubscribeContractRequest {
  accountId: number;
  contractId: string;
}

interface UnsubscribeContractResponse {
  success: boolean;
  message: string;
}

export const unsubscribeContract = api<UnsubscribeContractRequest, UnsubscribeContractResponse>(
  { method: "POST", path: "/projectx/realtime/unsubscribe", auth: true, expose: true },
  async ({ accountId, contractId }) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    try {
      await realtimeManager.unsubscribeContract(userId, accountId, contractId);

      log.info("Unsubscribed from contract via API", { userId, accountId, contractId });

      return {
        success: true,
        message: `Unsubscribed from contract ${contractId}`,
      };
    } catch (error) {
      log.error("Failed to unsubscribe from contract", {
        userId,
        accountId,
        contractId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to unsubscribe from contract",
      };
    }
  }
);

/**
 * Get connection status for the authenticated user
 */
interface GetStatusRequest {
  accountId: number;
}

interface GetStatusResponse {
  status: ConnectionStatus | null;
}

export const getRealtimeStatus = api<GetStatusRequest, GetStatusResponse>(
  { method: "GET", path: "/projectx/realtime/status", auth: true, expose: true },
  async ({ accountId }) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const status = realtimeManager.getConnectionStatus(userId, accountId);

    return { status };
  }
);

/**
 * Poll for new real-time messages
 * Frontend should call this endpoint periodically to receive updates
 */
interface PollMessagesRequest {
  accountId: number;
  limit?: number; // Max messages to return (default: 50)
}

interface PollMessagesResponse {
  messages: RealtimeMessage[];
  hasMore: boolean;
}

export const pollRealtimeMessages = api<PollMessagesRequest, PollMessagesResponse>(
  { method: "GET", path: "/projectx/realtime/poll", auth: true, expose: true },
  async ({ accountId, limit = 50 }) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    const queueKey = getQueueKey(userId, accountId);

    const queue = messageQueues.get(queueKey) || [];

    // Get messages up to limit
    const messages = queue.splice(0, limit);
    const hasMore = queue.length > 0;

    return {
      messages,
      hasMore,
    };
  }
);

/**
 * Get all active real-time sessions (admin/debug endpoint)
 */
interface GetActiveSessionsResponse {
  sessions: Array<{
    userId: string;
    accountId: number;
    subscribedContracts: string[];
  }>;
}

export const getActiveSessions = api<void, GetActiveSessionsResponse>(
  { method: "GET", path: "/projectx/realtime/sessions", auth: true, expose: true },
  async () => {
    const sessions = realtimeManager.getActiveSessions();

    return { sessions };
  }
);

/**
 * Helper function to generate queue key
 */
function getQueueKey(userId: string, accountId: number): string {
  return `${userId}:${accountId}`;
}

// Cleanup old message queues every 10 minutes
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 30 * 60 * 1000; // 30 minutes

  for (const [key, queue] of messageQueues.entries()) {
    // Check if queue has any recent messages
    const hasRecentMessage = queue.some(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return now - msgTime < staleThreshold;
    });

    if (!hasRecentMessage && queue.length === 0) {
      messageQueues.delete(key);
      log.info("Cleaned up stale message queue", { key });
    }
  }
}, 10 * 60 * 1000);
