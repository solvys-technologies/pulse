/**
 * News Service
 * Core service for fetching, processing, and storing financial news
 */

import { sql } from '../db/index.js';
import { nitterClient, Tweet, FINANCIAL_ACCOUNTS } from './nitter-client.js';

export interface NewsArticle {
    id: string;
    externalId: string;
    title: string;
    content: string | null;
    source: string;
    author: string;
    url: string;
    publishedAt: string;
    macroLevel: 1 | 2 | 3 | 4;
    symbols: string[];
    sentiment: 'Bullish' | 'Bearish' | 'Neutral' | null;
    ivImpact: number | null;
    isBreaking: boolean;
}

// Keywords for macro level classification
const MACRO_LEVEL_KEYWORDS: Record<number, string[]> = {
    4: ['fed', 'fomc', 'powell', 'rate decision', 'rate cut', 'rate hike', 'cpi', 'inflation', 'nfp', 'jobs report', 'gdp'],
    3: ['earnings', 'guidance', 'revenue', 'profit', 'tariff', 'sanction', 'war', 'strike'],
    2: ['upgrade', 'downgrade', 'analyst', 'target', 'buyback', 'dividend'],
    1: [], // Default level
};

// Keywords for sentiment classification
const SENTIMENT_KEYWORDS = {
    bullish: ['surge', 'soar', 'rally', 'jump', 'gain', 'rise', 'beat', 'exceed', 'strong', 'bullish', 'buy', 'upgrade', 'record high'],
    bearish: ['plunge', 'crash', 'drop', 'fall', 'sink', 'miss', 'weak', 'bearish', 'sell', 'downgrade', 'cut', 'warning', 'concern'],
};

// Symbol mapping for common terms
const SYMBOL_KEYWORDS: Record<string, string[]> = {
    'ES': ['s&p', 'spx', 'spy', 's&p 500', 'es futures'],
    'NQ': ['nasdaq', 'qqq', 'tech', 'nq futures'],
    'YM': ['dow', 'djia', 'dow jones'],
    'CL': ['oil', 'crude', 'wti', 'brent'],
    'GC': ['gold', 'xau'],
    'ZB': ['bonds', 'treasury', 'yields', '10-year'],
};

/**
 * Classify macro level based on content
 */
function classifyMacroLevel(text: string): 1 | 2 | 3 | 4 {
    const lowerText = text.toLowerCase();

    for (const level of [4, 3, 2] as const) {
        const keywords = MACRO_LEVEL_KEYWORDS[level];
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                return level;
            }
        }
    }

    return 1;
}

/**
 * Classify sentiment based on content
 */
function classifySentiment(text: string): 'Bullish' | 'Bearish' | 'Neutral' {
    const lowerText = text.toLowerCase();

    let bullishScore = 0;
    let bearishScore = 0;

    for (const keyword of SENTIMENT_KEYWORDS.bullish) {
        if (lowerText.includes(keyword)) bullishScore++;
    }

    for (const keyword of SENTIMENT_KEYWORDS.bearish) {
        if (lowerText.includes(keyword)) bearishScore++;
    }

    if (bullishScore > bearishScore) return 'Bullish';
    if (bearishScore > bullishScore) return 'Bearish';
    return 'Neutral';
}

/**
 * Extract relevant symbols from content
 */
function extractSymbols(text: string): string[] {
    const lowerText = text.toLowerCase();
    const symbols: string[] = [];

    for (const [symbol, keywords] of Object.entries(SYMBOL_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                symbols.push(symbol);
                break;
            }
        }
    }

    return symbols;
}

/**
 * Convert Tweet to NewsArticle
 */
function tweetToArticle(tweet: Tweet): NewsArticle {
    const macroLevel = classifyMacroLevel(tweet.text);
    const sentiment = classifySentiment(tweet.text);
    const symbols = extractSymbols(tweet.text);

    // Breaking if level 3+ and from last 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const isBreaking = macroLevel >= 3 && tweet.createdAt.getTime() > tenMinutesAgo;

    return {
        id: tweet.id,
        externalId: `twitter:${tweet.id}`,
        title: tweet.text.substring(0, 200),
        content: tweet.text,
        source: 'Twitter',
        author: tweet.authorHandle,
        url: tweet.url,
        publishedAt: tweet.createdAt.toISOString(),
        macroLevel,
        symbols,
        sentiment,
        ivImpact: null,
        isBreaking,
    };
}

/**
 * Fetch fresh news from Nitter
 */
export async function fetchFreshNews(limit: number = 30): Promise<NewsArticle[]> {
    try {
        const tweets = await nitterClient.fetchAllFinancialNews(Math.ceil(limit / FINANCIAL_ACCOUNTS.length));
        return tweets.slice(0, limit).map(tweetToArticle);
    } catch (error) {
        console.error('Failed to fetch fresh news:', error);
        return [];
    }
}

/**
 * Store articles in database
 */
