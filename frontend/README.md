# Pulse Frontend

Vite + React frontend for Pulse - Integrated Trading Environment.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Backend API
VITE_API_URL=https://pulse-api-withered-dust-1394.fly.dev
```

3. Run development server:
```bash
npm run dev
```

## Project Structure

- `src/` - Source code
  - `components/` - React components organized by feature
    - `layout/` - AppShell, HeaderBar, LayoutManager
    - `navigation/` - NavRail, NavSidebar
    - `tape/` - The Tape news feed
    - `price/` - Price AI chat interface
    - `riskflow/` - RiskFlow KPI dashboard
    - `journal/` - Journal calendar and day details
    - `econ/` - Econ Calendar with TradingView iframe
  - `lib/` - Utilities and API client
  - `types/` - TypeScript type definitions
  - `hooks/` - React hooks
  - `pages/` - Sign-in/Sign-up pages
- `public/` - Static assets
- `index.html` - Entry HTML file

## Features

- **AppShell** with 3 layout modes (Combined, Tickers Only, Moveable)
- **Navigation** with Rail + Peek/Pin Sidebar
- **The Tape** - News feed with IV impact and sentiment
- **Price** - AI chat assistant
- **RiskFlow** - KPI dashboard with area charts
- **Journal** - P&L calendar and day detail modal
- **Econ Calendar** - TradingView integration with interpretation

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk authentication key |
| `VITE_API_URL` | Backend API URL |

## Deployment

Deploy to Vercel:

1. Connect your repository to Vercel
2. Set Root Directory to `frontend`
3. Set environment variables in Vercel dashboard
4. Deploy

## Build

```bash
npm run build
```

Output will be in the `dist/` directory.
