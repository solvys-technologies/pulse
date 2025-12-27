# Handoff: New Backend Implementation

## Overview

This document provides handoff instructions for two agents to implement different segments of a freshly-planned, strategically implemented backend system for PULSE. The previous autopilot and AI agent systems have been removed to make way for a new implementation using Vercel's AI integration tools.

## Context

### What Was Removed

1. **Autopilot System**
   - Deleted `backend/trading/autopilot.ts`
   - Removed autopilot migrations
   - Removed autopilot UI components (`AutopilotStatusLight.tsx`)
   - Removed autopilot references from `AccountTrackerWidget`, `SettingsPanel`, `FloatingWidget`, and `AlgoStatusWidget`
   - Removed `autopilot_enabled` column references (column may still exist in DB schema)

2. **AI Agent System**
   - Deleted `backend/ai/coaching_system.ts` (chat, tilt check, thread management)
   - Deleted `backend/ai/brain_observer.ts` (signal processing, tilt detection)
   - Deleted `backend/ai/bedrock_agent.ts` (AWS Bedrock integration)
   - Deleted AI migrations (`chat_threads`, `chat_messages`, `tilt_events` tables)
   - Deleted `backend/ai/COACHING-SYSTEM.md` documentation
   - Removed `ThreadHistory.tsx` component
   - Removed IV scoring routes (`backend-hono/src/routes/iv-scoring.ts`)

3. **Remaining Cleanup Needed**
   - `components/ChatInterface.tsx` still has references to `backend.ai.chat()` and `backend.ai.listConversations()` - **Frontend will be updated separately, not part of this implementation**
   - `lib/services.ts` has `AIService` class - **Frontend service layer will be updated separately**
   - `backend-hono/src/routes/ai.ts` currently returns empty conversations - needs new implementation

### Current Architecture

- **Backend**: `backend-hono/` (Hono framework, deployed to Fly.io)
- **Frontend**: `frontend/` (Vite + React, deployed to Vercel)
- **Database**: Neon PostgreSQL
- **Auth**: Clerk
- **Trading Integration**: ProjectX (TopStepX) via `backend/projectx/`

### Key Services Still Active

- **ProjectX Service**: Trading operations, account management, real-time data
- **Trading Service**: Trade recording, history (`backend/trading/index.ts`)
- **Account Service**: Account management, balance tracking
- **News Service**: News feed integration
- **ER Service**: Emotional Resonance monitoring (PsychAssist)
- **Market Service**: Market data endpoints

---

## Agent 1: AI Integration & Chat System

### Scope

Implement a new AI-powered chat and analysis system using **Vercel's AI SDK and marketplace integrations**. This replaces the old AWS Bedrock-based system.

**IMPORTANT: This is a BACKEND-ONLY implementation. Do NOT modify any frontend components. Focus solely on creating API endpoints, database schemas, and backend logic.**

### Requirements Gathering & Questions

**Before starting implementation, you must gather answers to the following questions:**

#### 1. Scoring System Design

The scoring system replaces the old IV scoring functionality. You need to determine:

- **What should the scoring system evaluate?**
  - Market volatility (VIX-based)?
  - Trading opportunity quality?
  - Risk assessment?
  - Portfolio health?
  - Combination of multiple factors?

- **What is the scoring scale?**
  - Numeric range (e.g., 0-100, 1-10)?
  - Categorical (e.g., Low/Medium/High/Extreme)?
  - Multi-dimensional scores (separate scores for different aspects)?

- **What inputs are required for scoring?**
  - Current VIX level?
  - Market data (price, volume, etc.)?
  - User's trading history?
  - Account balance/equity?
  - Open positions?
  - Time of day/market session?

- **How should scores be calculated?**
  - Formula-based calculation? (deterministic, transparent)
  - AI/ML model-based prediction? (learns from data, may need training)
  - Rule-based system? (if-then logic, easy to understand)
  - Hybrid approach? (combine multiple methods)
  - Should AI be used to enhance/validate formula-based scores?
  - Do we need AI to identify which factors are most important?

- **Scoring Calculation Details:**
  - What is the exact formula/algorithm? (if formula-based)
  - How should different factors be weighted? (e.g., VIX 40%, volume 20%, news 20%, price action 20%)
  - Should weights be adjustable per user or fixed?
  - Do we need AI to optimize weights based on historical performance?
  - Should scoring consider user's trading style/history? (personalized scoring)
  - How should we handle missing data? (default values, skip calculation, use AI to estimate)

- **AI Integration for Scoring:**
  - Should AI be used to generate scoring explanations? (why this score)
  - Do we need AI to predict score changes? (forecast future scores)
  - Should AI analyze score patterns and provide insights?
  - Which AI model should be used for scoring? (may need fast model for real-time)
  - Should scoring use function calling to fetch market data?

- **When should scores be generated?**
  - On-demand via API call? (user requests score)
  - Scheduled/periodic updates? (e.g., every 5 minutes, hourly)
  - Real-time streaming? (continuous updates)
  - Event-triggered? (on trade execution, market event, news release)
  - Combination? (real-time for active symbols, periodic for others)

