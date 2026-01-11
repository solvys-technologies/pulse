/**
 * Agent Pipeline Orchestrator
 * Runs the full collaborative AI agent pipeline
 * Phase 6 - Day 25
 */

import { analyzeMarketData } from './market-data-analyst.js'
import { analyzeNewsSentiment } from './news-sentiment-analyst.js'
import { analyzeTechnicals } from './technical-analyst.js'
import { buildBullCase } from './bullish-researcher.js'
import { buildBearCase } from './bearish-researcher.js'
import { runDebate } from './debate-protocol.js'
import { generateProposal } from './trader-agent.js'
import { assessProposal, getUserPsychology } from './risk-manager.js'
import type {
  AgentPipelineResult,
  MarketDataReport,
  NewsSentimentReport,
  TechnicalReport,
  ResearcherReport,
  DebateResult,
  TradingProposal,
  RiskAssessment,
} from '../../types/agents.js'

export interface PipelineOptions {
  includeDebate?: boolean
  includeProposal?: boolean
  currentPrice?: number
  accountSize?: number
  currentPnL?: number
  vixLevel?: number
}

/**
 * Run the full agent pipeline
 */
export async function runAgentPipeline(
  userId: string,
  options: PipelineOptions = {}
): Promise<AgentPipelineResult> {
  const startTime = Date.now()
  const { includeDebate = true, includeProposal = true } = options

  // Stage 1: Run all analysts in parallel
  const [marketDataReport, sentimentReport, technicalReport] = await Promise.all([
    analyzeMarketData(userId),
    analyzeNewsSentiment(userId),
    analyzeTechnicals(userId),
  ])

  const marketData = marketDataReport.reportData as unknown as MarketDataReport
  const sentiment = sentimentReport.reportData as unknown as NewsSentimentReport
  const technical = technicalReport.reportData as unknown as TechnicalReport

  // Get current price from input or market data
  const currentPrice = options.currentPrice ?? technical.emaAnalysis.ema20 ?? 19000

  // Stage 2: Run researchers in parallel
  const researcherInput = {
    marketData,
    sentiment,
    technical,
    currentPrice,
  }

  const [bullishReport, bearishReport] = await Promise.all([
    buildBullCase(userId, researcherInput),
    buildBearCase(userId, researcherInput),
  ])

  const bullish = bullishReport.reportData as unknown as ResearcherReport
  const bearish = bearishReport.reportData as unknown as ResearcherReport

  // Stage 3: Run debate (if enabled)
  let debate: DebateResult | undefined
  if (includeDebate) {
    debate = await runDebate(userId, {
      bullishReport: bullish,
      bearishReport: bearish,
      analystReportIds: [marketDataReport.id, sentimentReport.id, technicalReport.id],
    })
  } else {
    // Quick consensus without debate
    debate = createQuickConsensus(userId, bullish, bearish, [
      marketDataReport.id,
      sentimentReport.id,
      technicalReport.id,
    ])
  }

  // Stage 4: Generate proposal and assess risk (if enabled)
  let proposal: TradingProposal | undefined
  let riskAssessment: RiskAssessment | undefined

  if (includeProposal) {
    proposal = await generateProposal(userId, {
      marketData,
      sentiment,
      technical,
      debate,
      currentPrice,
      accountSize: options.accountSize,
    })

    // Get user psychology for risk assessment
    const psychology = await getUserPsychology(userId)

    riskAssessment = await assessProposal(userId, {
      proposal,
      psychology: psychology ?? undefined,
      currentPnL: options.currentPnL,
      accountSize: options.accountSize,
      vixLevel: options.vixLevel ?? marketData.vix.current,
    })
  }

  // Generate overall recommendation
  const overallRecommendation = generateOverallRecommendation(
    debate,
    riskAssessment,
    proposal
  )

  return {
    marketData,
    newsSentiment: sentiment,
    technical,
    debate,
    proposal,
    riskAssessment,
    overallRecommendation,
    pipelineLatencyMs: Date.now() - startTime,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Create quick consensus without full debate
 */
function createQuickConsensus(
  userId: string,
  bullish: ResearcherReport,
  bearish: ResearcherReport,
  analystReportIds: string[]
): DebateResult {
  // Simple comparison of conviction and argument strength
  const bullScore = bullish.conviction * 
    (bullish.keyArguments.reduce((s, a) => s + a.strength, 0) / Math.max(1, bullish.keyArguments.length * 10))
  const bearScore = bearish.conviction * 
    (bearish.keyArguments.reduce((s, a) => s + a.strength, 0) / Math.max(1, bearish.keyArguments.length * 10))

  const consensusScore = (bullScore - bearScore) / 100 // Normalize to -1 to +1

  return {
    id: crypto.randomUUID(),
    userId,
    analystReportIds,
    bullishReport: bullish,
    bearishReport: bearish,
    debateRounds: [], // No debate rounds
    consensusScore,
    finalAssessment: {
      recommendation: consensusScore > 0.2 ? 'bullish' : consensusScore < -0.2 ? 'bearish' : 'neutral',
      confidence: Math.abs(consensusScore) * 100,
      reasoning: `Quick assessment: ${consensusScore > 0 ? 'Bull' : 'Bear'} case stronger with ${Math.abs(consensusScore * 100).toFixed(0)}% edge.`,
      keyRisks: [...bullish.riskFactors.slice(0, 2), ...bearish.riskFactors.slice(0, 2)],
    },
    createdAt: new Date().toISOString(),
  }
}

/**
 * Generate overall recommendation from pipeline results
 */
function generateOverallRecommendation(
  debate: DebateResult,
  riskAssessment?: RiskAssessment,
  proposal?: TradingProposal
): AgentPipelineResult['overallRecommendation'] {
  // If risk assessment rejected, recommend avoid
  if (riskAssessment?.decision === 'rejected') {
    return {
      action: 'avoid',
      confidence: 100 - (riskAssessment.riskScore * 100),
      reasoning: riskAssessment.rejectionReason ?? 'Risk assessment failed.',
    }
  }

  // If proposal direction is flat, recommend wait
  if (proposal?.direction === 'flat') {
    return {
      action: 'wait',
      confidence: proposal.confidence,
      reasoning: 'Insufficient conviction for trade. Wait for clearer setup.',
    }
  }

  // If debate consensus is neutral, recommend wait
  if (Math.abs(debate.consensusScore) < 0.2) {
    return {
      action: 'wait',
      confidence: debate.finalAssessment.confidence,
      reasoning: debate.finalAssessment.reasoning,
    }
  }

  // Otherwise, trade with direction from proposal/debate
  const proposalDirection = proposal?.direction
  const direction: 'long' | 'short' = 
    (proposalDirection === 'long' || proposalDirection === 'short')
      ? proposalDirection
      : (debate.consensusScore > 0 ? 'long' : 'short')

  const confidence = proposal?.confidence ?? debate.finalAssessment.confidence

  return {
    action: 'trade',
    direction,
    confidence,
    reasoning: proposal?.rationale ?? debate.finalAssessment.reasoning,
  }
}

/**
 * Run analysts only (lighter weight)
 */
export async function runAnalystsOnly(userId: string): Promise<{
  marketData: MarketDataReport
  sentiment: NewsSentimentReport
  technical: TechnicalReport
  latencyMs: number
}> {
  const startTime = Date.now()

  const [marketDataReport, sentimentReport, technicalReport] = await Promise.all([
    analyzeMarketData(userId),
    analyzeNewsSentiment(userId),
    analyzeTechnicals(userId),
  ])

  return {
    marketData: marketDataReport.reportData as unknown as MarketDataReport,
    sentiment: sentimentReport.reportData as unknown as NewsSentimentReport,
    technical: technicalReport.reportData as unknown as TechnicalReport,
    latencyMs: Date.now() - startTime,
  }
}
