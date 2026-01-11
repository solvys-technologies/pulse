/**
 * Feed Service
 * RiskFlow news feed aggregation and filtering with AI analysis
 * Day 17 - Phase 5 Integration
 */

import type { FeedItem, FeedResponse, FeedFilters, NewsSource, UrgencyLevel, SentimentDirection } from '../../types/riskflow.js';
import { createXApiService, type ParsedTweetNews } from '../x-api-service.js';
import { getWatchlist, matchesWatchlist } from './watchlist-service.js';
import { analyzeHeadline, type AnalyzedHeadline } from '../analysis/grok-analyzer.js';
import { calculateIVScore } from '../analysis/iv-scorer.js';
import type { NewsSource as AnalysisNewsSource } from '../../types/news-analysis.js';

const MAX_FEED_ITEMS = 50;
const isDev = process.env.NODE_ENV !== 'production';

// Enable/disable AI analysis (can be toggled via env)
const ENABLE_AI_ANALYSIS = process.env.ENABLE_AI_ANALYSIS !== 'false';

// In-memory cache for feed items
let feedCache: { items: FeedItem[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Convert X API tweet to FeedItem (base conversion)
 */
function tweetToFeedItem(tweet: ParsedTweetNews): FeedItem {
  return {
    id: tweet.tweetId,
    source: tweet.source as NewsSource,
    headline: tweet.headline,
    body: tweet.body,
    symbols: tweet.symbols,
    tags: tweet.tags,
    isBreaking: tweet.isBreaking,
    urgency: determineUrgency(tweet),
    publishedAt: tweet.publishedAt,
  };
}

/**
 * Map RiskFlow NewsSource to Analysis NewsSource
 */
function mapToAnalysisSource(source: NewsSource): AnalysisNewsSource {
  const sourceMap: Record<NewsSource, AnalysisNewsSource> = {
    'FinancialJuice': 'FinancialJuice',
    'InsiderWire': 'InsiderWire',
    'Reuters': 'Reuters',
    'Bloomberg': 'Bloomberg',
    'Custom': 'Custom',
  };
  return sourceMap[source] ?? 'Custom';
}

/**
 * Enrich a feed item with AI analysis
 */
async function enrichWithAnalysis(item: FeedItem): Promise<FeedItem> {
  try {
    const analysisSource = mapToAnalysisSource(item.source);
    const analyzed = await analyzeHeadline(item.headline, analysisSource);
    
    // Calculate IV score using parsed data
    const ivResult = calculateIVScore({
      parsed: analyzed.parsed,
      hotPrint: analyzed.hotPrint,
      timestamp: new Date(item.publishedAt),
    });

    return {
      ...item,
      // Merge symbols from analysis if more comprehensive
      symbols: analyzed.parsed.symbols.length > item.symbols.length 
        ? analyzed.parsed.symbols 
        : item.symbols,
      // Merge tags
      tags: [...new Set([...item.tags, ...analyzed.parsed.tags])],
      // Use analysis breaking status if different
      isBreaking: item.isBreaking || analyzed.parsed.isBreaking,
      // Use analysis urgency if higher priority
      urgency: getHigherUrgency(item.urgency, analyzed.parsed.urgency),
      // Add sentiment
      sentiment: ivResult.sentiment as SentimentDirection,
      // Add IV score
      ivScore: ivResult.score,
      // Add analyzed timestamp
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[RiskFlow] Analysis enrichment failed for item:', item.id, error);
    return item;
  }
}

/**
 * Get higher priority urgency
 */
function getHigherUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  const priority: Record<UrgencyLevel, number> = {
    'immediate': 3,
    'high': 2,
    'normal': 1,
  };
  return priority[a] >= priority[b] ? a : b;
}

/**
 * Batch enrich feed items with analysis
 */
async function enrichFeedWithAnalysis(items: FeedItem[]): Promise<FeedItem[]> {
  if (!ENABLE_AI_ANALYSIS || items.length === 0) {
    return items;
  }

  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  const enriched: FeedItem[] = [];
  
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(enrichWithAnalysis));
    enriched.push(...results);
  }

  return enriched;
}

/**
 * Determine urgency level based on tweet content
 */
function determineUrgency(tweet: ParsedTweetNews): UrgencyLevel {
  if (tweet.isBreaking) return 'immediate';
  const urgentTags = ['CPI', 'PPI', 'NFP', 'FOMC', 'FED'];
  if (tweet.tags.some(t => urgentTags.includes(t))) return 'high';
  return 'normal';
}

/**
 * Apply filters to feed items
 */
function applyFilters(items: FeedItem[], filters: FeedFilters): FeedItem[] {
  let filtered = [...items];

  if (filters.sources?.length) {
    filtered = filtered.filter(item => filters.sources!.includes(item.source));
  }

  if (filters.symbols?.length) {
    const symbolSet = new Set(filters.symbols.map(s => s.toUpperCase()));
    filtered = filtered.filter(item =>
      item.symbols.some(s => symbolSet.has(s.toUpperCase()))
    );
  }

  if (filters.tags?.length) {
    const tagSet = new Set(filters.tags.map(t => t.toUpperCase()));
    filtered = filtered.filter(item =>
      item.tags.some(t => tagSet.has(t.toUpperCase()))
    );
  }

  if (filters.breakingOnly) {
    filtered = filtered.filter(item => item.isBreaking);
  }

  if (filters.minIvScore !== undefined) {
    filtered = filtered.filter(item => (item.ivScore ?? 0) >= filters.minIvScore!);
  }

  return filtered;
}