- **How should scores be stored and retrieved?**
  - Store historical scores for trend analysis? (time-series database)
  - Cache recent scores for performance? (Redis, in-memory cache)
  - Associate scores with specific symbols/contracts? (symbol-level scoring)
  - Time-series data structure? (for charting, analysis)
  - How long should historical scores be retained? (30 days, 1 year, unlimited)
  - Should we aggregate scores? (hourly averages, daily summaries)

- **What metadata should accompany scores?**
  - Timestamp? (when score was calculated)
  - Confidence level? (how reliable is this score)
  - Factors that influenced the score? (breakdown of components)
  - Recommendations based on score? (AI-generated suggestions)
  - Score change from previous? (delta, trend)
  - Comparison to historical average? (above/below normal)
  - Market context? (market regime, session, volatility state)

- **Scoring Performance Requirements:**
  - What is the maximum acceptable latency? (<1s, <5s, <30s)
  - How many concurrent scoring requests should be supported?
  - Should scoring be cached? If so, what's the cache TTL?
  - Do we need batch scoring? (score multiple symbols at once)
  - Should scoring be prioritized? (active symbols get faster updates)

#### 2. Vercel AI Marketplace & Available Tools

Research and present available options from Vercel AI SDK and marketplace:

- **Available AI Models:**
  - Which models are supported? (OpenAI, Anthropic, Google, etc.)
  - What are the cost implications?
  - What are the rate limits?
  - Which models are best for:
    - Chat/conversation?
    - Analysis/reasoning?
    - Code generation?
    - Data extraction?

- **Vercel AI SDK Features:**
  - Streaming responses?
  - Function calling/tool use?
  - Structured outputs?
  - Caching capabilities?
  - Rate limiting?

- **Marketplace Integrations:**
  - What third-party tools are available?
  - Database integrations?
  - API integrations?
  - Data processing tools?
  - Analytics tools?

- **Recommended Stack:**
  - Which combination of models/tools would work best for:
    - Chat interface (conversational AI)?
    - Quick pulse analysis (fast market analysis)?
    - Threat history analysis (pattern recognition)?
    - Scoring system (data analysis)?

#### 3. Threat History Implementation

The threat history system tracks and analyzes trading patterns, losses, and risk events:

- **What constitutes a "threat"?**
  - Consecutive losses?
  - Large drawdowns?
  - Overtrading patterns?
  - Emotional trading indicators?
  - Risk limit breaches?
  - Combination of factors?

- **What data should be tracked?**
  - Trade history (wins/losses, P&L)?
  - Trading frequency/patterns?
  - Account balance changes?
  - Emotional resonance scores?
  - Risk metrics?
  - Time-based patterns (time of day, day of week)?

- **How should threats be categorized?**
  - Severity levels (Low/Medium/High/Critical)?
  - Threat types (Overtrading, Revenge Trading, Tilt, etc.)?
  - Time-based (Recent, Historical, Recurring)?

- **How should threat history be analyzed?**
  - Pattern recognition? (detect recurring patterns)
  - Trend analysis? (identify worsening/improving trends)
  - Predictive modeling? (predict future threats)
  - AI-powered analysis? (use AI to identify insights)
  - Statistical analysis? (correlations, probabilities)
  - Machine learning? (train models on historical data)

- **AI Model Selection for Threat Analysis:**
  - Which AI model should analyze threat history? (may need different model than chat)
  - Should threat analysis use the same model as chat or a specialized model?
  - Do we need a model with strong pattern recognition capabilities?
  - Should threat analysis be real-time or batch processed?
  - Do we need the model to generate explanations for threat patterns?
  - Should the model provide actionable recommendations?

- **What actions should be triggered by threats?**
  - Alerts/notifications? (in-app, email, push)
  - Recommendations? (AI-generated suggestions)
  - Automatic risk adjustments? (reduce position size, pause trading)
  - Trading restrictions? (disable autopilot, require manual approval)
  - Escalation? (notify support, trigger intervention)

- **How should threat history be presented?**
  - Timeline view? (chronological threat events)
  - Summary statistics? (threat counts, trends)
  - Pattern visualizations? (charts, graphs)
  - Recommendations/insights? (AI-generated analysis)
  - Filtering/search? (by type, date, severity)
  - Export capabilities? (CSV, PDF reports)

#### 4. AI Model Selection & Dropdown Menu

**⚠️ IMPORTANT: Determine if model selection dropdown should be implemented and gather requirements:**

- **Should we implement a model selection dropdown?**
  - Yes, allow users to choose models
  - No, use a single default model
  - Yes, but only for premium users
  - Yes, but only for specific features (e.g., analysis but not chat)

- **Which models should be available in the dropdown?**
  - All supported models from all providers?
  - Curated list of recommended models?
  - Only models available to user's tier? (Free, Pulse, Pulse Plus, Pulse Pro)
  - Should we include model descriptions/help text?
  - Do we need to show model status? (Available, Rate Limited, Unavailable)

- **Model Selection Scope:**
  - Per-user global preference? (one model for all features)
  - Per-feature selection? (different model for chat vs. analysis vs. scoring)
  - Per-conversation selection? (choose model when starting new chat)
  - Per-request selection? (choose model for each request)
  - Default with override? (global default, but can override per conversation)

