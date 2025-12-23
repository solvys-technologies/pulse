# PULSE v4.1.6.1 - Codebase Summary

## Project Overview

PULSE is an AI-powered Integrated Trading Environment (ITE) built on Encore.dev with TypeScript. The system integrates with TopstepX (ProjectX) for trading operations, provides real-time market data via SignalR, and includes AI coaching features via AWS Bedrock.

## Architecture

### Backend Services (Encore.dev)

**ProjectX Service** (`backend/projectx/`)
- Main trading integration service
- Handles account management, order placement, market data
- Real-time SignalR connections for live updates
- 20+ TypeScript files, ~6000+ lines

**Key Modules:**
- `projectx_client.ts` (599 lines) - Core API client for TopstepX REST API
- `realtime_manager.ts` (344 lines) - Singleton manager for SignalR connections
- `realtime_user_hub.ts` (242 lines) - User account/order/position updates
- `realtime_market_hub.ts` (342 lines) - Market data quotes/depth/trades
- `signalr_client.ts` (63 lines) - SignalR connection wrapper
- `service.ts` (181 lines) - Trading signal processing, test trades
- `market_data.ts` (211 lines) - Historical bar data retrieval
- `contract_mapper.ts` (94 lines) - Symbol to contract ID mapping with caching

**Database** (`backend/db/`)
- PostgreSQL via Encore.dev SQLDatabase
- Migrations directory: `backend/db/migrations/`
- Initial schema: `accounts` table for user trading accounts
- Schema includes: user_id, balance, equity, margin_used, daily_pnl, total_pnl, projectx_account_id

**Other Services:**
- `backend/ai/` - AWS Bedrock agent integration
- `backend/news/` - News retry handler with exponential backoff
- `backend/utils/crypto/` - Encryption utilities for credentials
- `backend/cache/` - Caching layer
- `backend/account/` - Account management
- `backend/market/` - Market data services
- `backend/trading/` - Trading operations

## API Endpoints

### ProjectX Trading APIs
- `POST /projectx/order` - Place order (limit, market, stop, trailingStop, joinBid, joinAsk)
- `POST /projectx/order/modify` - Modify existing order
- `GET /projectx/accounts` - List user's trading accounts
- `GET /projectx/orders` - List open orders
- `GET /projectx/contract` - Get contract details by symbol
- `POST /projectx/sync` - Sync ProjectX accounts to local DB
- `POST /projectx/uplink` - Establish real-time connection
- `POST /projectx/downlink` - Disconnect real-time connection
- `GET /projectx/bars` - Retrieve historical bar data

### Real-time APIs
- `POST /projectx/realtime/start` - Start real-time session
- `POST /projectx/realtime/stop` - Stop real-time session
- `POST /projectx/realtime/subscribe` - Subscribe to contract updates
- `POST /projectx/realtime/unsubscribe` - Unsubscribe from contract
- `GET /projectx/realtime/status` - Get connection status
- `GET /projectx/realtime/poll` - Poll for queued messages (polling fallback)
- `GET /projectx/realtime/sessions` - List active sessions (admin)

## Data Models

### ProjectX Types
```typescript
OrderStatus: None(0), Open(1), Filled(2), Cancelled(3), Expired(4), Rejected(5), Pending(6)
OrderType: Limit(1), Market(2), Stop(4), TrailingStop(5), JoinBid(6), JoinAsk(7)
OrderSide: Buy(0), Sell(1)
Unit: Second(1), Minute(2), Hour(3), Day(4), Week(5), Month(6)
```

### Real-time Message Types
- `account` - Account balance/equity updates
- `position` - Position changes
- `order` - Order status updates
- `trade` - Trade executions
- `quote` - Market quote updates
- `depth` - Order book depth
- `trade` - Recent trades

