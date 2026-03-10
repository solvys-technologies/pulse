// [claude-code 2026-03-09] Tool-selection policy — prefer web_search/Exa before browser automation

import { exaSearch, formatExaContext, isExaAvailable, type ExaSearchResult } from './exa-service.js'

export interface ToolResult {
  source: string
  content: string
  results: ExaSearchResult[]
}

interface ToolDef {
  name: string
  available: () => boolean
  execute: (query: string) => Promise<ToolResult>
}

// Tool definitions ordered by preference
const exaTool: ToolDef = {
  name: 'exa_search',
  available: isExaAvailable,
  execute: async (query: string): Promise<ToolResult> => {
    const results = await exaSearch(query, { numResults: 5 })
    return {
      source: 'exa',
      content: formatExaContext(results),
      results,
    }
  },
}

// Tool chains per intent — ordered by preference (first available wins)
const TOOL_CHAINS: Record<string, ToolDef[]> = {
  'brief': [exaTool],
  'validate': [exaTool],
  'sp-analysis': [exaTool],
  'crypto-analysis': [exaTool],
  'fed-analysis': [exaTool],
  'political-analysis': [exaTool],
  'econ-analysis': [exaTool],
  'stock-analysis': [exaTool],
  'earnings': [exaTool],
  'megacap': [exaTool],
  // No tools for these intents:
  'quick_pulse': [],
  'report': [],
  'track': [],
  'maintenance': [],
  'mdb-report': [],
  'psych-eval': [],
  'rules': [],
}

export async function resolveToolChain(
  intent: string,
  query: string
): Promise<ToolResult | null> {
  const chain = TOOL_CHAINS[intent] ?? [exaTool]

  for (const tool of chain) {
    if (!tool.available()) {
      console.log(`[ToolPolicy] ${tool.name} not available, trying next`)
      continue
    }

    try {
      const result = await tool.execute(query)
      if (result.content) {
        console.log(`[ToolPolicy] ${tool.name} returned content for intent: ${intent}`)
        return result
      }
    } catch (err) {
      console.error(`[ToolPolicy] ${tool.name} failed:`, err)
    }
  }

  return null
}