- **What information should be displayed in the dropdown?**
  - Model name and provider? (e.g., "GPT-4 (OpenAI)")
  - Model capabilities? (e.g., "Best for: Analysis, Long context")
  - Cost indicator? (e.g., "$$$", "$$", "$", or actual cost per token)
  - Performance metrics? (e.g., "Fast", "Moderate", "Slow")
  - Context window size? (e.g., "128k tokens")
  - Recommended use cases? (e.g., "Chat", "Analysis", "Code")
  - Usage stats? (e.g., "Used 50 times this month")
  - Availability status? (e.g., "Available", "Rate Limited")

- **Dropdown UI/UX Questions:**
  - Where should the dropdown appear? (Chat interface, Settings panel, both)
  - Should it be always visible or hidden by default?
  - Do we need a "Model Info" button/tooltip? (explain model differences)
  - Should we show model comparison? (side-by-side comparison view)
  - Do we need model recommendations? (e.g., "Best for your use case: GPT-4")
  - Should we show model usage limits? (e.g., "5 requests remaining today")

- **Model Switching Behavior:**
  - Should model switching be allowed mid-conversation?
  - If yes, how should conversation context be handled? (carry over, start fresh, warn user)
  - Should there be restrictions on when switching is allowed? (e.g., not during active request)
  - Should switching require confirmation? (prevent accidental changes)
  - What happens to in-progress requests when switching? (cancel, complete, queue)

- **Model Configuration Options:**
  - Should users be able to configure model parameters? (temperature, max_tokens, top_p)
  - Do we need preset configurations? (e.g., "Creative", "Precise", "Balanced", "Fast")
  - Should configurations be saved per-model or globally?
  - Do we need advanced settings? (for power users)

- **Model Availability & Limits:**
  - Which models should be available to which user tiers?
    - Free tier: Which models? (likely cheaper/faster models)
    - Pulse tier: Which models?
    - Pulse Plus tier: Which models?
    - Pulse Pro tier: All models?
  - Should there be usage limits per model? (e.g., GPT-4: 10 requests/day for Pulse, unlimited for Pro)
  - How should we handle rate limits? (queue requests, show error, auto-fallback to backup model)
  - Do we need model usage tracking/billing integration?
  - Should users be able to add custom API keys? (use their own model access)

- **Backend API Design for Model Selection:**
  - `GET /ai/models` - List available models with metadata (name, provider, cost, capabilities, limits)
  - `GET /ai/models/:id` - Get detailed model information
  - `POST /ai/models/select` - Set user's preferred model(s) (global or per-feature)
  - `GET /ai/models/current` - Get user's current model selection(s)
  - `GET /ai/models/usage` - Get user's model usage stats
  - Should model selection be part of chat/analysis request body or separate endpoint?
  - Do we need model health/status endpoint? (check if model is available)

- **Implementation Considerations:**
  - Should model selection be stored in database or user settings?
  - Do we need to track model performance? (response time, error rate, user satisfaction)
  - Should we implement model fallback? (if selected model fails, use backup)
  - Do we need A/B testing? (test different models, track performance)
  - Should we log model usage for analytics? (which models are most popular)

### Responsibilities

1. **Chat Interface Backend Implementation**
   - Integrate Vercel AI SDK (`@ai-sdk/vercel` or `ai` package)
   - Implement conversation management (threads, history) via backend API
   - Create new backend routes in `backend-hono/src/routes/ai.ts`
   - **Note: Frontend will consume these APIs separately - do NOT modify frontend files**

2. **AI Features to Implement**
   - **Chat System**: Real-time AI chat with conversation threading
   - **Quick Pulse Analysis**: Fast market/trading analysis on demand
   - **Threat History**: Track and analyze trading patterns, losses, risk events (replaces old threat history problem)
   - **Scoring System**: Market analysis scoring (replaces IV scoring)

3. **Vercel AI Integration**
   - Use Vercel AI SDK for model integration
   - Leverage Vercel AI marketplace tools/integrations
   - Implement streaming responses for chat
   - Set up proper error handling and rate limiting

4. **Database Schema**
   - Create new migrations for:
     - `ai_conversations` table (replaces old `chat_threads`)
     - `ai_messages` table (replaces old `chat_messages`)
     - `threat_history` table (for tracking trading threats/patterns)
     - `pulse_analysis` table (for quick pulse analysis results)
   - Migration files: `backend-hono/migrations/X_create_ai_tables.up.sql`

5. **Backend Routes** (`backend-hono/src/routes/ai.ts`)
   - `POST /ai/chat` - Send message, get AI response
   - `GET /ai/conversations` - List user conversations
   - `GET /ai/conversations/:id` - Get conversation history
   - `POST /ai/quick-pulse` - Generate quick pulse analysis
   - `GET /ai/threat-history` - Get threat history for user
   - `POST /ai/score` - Generate market/trading score

6. **Backend API Design**
   - Design RESTful endpoints that frontend can consume
   - Ensure consistent response formats
   - Include proper error handling and status codes
   - **Note: Frontend integration will be handled separately - do NOT modify frontend files**

### Technical Requirements