### Database Schema
```sql
accounts (
  user_id TEXT PRIMARY KEY,
  balance DECIMAL(18,2),
  equity DECIMAL(18,2),
  margin_used DECIMAL(18,2),
  daily_pnl DECIMAL(18,2),
  total_pnl DECIMAL(18,2),
  projectx_account_id INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Integration Points

### TopstepX API
- Base URL: `https://api.topstepx.com`
- Authentication: Username + API Key (stored as Encore secrets)
- REST endpoints for accounts, contracts, orders, positions
- SignalR hubs: UserHub (account/order updates), MarketHub (market data)

### AWS Bedrock
- Lambda functions for market data and trading operations
- Action groups defined in OpenAPI YAML
- Agent instructions and guardrails configured

### Clerk Authentication
- `@clerk/backend` and `@clerk/clerk-sdk-node` for auth
- User ID extracted from auth context
- Protected endpoints use `auth: true` in API definition

## Key Features

### Real-time Updates
- SignalR WebSocket connections per user/account
- Message queuing for polling fallback
- Automatic session cleanup (5min stale timeout)
- Contract subscription management

### Trading Operations
- Multiple order types: limit, market, stop, trailing stop, join bid/ask
- Bracket orders with stop loss and take profit
- Position management and closing
- Contract search and mapping with caching

### Error Handling
- Retry logic with exponential backoff (`retry_handler.ts`)
- Circuit breaker patterns
- Defensive null checks throughout
- Comprehensive error logging

### Caching
- Contract mapping cache (symbol → contract ID)
- Account data caching
- Cache invalidation on updates

## Dependencies

### Core
- `encore.dev@^1.53.2` - Backend framework
- `@microsoft/signalr@^10.0.0` - SignalR client
- `@clerk/backend@^1.27.0` - Authentication
- `zod@^3.24.1` - Schema validation

### AI/ML
- `@anthropic-ai/sdk@^0.27.0` - Claude API
- `@aws-sdk/client-bedrock-agent-runtime@^3.0.0` - Bedrock integration
- `langchain@^0.3.0` - AI orchestration
- `@langchain/anthropic@^0.3.0`, `@langchain/core@^0.3.0`, `@langchain/langgraph@^0.2.0`
- `@themaximalist/vectordb.js@^0.1.2` - Vector database

### Development
- `typescript@^5.8.3`
- `@types/node@^24.10.1`
- `bun` - Package manager and runtime

## Build Configuration

### Encore.dev Setup
- `encore.app.ts` - App configuration (TypeScript language)
- `encore.app` - JSON config with CORS settings
- `go.mod` - Placeholder for Encore build system (TypeScript-only project)
- Package manager: `bun`

### CORS Configuration
- Allowed origins: `localhost:5173`, `localhost:3000`, `localhost:5174`, `https://pulse.solvys.io`
- Supports credentials

## File Structure

```
backend/
├── projectx/          # Main trading service (20 files)
│   ├── projectx_client.ts      # API client (599 lines)
│   ├── realtime_manager.ts     # Connection manager (344 lines)
│   ├── realtime_user_hub.ts    # User updates (242 lines)
│   ├── realtime_market_hub.ts  # Market data (342 lines)
│   ├── realtime_api.ts         # REST API for real-time (317 lines)
│   ├── service.ts              # Trading signals (181 lines)
│   ├── market_data.ts          # Historical data (211 lines)
│   ├── place_order.ts          # Order placement (121 lines)
│   ├── modify_order.ts         # Order modification
│   ├── list_orders.ts          # Order listing
│   ├── list_accounts.ts        # Account listing
│   ├── get_contract.ts        # Contract lookup
│   ├── retrieve_bars.ts       # Historical bars
│   ├── sync_projectx.ts        # Account sync
│   ├── uplink.ts              # Real-time connection
│   ├── credentials.ts          # Credential management
│   ├── contract_mapper.ts     # Symbol mapping
│   ├── signalr_client.ts       # SignalR wrapper
│   ├── retry_handler.ts       # Retry logic
│   ├── realtime_types.ts       # TypeScript types
│   └── encore.service.ts       # Service definition
├── db/
│   ├── index.ts                # Database config
│   └── migrations/             # SQL migrations
│       ├── 1_init_schema.up.sql
│       └── 1_init_schema.down.sql
├── ai/                         # AI services
├── news/                       # News handlers
├── utils/                      # Utilities
├── cache/                      # Caching
├── account/                    # Account management
├── market/                     # Market data
└── trading/                    # Trading operations
```

