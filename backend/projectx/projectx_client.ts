import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { retryWithBackoff } from "../news/retry_handler";

export { getActiveContract, clearContractCache } from "./contract_mapper";

const projectXUsername = secret("ProjectXUsername");
const projectXApiKey = secret("ProjectXApiKey");

const BASE_URL = "https://api.topstepx.com";

interface ProjectXAuthResponse {
  token: string;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

interface ProjectXAccount {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
}

export interface ProjectXContract {
  id: string;
  name: string;
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
  symbolId: string;
}

// Order Status Enum
export enum OrderStatus {
  None = 0,
  Open = 1,
  Filled = 2,
  Cancelled = 3,
  Expired = 4,
  Rejected = 5,
  Pending = 6,
}

// Order Type Enum
export enum OrderType {
  Limit = 1,
  Market = 2,
  Stop = 4,
  TrailingStop = 5,
  JoinBid = 6,
  JoinAsk = 7,
}

// Order Side Enum
export enum OrderSide {
  Buy = 0,
  Sell = 1,
}

// Unit Enum for Historical Data
export enum Unit {
  Second = 1,
  Minute = 2,
  Hour = 3,
  Day = 4,
  Week = 5,
  Month = 6,
}

// Full Order details interface
export interface Order {
  id: number;
  accountId: number;
  contractId: string;
  status: OrderStatus;
  type: OrderType;
  side: OrderSide;
  size: number;
  filledSize: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  averagePrice?: number | null;
  creationTimestamp: string;
  lastUpdateTimestamp: string;
  customTag?: string | null;
}

// Place order response
interface ProjectXOrder {
  orderId: number;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

// Historical Bar data
export interface Bar {
  t: Date;  // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

interface ProjectXPosition {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  type: number;
  size: number;
  averagePrice: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAuthToken(providedUsername?: string, providedApiKey?: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Use provided credentials first, fall back to Encore secrets (optional)
  const username = providedUsername || projectXUsername() || null;
  const apiKey = providedApiKey || projectXApiKey() || null;

  if (!username || !apiKey) {
    throw new Error('ProjectX credentials not configured. Please add your TopstepX Username and API Key in Settings > ProjectX Integration.');
  }

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Auth/loginKey`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: username,
        apiKey: apiKey,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`ProjectX auth failed: ${res.status}`);
    }

    return await res.json() as ProjectXAuthResponse;
  });

  if (!response.success || response.errorCode !== 0) {
    throw new Error(`ProjectX auth failed: ${response.errorMessage || 'Unknown error'}`);
  }

  cachedToken = response.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  log.info("ProjectX token obtained", { expiresIn: "23 hours" });

  return cachedToken;
}

export async function validateToken(): Promise<boolean> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${BASE_URL}/api/Auth/validate`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      cachedToken = null;
      tokenExpiry = 0;
      return false;
    }

    return true;
  } catch (error) {
    log.error("Token validation failed", { error });
    cachedToken = null;
    tokenExpiry = 0;
    return false;
  }
}

export async function searchAccounts(onlyActive: boolean = true, username?: string, apiKey?: string): Promise<ProjectXAccount[]> {
  const token = await getAuthToken(username, apiKey);


  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Account/search`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        onlyActiveAccounts: onlyActive,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to search accounts: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; accounts?: ProjectXAccount[] };
  });

  if (!response.success) {
    throw new Error(`Failed to search accounts: ${response.errorMessage}`);
  }

  return response.accounts || [];
}

export async function searchContracts(searchText: string, live: boolean, username?: string, apiKey?: string): Promise<ProjectXContract[]> {
  const token = await getAuthToken(username, apiKey);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Contract/search`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        searchText,
        live,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to search contracts: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; contracts?: ProjectXContract[] };
  });

  if (!response.success) {
    throw new Error(`Failed to search contracts: ${response.errorMessage}`);
  }

  return response.contracts || [];
}