- Use TypeScript with strict mode
- Follow existing patterns in `backend-hono/src/routes/`
- Use `sql` template from `backend-hono/src/db/index.js` for database queries
- Implement proper authentication using Clerk (check `c.get('userId')`)
- Add proper error handling and logging
- Follow user rules: branch naming `v.{MONTH}.{DATE}.{PATCH}`, commit format `[v.X.X.X] type: message`

### Key Files to Create/Modify (Backend Only)

- `backend-hono/src/routes/ai.ts` - Main AI routes
- `backend-hono/migrations/X_create_ai_tables.up.sql` - Database schema
- `backend-hono/src/services/ai-service.ts` - AI service logic (optional, for organization)
- **DO NOT modify frontend files** - Frontend integration will be handled separately

### Dependencies to Add

```json
{
  "ai": "^latest", // Vercel AI SDK
  "@ai-sdk/vercel": "^latest" // If using Vercel-specific features
}
```

### Testing Checklist

- [ ] Chat messages send and receive responses
- [ ] Conversation history loads correctly
- [ ] Quick pulse analysis generates results
- [ ] Threat history tracks and displays patterns
- [ ] Scoring system calculates and returns scores
- [ ] Error handling works for API failures
- [ ] Authentication is enforced on all endpoints

---

## Agent 2: Autopilot & Trading Automation

### Scope

Implement a new autopilot system for semi-autonomous trading with human-in-the-loop validation. This is a complete rewrite from scratch, not based on the old autopilot code.

**IMPORTANT: This is a BACKEND-ONLY implementation. Do NOT modify any frontend components. Focus solely on creating API endpoints, database schemas, and backend logic.**

### 🚨 CRITICAL: ProjectX API Documentation Compliance

**BEFORE YOU START CODING:** Read and understand the ProjectX API documentation at `docs/integration/PROJECTX-API.md`.

**You MUST follow the ProjectX API documentation EXACTLY - down to the last letter of syntax.**
- All endpoint URLs must match exactly
- All field names must match exactly (case-sensitive)
- All enum values must match exactly (use numeric values, not strings)
- All request/response structures must match exactly
- Any deviation will cause API failures