## Known Issues & Fixes

### Fixed Issues
1. **Missing migrations directory** - Created `backend/db/migrations/` with initial schema migration
2. **Database schema** - Added `accounts` table with proper indexes

### Build-Time Issues
**encore.dev module resolution errors** - During compilation, Encore build system reports:
```
error: unable to resolve module encore.dev/log: failed to get the node_modules path
error: unable to resolve module encore.dev/api: failed to get the node_modules path
error: unable to resolve module encore.dev/config: failed to get the node_modules path
error: unable to resolve module encore.dev/storage/sqldb: failed to get the node_modules path
error: unable to resolve module encore.dev/service: failed to get the node_modules path
```

**Root Cause:** Encore's build system cannot resolve the `encore-runtimes` package path during compilation. The package is installed (`encore.dev@^1.53.2` in package.json), but the build-time resolver fails.

**Potential Solutions:**
1. Ensure Encore CLI is properly installed and configured
2. Check that `encore-runtimes` is accessible at expected path (`../../encore-runtimes/js/encore.dev`)
3. Verify Encore build environment variables
4. May require Encore Cloud build environment or local Encore dev server running
5. Check `encore.app` and `encore.app.ts` configuration matches Encore version

**Note:** This is a build-time issue, not a code issue. The imports are correct. The problem occurs during Encore's compilation phase when it tries to resolve module paths.

## Development Patterns

### API Endpoint Pattern
```typescript
import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";

export const myEndpoint = api<RequestType, ResponseType>(
  { method: "POST", path: "/path", auth: true, expose: true },
  async (req) => {
    const auth = getAuthData()!;
    // Implementation
  }
);
```

### Database Pattern
```typescript
import { db } from "../db";

await db.exec`
  INSERT INTO accounts (user_id, balance)
  VALUES (${userId}, ${balance})
  ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance
`;
```

### Secret Management
```typescript
import { secret } from "encore.dev/config";

const apiKey = secret("ProjectXApiKey");
```

### Logging Pattern
```typescript
import log from "encore.dev/log";

log.info("Message", { data });
log.error("Error", { error, context });
```

## Testing & Debugging

### Agent Logging
Many endpoints include agent logging for debugging:
```typescript
fetch('http://127.0.0.1:7244/ingest/...', { 
  method: 'POST', 
  body: JSON.stringify({ location, message, data, timestamp }) 
}).catch(() => {});
```

### Real-time Debugging
- Use `GET /projectx/realtime/sessions` to see active connections
- Check connection status via `GET /projectx/realtime/status`
- Poll messages via `GET /projectx/realtime/poll` for debugging

## Deployment

### Encore.dev
- Primary deployment platform
- Managed PostgreSQL database
- Secret management via Encore secrets
- CORS configured for production domain

### AWS Lambda
- Market data handler (`lambda/market-data/index.py`)
- Trading operations handler (`lambda/trading-ops/index.py`)
- Deployed via `infra/bedrock/deploy-lambda.sh`

### Cloudflare (Secondary)
- Edge functions and static hosting
- CDN and fallback services

## Security

- All API endpoints require authentication (`auth: true`)
- Credentials stored as Encore secrets
- Encryption utilities in `backend/utils/crypto/`
- CORS configured for specific origins
- Defensive null checks throughout codebase

## Performance

- Contract mapping caching to reduce API calls
- Message queue limits (MAX_QUEUE_SIZE = 100)
- Automatic session cleanup (5min intervals)
- Retry logic with exponential backoff
- Connection pooling via SignalR hubs

## Future Considerations

- WebSocket support for real-time (currently polling fallback)
- Additional order types and trading strategies
- Enhanced error recovery and circuit breakers
- Performance monitoring and observability
- Additional database tables for trade history, strategies