/**
 * Fetch fresh feed from X API
 */
async function fetchFreshFeed(): Promise<FeedItem[]> {
  try {
    const xApiService = createXApiService();
    const tweets = await xApiService.fetchLatestTweets();
    return tweets.map(tweetToFeedItem);
  } catch (error) {
    console.error('[RiskFlow] X API fetch error:', error);
    return [];
  }
}

/**
 * Generate mock feed for development
 */
function generateMockFeed(): FeedItem[] {
  const now = new Date();
  const mockItems: FeedItem[] = [
    {
      id: 'mock-1',
      source: 'FinancialJuice',
      headline: 'BREAKING: Fed signals potential rate cut in March meeting',
      body: 'Federal Reserve officials indicate openness to rate cuts amid cooling inflation data.',
      symbols: ['ES', 'NQ', 'SPY'],
      tags: ['FED', 'FOMC', 'RATES'],
      isBreaking: true,
      urgency: 'immediate',
      publishedAt: new Date(now.getTime() - 5 * 60_000).toISOString(),
    },
    {
      id: 'mock-2',
      source: 'InsiderWire',
      headline: 'CPI comes in at 2.9% YoY, below expectations of 3.1%',
      body: 'Consumer Price Index shows continued disinflation trend.',
      symbols: ['ES', 'NQ', 'TLT'],
      tags: ['CPI', 'INFLATION'],
      isBreaking: true,
      urgency: 'immediate',
      ivScore: 8.5,
      publishedAt: new Date(now.getTime() - 15 * 60_000).toISOString(),
    },
    {
      id: 'mock-3',
      source: 'FinancialJuice',
      headline: 'NVDA announces new AI chip with 2x performance improvement',
      symbols: ['NVDA', 'AMD', 'INTC'],
      tags: ['TECH', 'AI'],
      isBreaking: false,
      urgency: 'high',
      publishedAt: new Date(now.getTime() - 30 * 60_000).toISOString(),
    },
    {
      id: 'mock-4',
      source: 'InsiderWire',
      headline: 'Oil prices surge on Middle East tensions',
      body: 'Crude oil jumps 3% as geopolitical risks escalate.',
      symbols: ['CL', 'USO', 'XLE'],
      tags: ['OIL', 'COMMODITIES'],
      isBreaking: false,
      urgency: 'normal',
      publishedAt: new Date(now.getTime() - 45 * 60_000).toISOString(),
    },
    {
      id: 'mock-5',
      source: 'FinancialJuice',
      headline: 'Initial jobless claims at 220K vs 215K expected',
      symbols: ['ES', 'NQ'],
      tags: ['JOBS', 'NFP'],
      isBreaking: false,
      urgency: 'normal',
      ivScore: 4.2,
      publishedAt: new Date(now.getTime() - 60 * 60_000).toISOString(),
    },
  ];

  return mockItems;
}

/**
 * Get feed items with caching and AI analysis
 */
async function getCachedFeed(): Promise<FeedItem[]> {
  // Check cache validity
  if (feedCache && Date.now() - feedCache.fetchedAt < CACHE_TTL_MS) {
    return feedCache.items;
  }

  // In dev mode without X API token, use mock data
  if (isDev && !process.env.X_API_BEARER_TOKEN) {
    const mockItems = generateMockFeed();
    // Enrich mock data with analysis for realistic testing
    const enrichedItems = await enrichFeedWithAnalysis(mockItems);
    feedCache = { items: enrichedItems, fetchedAt: Date.now() };
    return enrichedItems;
  }

  // Fetch fresh data
  const rawItems = await fetchFreshFeed();

  // If fetch failed and we have stale cache, use it
  if (rawItems.length === 0 && feedCache) {
    return feedCache.items;
  }

  // Enrich with AI analysis
  const enrichedItems = await enrichFeedWithAnalysis(rawItems);

  // Update cache
  if (enrichedItems.length > 0) {
    feedCache = { items: enrichedItems, fetchedAt: Date.now() };
  }

  return enrichedItems;
}

/**
 * Get feed with user watchlist applied
 */
export async function getFeed(userId: string, filters?: FeedFilters): Promise<FeedResponse> {
  const allItems = await getCachedFeed();
  const watchlist = getWatchlist(userId);

  // Apply watchlist filtering
  let items = allItems.filter(item => matchesWatchlist(watchlist, item));

  // Apply additional filters
  if (filters) {
    items = applyFilters(items, filters);
  }

  // Sort by published date (newest first)
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Apply pagination
  const limit = Math.min(filters?.limit ?? MAX_FEED_ITEMS, MAX_FEED_ITEMS);
  const paginatedItems = items.slice(0, limit);

  return {
    items: paginatedItems,
    total: items.length,
    hasMore: items.length > limit,
    nextCursor: items.length > limit ? paginatedItems[limit - 1]?.id : undefined,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get breaking news only
 */
export async function getBreakingNews(userId: string): Promise<FeedResponse> {
  return getFeed(userId, { breakingOnly: true, limit: 10 });
}