export async function placeOrder(params: {
  accountId: number;
  contractId: string;
  type: number;
  side: number;
  size: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  customTag?: string | null;
  stopLossBracket?: { ticks: number; type: number } | null;
  takeProfitBracket?: { ticks: number; type: number } | null;
  username?: string;
  apiKey?: string;
}): Promise<ProjectXOrder> {
  const { username, apiKey, ...orderParams } = params;
  const token = await getAuthToken(username, apiKey);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Order/place`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderParams),
    });

    if (!res.ok) {
      // Try to get error message from response body
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorBody = await res.json();
        if (errorBody.errorMessage) {
          errorMessage = errorBody.errorMessage;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch (e) {
        // If response isn't JSON, use status text
        errorMessage = res.statusText || `HTTP ${res.status}`;
      }
      
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to place order: ${errorMessage}`);
    }

    const result = await res.json() as ProjectXOrder;
    
    // Log the full response for debugging
    if (!result.success) {
      log.error("ProjectX order placement failed", {
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        orderParams: JSON.stringify(orderParams),
      });
    }
    
    return result;
  });

  if (!response.success) {
    const errorMsg = response.errorMessage || 'Unknown error from ProjectX API';
    log.error("ProjectX order placement unsuccessful", {
      errorCode: response.errorCode,
      errorMessage: errorMsg,
    });
    throw new Error(`Failed to place order: ${errorMsg} (Error Code: ${response.errorCode || 'N/A'})`);
  }

  return response;
}

export async function searchOpenPositions(accountId: number, username?: string, apiKey?: string): Promise<ProjectXPosition[]> {
  const token = await getAuthToken(username, apiKey);


  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Position/searchOpen`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to search positions: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; positions?: ProjectXPosition[] };
  });

  if (!response.success) {
    throw new Error(`Failed to search positions: ${response.errorMessage}`);
  }

  return response.positions || [];
}

export async function closePosition(accountId: number, contractId: string, username?: string, apiKey?: string): Promise<void> {
  const token = await getAuthToken(username, apiKey);


  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Position/closeContract`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
        contractId,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to close position: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string };
  });

  if (!response.success) {
    throw new Error(`Failed to close position: ${response.errorMessage}`);
  }
}

export async function getAvailableContracts(live: boolean, username?: string, apiKey?: string): Promise<ProjectXContract[]> {
  const token = await getAuthToken(username, apiKey);


  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Contract/available`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        live,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to get available contracts: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; contracts?: ProjectXContract[] };
  });

  if (!response.success) {
    throw new Error(`Failed to get available contracts: ${response.errorMessage}`);
  }

  return response.contracts || [];
}

export async function searchOpenOrders(accountId: number, username?: string, apiKey?: string): Promise<Order[]> {
  const token = await getAuthToken(username, apiKey);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Order/searchOpen`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to search open orders: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; orders?: Order[] };
  });

  if (!response.success) {
    throw new Error(`Failed to search open orders: ${response.errorMessage}`);
  }

  return response.orders || [];
}

export async function searchContractById(contractId: string, username?: string, apiKey?: string): Promise<ProjectXContract> {
  const token = await getAuthToken(username, apiKey);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Contract/searchById`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: contractId,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to search contract by ID: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; contract?: ProjectXContract };
  });

  if (!response.success || !response.contract) {
    throw new Error(`Failed to search contract by ID: ${response.errorMessage || 'Contract not found'}`);
  }

  return response.contract;
}

export async function modifyOrder(params: {
  accountId: number;
  orderId: number;
  size?: number | null;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  username?: string;
  apiKey?: string;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const { username, apiKey, ...orderParams } = params;
  const token = await getAuthToken(username, apiKey);

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/Order/modify`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderParams),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API');
      }
      throw new Error(`Failed to modify order: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorCode?: number; errorMessage?: string };
  });

  if (!response.success) {
    throw new Error(`Failed to modify order: ${response.errorMessage || 'Unknown error'}`);
  }

  return { success: response.success, errorMessage: response.errorMessage };
}

export async function retrieveBars(params: {
  contractId: string;
  live: boolean;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  unit: Unit;
  unitNumber: number;
  limit?: number; // Max 20,000
  includePartialBar?: boolean;
  username?: string;
  apiKey?: string;
}): Promise<Bar[]> {
  const { username, apiKey, ...barParams } = params;
  const token = await getAuthToken(username, apiKey);

  // Validate limit
  if (barParams.limit && barParams.limit > 20000) {
    throw new Error('Limit cannot exceed 20,000 bars per request');
  }

  const response = await retryWithBackoff(async () => {
    const res = await fetch(`${BASE_URL}/api/History/retrieveBars`, {
      method: 'POST',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(barParams),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded for ProjectX API (max 50 requests per 30 seconds)');
      }
      throw new Error(`Failed to retrieve bars: ${res.status}`);
    }

    return await res.json() as { success: boolean; errorMessage?: string; bars?: Bar[] };
  });

  if (!response.success) {
    throw new Error(`Failed to retrieve bars: ${response.errorMessage}`);
  }

  return response.bars || [];
}
