/**
 * Market Service
 * Handles market data retrieval and caching
 */

import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import * as projectx from "../projectx/projectx_client";
import { getProjectXCredentials } from "../projectx/credentials";

// Re-export market data functions
export { retrieveBars, Unit, Bar } from "../projectx/projectx_client";

/**
 * Get current quote for a symbol
 */
interface GetQuoteRequest {
  symbol: string;
}

interface Quote {
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  timestamp: string;
}

interface GetQuoteResponse {
  quote: Quote | null;
  error?: string;
}

export const getQuote = api<GetQuoteRequest, GetQuoteResponse>(
  { method: "GET", path: "/market/quote", auth: true, expose: true },
  async (req) => {
    const auth = getAuthData()!;

    try {
      const { username, apiKey } = await getProjectXCredentials(auth.userID);
      
      // Get contract for the symbol
      const contracts = await projectx.searchContracts(req.symbol, true, username, apiKey);
      
      if (!contracts || contracts.length === 0) {
        return {
          quote: null,
          error: `No contract found for symbol: ${req.symbol}`,
        };
      }

      // For now, return a placeholder quote
      // Real-time quotes come via WebSocket/SignalR
      return {
        quote: {
          symbol: req.symbol,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      log.error("Failed to get quote", {
        error: error instanceof Error ? error.message : String(error),
        symbol: req.symbol,
      });

      return {
        quote: null,
        error: error instanceof Error ? error.message : "Failed to get quote",
      };
    }
  }
);

/**
 * Search for available contracts
 */
interface SearchContractsRequest {
  searchText: string;
  live?: boolean;
}

interface Contract {
  id: string;
  name: string;
  description: string;
  tickSize: number;
  tickValue: number;
  activeContract: boolean;
}

interface SearchContractsResponse {
  contracts: Contract[];
}

export const searchContracts = api<SearchContractsRequest, SearchContractsResponse>(
  { method: "GET", path: "/market/contracts/search", auth: true, expose: true },
  async (req) => {
    const auth = getAuthData()!;

    try {
      const { username, apiKey } = await getProjectXCredentials(auth.userID);
      const contracts = await projectx.searchContracts(
        req.searchText,
        req.live !== false, // Default to live contracts
        username,
        apiKey
      );

      return {
        contracts: contracts.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          tickSize: c.tickSize,
          tickValue: c.tickValue,
          activeContract: c.activeContract,
        })),
      };
    } catch (error) {
      log.error("Failed to search contracts", {
        error: error instanceof Error ? error.message : String(error),
        searchText: req.searchText,
      });

      return { contracts: [] };
    }
  }
);

/**
 * Get available contracts list
 */
interface GetAvailableContractsRequest {
  live?: boolean;
}

interface GetAvailableContractsResponse {
  contracts: Contract[];
}

export const getAvailableContracts = api<GetAvailableContractsRequest, GetAvailableContractsResponse>(
  { method: "GET", path: "/market/contracts/available", auth: true, expose: true },
  async (req) => {
    const auth = getAuthData()!;

    try {
      const { username, apiKey } = await getProjectXCredentials(auth.userID);
      const contracts = await projectx.getAvailableContracts(
        req.live !== false,
        username,
        apiKey
      );

      return {
        contracts: contracts.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          tickSize: c.tickSize,
          tickValue: c.tickValue,
          activeContract: c.activeContract,
        })),
      };
    } catch (error) {
      log.error("Failed to get available contracts", {
        error: error instanceof Error ? error.message : String(error),
      });

      return { contracts: [] };
    }
  }
);