See the detailed requirements in the [ProjectX API Integration Requirements](#-critical-projectx-api-integration-requirements) section below.

### ⚠️ CRITICAL: Requirements Gathering Required

**🚨 STOP: Do NOT begin coding until you have answers to ALL questions below.**

The autopilot system is a critical component that directly affects trading execution and user funds. Implementation decisions made without clear requirements will lead to rework, bugs, and potential financial risk. 

**Action Items:**
1. Review all questions in the sections below
2. Schedule a requirements gathering session with product owner/stakeholders
3. Document all answers in a separate requirements document (e.g., `docs/requirements/AUTOPILOT-REQUIREMENTS.md`)
4. Get sign-off on requirements before starting implementation
5. Reference the requirements document throughout implementation

### Requirements Gathering Questions

**Before starting implementation, you MUST gather answers to the following questions from the product owner/stakeholders. Do NOT proceed with implementation until these requirements are clearly defined.**

#### 1. Trading Model Criteria & Configuration

**For each trading model (Morning Flush, Lunch/Power Hour Flush, 40/40 Club, Momentum Model, 22 VIX Fix, Charged Up Rippers, Mean Reversion Model), we need to define:**

- **Entry Criteria:**
  - What market conditions must be met? (e.g., VIX levels, price action patterns, volume thresholds, time of day)
  - What technical indicators should trigger entry? (e.g., moving averages, support/resistance levels, RSI, MACD)
  - Are there specific market hours or time windows for each strategy?
  - What market data sources are required? (real-time quotes, historical bars, order flow)

- **Position Sizing:**
  - How should position size be calculated? (fixed size, percentage of account, ATR-based, risk-based)
  - What is the maximum position size per strategy?
  - Should position sizing vary based on account balance or recent performance?
  - Are there different sizing rules for different market conditions?

- **Risk Parameters:**
  - What is the maximum risk per trade? (dollar amount, percentage, ticks)
  - What stop-loss strategy should be used? (fixed ticks, ATR-based, trailing stop, bracket orders)
  - What take-profit targets? (fixed ticks, risk-reward ratio, dynamic targets)
  - Should risk parameters be adjustable per strategy or global?

- **Strategy-Specific Questions:**
  - **Morning Flush**: What time window? What price action pattern? What volume requirements?
  - **Lunch/Power Hour Flush**: What time window? What defines a "flush"? What confirmation signals?
  - **40/40 Club**: What are the exact criteria for entry? What timeframes?
  - **Momentum Model**: What momentum indicators? What timeframe? What confirmation needed?
  - **22 VIX Fix**: What VIX level triggers? What price action confirmation? What time of day?
  - **Charged Up Rippers**: What defines a "charged" market? What news/event triggers?
  - **Mean Reversion**: What oversold/overbought levels? What timeframe? What confirmation?

- **Strategy Enablement:**
  - Can multiple strategies run simultaneously?
  - Should strategies be mutually exclusive in certain conditions?
  - How should strategy conflicts be resolved?
  - Should there be a priority system for strategies?

#### 2. Trade Execution Approach

- **Execution Method:**
  - Should trades be executed immediately upon proposal approval, or queued?
  - What order types should be supported? (market, limit, stop, stop-limit, bracket orders)
  - Should we support partial fills? How should partial fills be handled?
  - What happens if the market moves significantly between proposal and execution?

- **Order Management:**
  - How should orders be modified if market conditions change before execution?
  - Should there be automatic order cancellation if criteria are no longer met?
  - What is the maximum time a proposal can remain pending before auto-cancellation?
  - Should we support order modification after execution (trailing stops, profit targets)?

- **Execution Timing:**
  - Should there be a delay between approval and execution? (e.g., 1 second, 5 seconds)
  - Should execution be immediate or wait for specific market conditions?
  - How should we handle market hours? (pre-market, regular hours, after-hours)
  - Should execution be paused during high volatility or news events?

- **Error Handling:**
  - What happens if ProjectX API returns an error?
  - Should we retry failed executions? How many times? With what backoff?
  - How should we handle insufficient buying power or margin errors?
  - What notifications should be sent for execution failures?

- **Real-time Updates:**
  - How should we handle real-time order status updates from ProjectX?
  - Should we poll for order status or rely on webhooks/SignalR?
  - How often should we sync order status with ProjectX?
  - What should happen if we lose connection to ProjectX during execution?

#### 3. Account Tracker Card Updates

**The account tracker will need to display autopilot-related data. The backend should provide this data via API. Questions:**

- **Visual Indicators:**
  - How should autopilot status be displayed? (icon, badge, color coding, text)
  - Should there be different indicators for different states? (enabled, active, paused, error)
  - Should we show the number of active proposals? Pending approvals?
  - Should we display which strategies are currently active?

- **Information Display:**
  - Should the tracker show autopilot P&L separately from manual trading P&L?
  - Should we display autopilot-specific metrics? (e.g., proposals today, execution rate, win rate)
  - Should we show risk metrics? (e.g., current exposure, remaining daily loss limit)
  - Should we display recent autopilot activity? (last proposal, last execution)

- **Interactive Elements:**
  - Should users be able to enable/disable autopilot directly from the tracker?
  - Should there be a quick link to view pending proposals?
  - Should we show alerts/notifications for autopilot events?
  - Should users be able to pause autopilot temporarily?

- **Layout & Design:**
  - Should autopilot information be integrated into the existing tracker or a separate section?
  - What is the priority of autopilot information vs. existing account info?
  - Should the tracker expand/collapse to show more autopilot details?
  - How should autopilot status integrate with the existing P&L pendulum display?

- **Real-time Updates:**
  - How often should autopilot status be refreshed? (real-time, every 5 seconds, on-demand)
  - Should we use websockets/polling for live updates?
  - What events should trigger immediate UI updates? (new proposal, execution, error)

#### 4. Additional Questions

- **User Experience:**
  - How should proposals be presented to users? (modal, sidebar, notification, in-app)
  - What information should be shown in a proposal? (strategy, entry criteria, risk, expected outcome)
  - Should users be able to modify proposals before approval? (size, stop-loss, take-profit)
  - What is the approval workflow? (single click, confirmation dialog, review screen)

- **Notifications & Alerts:**
  - What events should trigger notifications? (new proposal, execution success/failure, risk limit reached)
  - What notification channels? (in-app, browser, email, mobile push)
  - Should users be able to customize notification preferences?

- **Performance & Analytics:**
  - What metrics should be tracked? (win rate, profit factor, Sharpe ratio, max drawdown)
  - Should we provide performance analytics per strategy?
  - Should we track autopilot performance vs. manual trading?
  - How should historical performance be displayed?

- **Safety & Compliance:**
  - Are there any regulatory requirements for automated trading?
  - Should there be mandatory cooldown periods after losses?
  - Should autopilot automatically disable under certain conditions? (e.g., after X consecutive losses)
  - What audit trail is required? (logging, recording of all proposals/executions)

### Documenting Requirements

After gathering answers, create a requirements document at `docs/requirements/AUTOPILOT-REQUIREMENTS.md` that includes:

- All answers to the questions above
- Decision rationale for each answer
- Any additional requirements discovered during discussions
- Mockups/wireframes for UI components (if applicable)
- API contract definitions
- Database schema decisions
- Integration points and dependencies

This document will serve as the source of truth during implementation and should be updated as requirements evolve.

### Responsibilities

1. **Autopilot Core System**
   - Design and implement proposal/acknowledgment workflow
   - Risk validation before proposing actions
   - Human approval required before execution
   - Action execution via ProjectX API
   - Status tracking (draft, pending, approved, rejected, executed, failed)

2. **Trading Strategies Integration**
   - Integrate with existing trading models from `SettingsContext`:
     - Price Action: Morning Flush, Lunch/Power Hour Flush, 40/40 Club, Momentum Model
     - Volatility: 22 VIX Fix
     - Risk Event-Based: Charged Up Rippers
     - Mean Reversion: Mean Reversion Model
   - Strategy execution logic
   - Strategy enable/disable controls

3. **Risk Management**
   - Daily loss limit validation
   - Position size limits
   - Account balance checks
   - Real-time risk monitoring
   - Circuit breakers for excessive losses

4. **Database Schema**
   - Create new migrations for:
     - `autopilot_proposals` table (replaces old `proposed_actions`)
     - `autopilot_executions` table (tracks executed actions)
     - `autopilot_settings` table (user autopilot preferences)
   - Migration files: `backend-hono/migrations/X_create_autopilot_tables.up.sql`
   - Update `accounts` table if needed (may already have `autopilot_enabled` column)

5. **Backend Routes** (`backend-hono/src/routes/autopilot.ts`)
   - `POST /autopilot/propose` - Propose a trading action
   - `POST /autopilot/acknowledge` - Approve/reject a proposal
   - `GET /autopilot/proposals` - List user's proposals
   - `GET /autopilot/proposals/:id` - Get proposal details
   - `POST /autopilot/execute` - Execute approved proposal
   - `GET /autopilot/status` - Get autopilot status and settings
   - `POST /autopilot/settings` - Update autopilot settings

6. **Backend API Design**
   - Design RESTful endpoints that frontend can consume
   - Ensure consistent response formats
   - Include proper error handling and status codes
   - **Note: Frontend integration will be handled separately - do NOT modify frontend files**

7. **ProjectX Integration**
   - Use existing `backend/projectx/` service for order placement
   - Ensure proper error handling for ProjectX API calls
   - Handle real-time updates for executed orders

### Requirements Gathering & Questions

**⚠️ IMPORTANT: Before implementing, you MUST gather answers to the following questions from the product owner/stakeholders. Do not proceed with implementation until these requirements are clarified.**

#### 1. Trading Model Criteria & Configuration

**Model Trigger Criteria:**
- For each trading model (Morning Flush, Lunch/Power Hour Flush, 40/40 Club, Momentum Model, 22 VIX Fix, Charged Up Rippers, Mean Reversion), what are the specific entry criteria?
  - What market conditions must be met? (e.g., VIX level, volume thresholds, price action patterns)
  - What time windows are valid? (e.g., Morning Flush: 9:30-10:30 AM ET)
  - What are the required technical indicators? (e.g., moving averages, RSI, support/resistance levels)
  - Are there market regime requirements? (e.g., trending vs. ranging markets)
- What are the exit criteria for each model? (profit target, stop loss, time-based, signal-based)
- Should models have adjustable parameters? (e.g., sensitivity, thresholds, time windows)
- Do models need to be backtested before enabling? (validation requirements)

**Model Risk Parameters:**
- What is the maximum position size per model? (absolute size, % of account, % of buying power)
- What is the maximum number of concurrent positions per model?
- Should models have individual risk limits or share global limits?
- What is the maximum daily loss per model before auto-disable?
- Should models have cooldown periods after losses? (e.g., disable for X minutes after Y losses)

**Model Priority & Conflicts:**
- What happens if multiple models signal trades simultaneously?
- Should models have priority levels? (e.g., Morning Flush has priority over Mean Reversion)
- Can multiple models trade the same symbol simultaneously?
- Should models be able to override each other's positions?

**Model Performance Tracking:**
- What metrics should be tracked per model? (win rate, avg profit/loss, max drawdown, Sharpe ratio)
- Should models be auto-disabled if performance drops below threshold?
- Do we need model performance reporting? (daily, weekly, monthly)
- Should users see model performance in the UI?

#### 2. Trade Execution Parameters

**Execution Workflow:**
- What is the exact proposal → approval → execution flow?
  - How long should proposals remain pending before expiring?
  - Can users modify proposals before approval? (e.g., adjust size, price)
  - Should there be a "quick approve" option for trusted setups?
  - Can users batch approve multiple proposals?
- What information should be shown in proposals? (symbol, side, size, entry price, stop loss, take profit, reasoning, risk metrics)
- Should proposals include risk analysis? (e.g., "This trade risks 2% of account")
- Do we need proposal templates? (save common setups)

**Order Types & Execution:**
- Which order types should be supported? (market, limit, stop, bracket orders)
- Should autopilot support bracket orders? (entry + stop loss + take profit in one order)
- What is the default order type per model? (can it vary by model?)
- Should we support order modifications? (e.g., move stop loss, adjust take profit)
- How should we handle partial fills?
- What happens if order execution fails? (retry, notify user, cancel proposal)

**Execution Timing:**
- Should there be execution delays? (e.g., wait 5 seconds after approval before executing)
- Can users set execution windows? (e.g., only execute between 9:30 AM - 3:45 PM)
- Should execution be paused during market events? (e.g., FOMC announcements, earnings)
- Do we need execution scheduling? (e.g., execute at specific time)

**Risk Checks Before Execution:**
- What risk validations must pass before execution? (daily loss limit, position size, margin requirements, account balance)
- Should we check for existing positions in the same symbol?
- Do we need correlation checks? (e.g., don't open correlated positions)
- Should we validate against user's trading plan/rules?

**Execution Notifications:**
- What notifications should be sent? (proposal created, approved, executed, failed)
- Should notifications be in-app, email, push, or all?
- What level of detail in notifications? (brief summary vs. full trade details)
- Should users receive execution confirmations with trade details?

#### 3. Account Tracker Card Updates

**Current State:**
- Review existing account endpoints to understand current data structure
- The account API currently provides: balance, current P&L, daily target, loss limit

**New Requirements to Determine:**
- What additional metrics should be displayed? (e.g., autopilot status, active proposals count, model performance, risk metrics)
- Should the tracker show autopilot-specific information? (e.g., "3 proposals pending", "Autopilot: Active")
- Do we need separate views? (e.g., "Trading View" vs. "Autopilot View")
- Should the tracker show model status? (which models are active, which are disabled)

**API Data Structure Questions:**
- What data structure should the `/autopilot/status` endpoint return for the account tracker?
- Should autopilot status be included in the existing `/account` endpoint or separate?
- What fields are needed? (status, active models count, pending proposals count, etc.)
- Should the endpoint return recent autopilot activity? (last 5 proposals, last executed trade)
- Do we need real-time updates? (WebSocket, SSE, or polling?)

**Data Refresh & Performance:**
- How often should autopilot data refresh? (real-time, every 5s, on-demand)
- Should we show loading states? (when fetching proposals, executing trades)
- Do we need optimistic updates? (show proposal as approved immediately, then confirm)

**Responsive Design:**
- How should the tracker look on mobile/tablet? (compact version, separate mobile view)
- Should autopilot features be hidden on smaller screens?
- Do we need a separate mobile autopilot interface?

**Integration with Other Components:**
- How should the tracker integrate with `AutopilotWidget`? (separate components, or combined)
- Should clicking the tracker open the autopilot dashboard?
- Do we need cross-component communication? (e.g., proposal created → tracker updates)

### Technical Requirements

- Use TypeScript with strict mode
- Follow existing patterns in `backend-hono/src/routes/`
- Use `sql` template from `backend-hono/src/db/index.js` for database queries
- Implement proper authentication using Clerk
- Add comprehensive error handling and logging
- Follow user rules: branch naming `v.{MONTH}.{DATE}.{PATCH}`, commit format `[v.X.X.X] type: message`
- **Never execute trades without explicit human approval**
- **🚨 CRITICAL: Follow ProjectX API documentation EXACTLY** - See [ProjectX API Integration Requirements](#-critical-projectx-api-integration-requirements) section below

### Key Files to Create/Modify (Backend Only)

- `backend-hono/src/routes/autopilot.ts` - Main autopilot routes
- `backend-hono/migrations/X_create_autopilot_tables.up.sql` - Database schema
- `backend-hono/src/services/autopilot-service.ts` - Autopilot business logic (optional, for organization)
- `backend-hono/src/services/strategy-engine.ts` - Trading strategy execution logic (optional)
- Update `backend-hono/src/routes/index.ts` to register autopilot routes
- **DO NOT modify frontend files** - Frontend integration will be handled separately

### Integration Points

- **ProjectX Service**: Use `backend/projectx/projectx_client.ts` for order execution
- **Trading Service**: Use `backend/trading/index.ts` for trade recording
- **Account Service**: Use account endpoints for balance/risk checks
- **Settings**: Trading model preferences should be stored in database (not read from frontend SettingsContext)

---

### ⚠️ CRITICAL: ProjectX API Integration Requirements

**🚨 MANDATORY: You MUST follow the ProjectX API documentation EXACTLY - down to the last letter of syntax.**

**Reference Documentation:** `docs/integration/PROJECTX-API.md`

#### Strict Adherence Requirements

1. **API Endpoint URLs:**
   - Use EXACT endpoint paths as documented (e.g., `/api/Order/place`, `/api/Order/modify`)
   - Do NOT modify, abbreviate, or change any part of the URL
   - Base URL must be: `https://api.topstepx.com/api`

2. **Request Body Structure:**
   - Field names MUST match documentation EXACTLY (case-sensitive)
   - Field types MUST match (number vs string vs boolean)
   - Required fields MUST be present
   - Optional fields should be `null` or omitted (not `undefined`)
   - Do NOT add extra fields not in the documentation

3. **Parameter Values:**
   - Enum values MUST match exactly (e.g., `type: 1` for Limit, `type: 2` for Market)
   - Contract IDs MUST use exact format: `CON.F.US.{SYMBOL}.{EXPIRATION}`
   - Account IDs must be integers (not strings)
   - All numeric values must match expected precision

4. **Order Types & Enums:**
   - Use EXACT enum values from documentation:
     - OrderType: `1` = Limit, `2` = Market, `4` = Stop, `5` = TrailingStop, `6` = JoinBid, `7` = JoinAsk
     - OrderSide: `0` = Bid (buy), `1` = Ask (sell)
     - OrderStatus: `0` = None, `1` = Open, `2` = Filled, `3` = Cancelled, `4` = Expired, `5` = Rejected, `6` = Pending
   - Do NOT use string values or custom enums

5. **Bracket Orders:**
   - `stopLossBracket` and `takeProfitBracket` structure MUST match exactly:
     ```typescript
     {
       ticks: number;    // Must be integer
       type: OrderType;  // Must use OrderType enum values
     }
     ```
   - Do NOT use different field names or structures

6. **Authentication:**
   - MUST use Bearer token authentication
   - Header format: `Authorization: Bearer {JWT_TOKEN}`
   - Token must be valid and not expired

7. **Real-Time SignalR Integration:**
   - Connection URLs MUST match exactly:
     - User Hub: `https://rtc.topstepx.com/hubs/user?access_token={TOKEN}`
     - Market Hub: `https://rtc.topstepx.com/hubs/market?access_token={TOKEN}`
   - Method names MUST match exactly (case-sensitive):
     - `SubscribeAccounts`, `SubscribeOrders`, `SubscribePositions`, `SubscribeTrades`
     - `SubscribeContractQuotes`, `SubscribeContractTrades`, `SubscribeContractMarketDepth`
   - Event handler names MUST match exactly:
     - `GatewayUserAccount`, `GatewayUserOrder`, `GatewayUserPosition`, `GatewayUserTrade`
     - `GatewayQuote`, `GatewayTrade`, `GatewayDepth`

8. **Response Handling:**
   - Check `success` field before processing
   - Handle `errorCode` and `errorMessage` fields
   - Do NOT assume response structure - validate all fields exist

9. **Error Handling:**
   - HTTP 401 = Authentication error (invalid/missing token)
   - HTTP 429 = Rate limit exceeded (implement backoff)
   - HTTP 400 = Bad request (validate request body)
   - Always check `success: false` and handle `errorMessage`

10. **Rate Limiting:**
    - `/api/History/retrieveBars`: 50 requests / 30 seconds
    - All other endpoints: 200 requests / 60 seconds
    - Implement exponential backoff on 429 errors

#### Validation Checklist

Before submitting code, verify:

- [ ] All API endpoint URLs match documentation exactly
- [ ] All request body field names match documentation (case-sensitive)
- [ ] All enum values use exact numeric values from documentation
- [ ] Contract IDs use exact format: `CON.F.US.{SYMBOL}.{EXPIRATION}`
- [ ] Authentication header format is correct: `Authorization: Bearer {TOKEN}`
- [ ] SignalR method names match documentation exactly (case-sensitive)
- [ ] SignalR event handler names match documentation exactly (case-sensitive)
- [ ] Response handling checks `success` field
- [ ] Error handling implements proper status code checks
- [ ] Rate limiting is respected with appropriate backoff

#### Testing Requirements

- Test with EXACT field names and values from documentation
- Verify enum values match documentation (use numbers, not strings)
- Test error scenarios (401, 429, 400)
- Verify SignalR connection and event handling matches documentation
- Test with real contract IDs in exact format

**⚠️ ANY DEVIATION FROM THE DOCUMENTATION WILL RESULT IN API FAILURES. FOLLOW IT EXACTLY.**

### Testing Checklist

- [ ] Proposals are created with proper risk validation
- [ ] Human approval is required before execution
- [ ] Risk limits are enforced (daily loss, position size)
- [ ] Orders execute correctly via ProjectX
- [ ] Proposal status updates correctly
- [ ] Error handling works for failed executions
- [ ] Autopilot can be enabled/disabled
- [ ] Trading models can be toggled on/off
- [ ] Real-time updates reflect executed orders

---

## Shared Requirements

### Code Quality

- TypeScript strict mode enabled
- Comprehensive error handling
- Proper logging (use `console.error` for errors, `console.log` for info)
- Input validation using Zod schemas (see existing routes for patterns)
- Authentication checks on all endpoints

### Database

- Use Neon PostgreSQL
- All queries use `sql` template tag from `backend-hono/src/db/index.js`
- Migrations follow existing naming: `X_description.up.sql` and `X_description.down.sql`
- Use parameterized queries to prevent SQL injection

### API Design

- RESTful endpoints
- Consistent error response format: `{ error: string }`
- Success responses include relevant data
- Use proper HTTP status codes (200, 400, 401, 404, 500)

### Authentication

- All endpoints require authentication
- Get userId from `c.get('userId')` in Hono routes
- Verify user owns resources before operations

### Deployment

- Backend deploys to Fly.io
- Frontend deploys to Vercel
- Environment variables managed via Fly.io secrets and Vercel env vars
- Database migrations run automatically on deployment

---

## Getting Started

1. **Fork/Create Branch**: Use format `v.{MONTH}.{DATE}.{PATCH}` (e.g., `v.5.15.1`)
2. **Review Existing Code**: Study `backend-hono/src/routes/` for patterns
3. **Set Up Local Environment**: Follow `docs/setup/SETUP-SUMMARY.md`
4. **Create Database Migrations**: Start with schema design
5. **Implement Backend Routes**: Follow existing route patterns
6. **Test API Endpoints**: Use Postman, curl, or similar to test endpoints
7. **Test Thoroughly**: Use checklist above
8. **Document API**: Document all endpoints with request/response examples
9. **Note**: Frontend integration will be handled in a separate phase

---

## Questions or Issues?

- Check existing code patterns in `backend-hono/src/routes/`
- Review `docs/architecture/ARCHITECTURE.md` for system design
- Check `docs/integration/` for third-party integration patterns
- Follow user rules in `.cursorrules` for coding standards

---

**Good luck! Build something great! 🚀**
