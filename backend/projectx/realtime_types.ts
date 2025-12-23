/**
 * TypeScript interfaces for TopstepX SignalR real-time events
 * Reference: TopstepX SignalR Documentation
 */

// =============================================================================
// User Hub Event Types
// =============================================================================

export interface GatewayUserAccount {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
  simulated: boolean;
  // Additional fields from TopstepX API
  currencyId?: string;
  dailyLoss?: number;
  dailyLossLimit?: number;
  maxDailyLoss?: number;
  totalProfit?: number;
  createdDate?: string;
}

export interface GatewayUserOrder {
  id: number;
  accountId: number;
  contractId: string;
  type: OrderType;
  side: OrderSide;
  size: number;
  filledSize: number;
  remainingSize: number;
  limitPrice: number | null;
  stopPrice: number | null;
  trailPrice: number | null;
  averageFillPrice: number | null;
  status: OrderStatus;
  createdTimestamp: string;
  lastUpdateTimestamp: string;
  customTag: string | null;
  // Bracket order fields
  stopLossBracket?: BracketOrder | null;
  takeProfitBracket?: BracketOrder | null;
}

export interface GatewayUserPosition {
  id: number;
  accountId: number;
  contractId: string;
  type: PositionType;
  size: number;
  averagePrice: number;
  creationTimestamp: string;
  lastUpdateTimestamp: string;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface GatewayUserTrade {
  id: number;
  orderId: number;
  accountId: number;
  contractId: string;
  side: OrderSide;
  size: number;
  price: number;
  timestamp: string;
  commission: number;
  realizedPnL: number;
}

// =============================================================================
// Market Hub Event Types
// =============================================================================

export interface GatewayQuote {
  contractId: string;
  symbol: string;
  lastPrice: number;
  lastSize: number;
  lastTimestamp: string;
  bestBid: number;
  bestBidSize: number;
  bestAsk: number;
  bestAskSize: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest: number;
  high: number;
  low: number;
  open: number;
  close: number;
  settlementPrice: number;
}

export interface GatewayDepth {
  contractId: string;
  price: number;
  volume: number;
  type: DomType;
  timestamp: string;
}

export interface GatewayTrade {
  contractId: string;
  price: number;
  volume: number;
  side: TradeLogType;
  timestamp: string;
  tradeId: string;
}

// =============================================================================
// Enums
// =============================================================================

export enum OrderType {
  Market = 0,
  Limit = 1,
  Stop = 2,
  StopLimit = 3,
  TrailingStop = 4,
}

export enum OrderSide {
  Buy = 0,
  Sell = 1,
}

export enum OrderStatus {
  Pending = 0,
  Working = 1,
  PartiallyFilled = 2,
  Filled = 3,
  Cancelled = 4,
  Rejected = 5,
  Expired = 6,
}

export enum PositionType {
  Long = 0,
  Short = 1,
  Flat = 2,
}

export enum DomType {
  Unknown = 0,
  Ask = 1,
  Bid = 2,
  BestAsk = 3,
  BestBid = 4,
  ImpliedAsk = 5,
  ImpliedBid = 6,
  ImpliedBestAsk = 7,
  ImpliedBestBid = 8,
}

export enum TradeLogType {
  Buy = 0,
  Sell = 1,
}

export enum BracketOrderType {
  Market = 0,
  Limit = 1,
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface BracketOrder {
  ticks: number;
  type: BracketOrderType;
}

// =============================================================================
// Connection State Types
// =============================================================================

export interface UserHubCallbacks {
  onAccount?: (data: GatewayUserAccount) => void;
  onOrder?: (data: GatewayUserOrder) => void;
  onPosition?: (data: GatewayUserPosition) => void;
  onTrade?: (data: GatewayUserTrade) => void;
}

export interface MarketHubCallbacks {
  onQuote?: (contractId: string, data: GatewayQuote) => void;
  onTrade?: (contractId: string, data: GatewayTrade) => void;
  onDepth?: (contractId: string, data: GatewayDepth) => void;
}

// =============================================================================
// WebSocket Message Types (for broadcasting to frontend)
// =============================================================================

export type RealtimeEventType =
  | 'account'
  | 'order'
  | 'position'
  | 'trade'
  | 'quote'
  | 'depth'
  | 'marketTrade';

export interface RealtimeMessage {
  type: RealtimeEventType;
  data: GatewayUserAccount | GatewayUserOrder | GatewayUserPosition |
        GatewayUserTrade | GatewayQuote | GatewayDepth | GatewayTrade;
  timestamp: string;
  contractId?: string; // For market data events
}

export interface ConnectionStatus {
  userHub: 'connected' | 'disconnected' | 'reconnecting';
  marketHub: 'connected' | 'disconnected' | 'reconnecting';
  subscribedContracts: string[];
  accountId: number | null;
}