export async function storeArticles(articles: NewsArticle[]): Promise<void> {
    for (const article of articles) {
        try {
            await sql`
        INSERT INTO news_articles (
          external_id, title, content, source, author, url,
          published_at, macro_level, symbols, sentiment, is_breaking
        ) VALUES (
          ${article.externalId},
          ${article.title},
          ${article.content},
          ${article.source},
          ${article.author},
          ${article.url},
          ${article.publishedAt}::timestamptz,
          ${article.macroLevel},
          ${article.symbols},
          ${article.sentiment},
          ${article.isBreaking}
        )
        ON CONFLICT (external_id) DO UPDATE SET
          is_breaking = EXCLUDED.is_breaking,
          updated_at = NOW()
      `;
        } catch (error) {
            // Ignore duplicate key errors
            if (!(error instanceof Error) || !error.message.includes('duplicate')) {
                console.error('Failed to store article:', error);
            }
        }
    }
}

/**
 * Get news feed from database with optional symbol filter
 */
export async function getNewsFeed(options: {
    symbol?: string;
    limit?: number;
    offset?: number;
}): Promise<{ articles: NewsArticle[]; total: number }> {
    const { symbol, limit = 15, offset = 0 } = options;

    try {
        let articles;
        let countResult;

        if (symbol) {
            articles = await sql`
        SELECT id, external_id, title, content, source, author, url,
               published_at, macro_level, symbols, sentiment, iv_impact, is_breaking
        FROM news_articles
        WHERE ${symbol} = ANY(symbols) OR symbols = '{}'
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::integer as count
        FROM news_articles
        WHERE ${symbol} = ANY(symbols) OR symbols = '{}'
      `;
        } else {
            articles = await sql`
        SELECT id, external_id, title, content, source, author, url,
               published_at, macro_level, symbols, sentiment, iv_impact, is_breaking
        FROM news_articles
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

            countResult = await sql`
        SELECT COUNT(*)::integer as count FROM news_articles
      `;
        }

        return {
            articles: articles.map((row: any) => ({
                id: row.id.toString(),
                externalId: row.external_id,
                title: row.title,
                content: row.content,
                source: row.source,
                author: row.author,
                url: row.url,
                publishedAt: row.published_at?.toISOString() || new Date().toISOString(),
                macroLevel: row.macro_level,
                symbols: row.symbols || [],
                sentiment: row.sentiment,
                ivImpact: row.iv_impact,
                isBreaking: row.is_breaking,
            })),
            total: countResult[0]?.count || 0,
        };
    } catch (error) {
        console.error('Failed to get news feed:', error);
        return { articles: [], total: 0 };
    }
}

/**
 * Get breaking news from last N minutes
 */
export async function getBreakingNews(options: {
    symbol?: string;
    minutesBack?: number;
}): Promise<{ hasBreaking: boolean; articles: NewsArticle[]; pauseUntil: string | null }> {
    const { symbol, minutesBack = 10 } = options;

    try {
        const cutoff = new Date(Date.now() - minutesBack * 60 * 1000);

        let articles;
        if (symbol) {
            articles = await sql`
        SELECT id, external_id, title, content, source, author, url,
               published_at, macro_level, symbols, sentiment, iv_impact, is_breaking
        FROM news_articles
        WHERE is_breaking = true
          AND published_at > ${cutoff.toISOString()}::timestamptz
          AND (${symbol} = ANY(symbols) OR symbols = '{}')
        ORDER BY published_at DESC
        LIMIT 10
      `;
        } else {
            articles = await sql`
        SELECT id, external_id, title, content, source, author, url,
               published_at, macro_level, symbols, sentiment, iv_impact, is_breaking
        FROM news_articles
        WHERE is_breaking = true
          AND published_at > ${cutoff.toISOString()}::timestamptz
        ORDER BY published_at DESC
        LIMIT 10
      `;
        }

        const hasBreaking = articles.length > 0;

        // Calculate pause duration based on most recent breaking news
        let pauseUntil: string | null = null;
        if (hasBreaking && articles[0]) {
            const latestBreaking = new Date(articles[0].published_at);
            pauseUntil = new Date(latestBreaking.getTime() + 10 * 60 * 1000).toISOString();
        }

        return {
            hasBreaking,
            articles: articles.map((row: any) => ({
                id: row.id.toString(),
                externalId: row.external_id,
                title: row.title,
                content: row.content,
                source: row.source,
                author: row.author,
                url: row.url,
                publishedAt: row.published_at?.toISOString() || new Date().toISOString(),
                macroLevel: row.macro_level,
                symbols: row.symbols || [],
                sentiment: row.sentiment,
                ivImpact: row.iv_impact,
                isBreaking: row.is_breaking,
            })),
            pauseUntil,
        };
    } catch (error) {
        console.error('Failed to get breaking news:', error);
        return { hasBreaking: false, articles: [], pauseUntil: null };
    }
}

/**
 * Refresh news feed - fetch from Nitter and store
 */
export async function refreshNewsFeed(): Promise<{ fetched: number; stored: number }> {
    const articles = await fetchFreshNews(30);

    if (articles.length > 0) {
        await storeArticles(articles);
    }

    return { fetched: articles.length, stored: articles.length };
}

/**
 * Get Nitter instance health status
 */
export function getNitterHealth() {
    return nitterClient.getHealthStatus();
}
