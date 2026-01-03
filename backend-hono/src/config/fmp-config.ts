type Env = Record<string, string | undefined>

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Env } }).process?.env
  return env?.[key]
}

export interface FmpHotPrintThresholds {
  defaultDeviation: number
  cpiPpiDeviation: number
  gdpDeviation: number
  nfpAbsolute: number
  rateDecisionDelta: number
}

export interface FmpConfig {
  baseUrl: string
  apiKey?: string
  pollingIntervalMs: number
  windowMinutes: number
  thresholds: FmpHotPrintThresholds
  importantEvents: string[]
}

export const defaultFmpConfig: FmpConfig = {
  baseUrl: getEnv('FMP_BASE_URL') ?? 'https://financialmodelingprep.com/api/v3',
  apiKey: getEnv('FMP_API_KEY'),
  pollingIntervalMs: 60_000,
  windowMinutes: 90,
  thresholds: {
    defaultDeviation: 0.1, // 10%
    cpiPpiDeviation: 0.002, // 0.2%
    gdpDeviation: 0.005, // 0.5%
    nfpAbsolute: 50_000,
    rateDecisionDelta: 0.01
  },
  importantEvents: ['CPI', 'PPI', 'NFP', 'GDP', 'FOMC', 'Federal Reserve', 'Unemployment', 'Retail Sales']
}

export const fmpEndpoints = {
  economicCalendar: ({ from, to }: { from: string; to: string }) =>
    `/economic_calendar?from=${from}&to=${to}`,
  latestEconomicPrints: `/economic_calendar?limit=50`
}

