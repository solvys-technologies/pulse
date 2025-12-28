/**
 * News Service
 * Core service for fetching, processing, and storing financial news
 * 
 * Schema matches migration 12: news_articles table in Neon PostgreSQL
 */

import { sql } from '../db/index.js';
import { nitterClient, Tweet, FINANCIAL_ACCOUNTS } from './nitter-client.js';

export interface NewsArticle {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
    source: string;
    url: string;
    publishedAt: string;
    sentiment: number | null;
    ivImpact: number | null;
    symbols: string[];
    isBreaking: boolean;
    macroLevel: string | null;
    priceBrainSentiment: string | null;
    priceBrainClassification: string | null;
    impliedPoints: number | null;
    instrument: string | null;
    authorHandle: string | null;
}

// Keywords for macro level classification
const MACRO_LEVEL_KEYWORDS: Record<string, string[]> = {
    'critical': ['fed', 'fomc', 'powell', 'rate decision', 'rate cut', 'rate hike', 'cpi', 'inflation', 'nfp', 'jobs report', 'gdp'],
    'high': ['earnings', 'guidance', 'revenue', 'profit', 'tariff', 'sanction', 'war', 'strike'],
    'medium': ['upgrade', 'downgrade', 'analyst', 'target', 'buyback', 'dividend'],
    'low': [],
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

function classifyMacroLevel(text: string): string {
    const lowerText = text.toLowerCase();
    for (const level of ['critical', 'high', 'medium'] as const) {
        for (const keyword of MACRO_LEVEL_KEYWORDS[level]) {
            if (lowerText.includes(keyword)) return level;
        }
    }
    return 'low';
}

function classifySentiment(text: string): { score: number; label: string } {
    const lowerText = text.toLowerCase();
    let bullishScore = 0, bearishScore = 0;

    for (const kw of SENTIMENT_KEYWORDS.bullish) if (lowerText.includes(kw)) bullishScore++;
    for (const kw of SENTIMENT_KEYWORDS.bearish) if (lowerText.includes(kw)) bearishScore++;

    if (bullishScore > bearishScore) return { score: 0.5 + (bullishScore * 0.1), label: 'Bullish' };
    if (bearishScore > bullishScore) return { score: -0.5 - (bearishScore * 0.1), label: 'Bearish' };
    return { score: 0, label: 'Neutral' };
}

function extractSymbols(text: string): string[] {
    const lowerText = text.toLowerCase();
    const symbols: string[] = [];
    for (const [symbol, keywords] of Object.entries(SYMBOL_KEYWORDS)) {
        for (const kw of keywords) {
            if (lowerText.includes(kw)) { symbols.push(symbol); break; }
        }
    }
    return symbols;
}

function tweetToArticle(tweet: Tweet): Omit<NewsArticle, 'id'> {
    const macroLevel = classifyMacroLevel(tweet.text);
    const sentiment = classifySentiment(tweet.text);
    const symbols = extractSymbols(tweet.text);
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const isBreaking = (macroLevel === 'critical' || macroLevel === 'high') && tweet.createdAt.getTime() > tenMinutesAgo;

    return {
        title: tweet.text.substring(0, 200),
        summary: tweet.text.length > 200 ? tweet.text.substring(0, 300) + '...' : tweet.text,
        content: tweet.text,
        source: 'Twitter',
        url: tweet.url,
        publishedAt: tweet.createdAt.toISOString(),
        sentiment: Math.max(-1, Math.min(1, sentiment.score)),
        ivImpact: isBreaking ? 0.5 : 0.1,
        symbols,
        isBreaking,
        macroLevel,
        priceBrainSentiment: sentiment.label,
        priceBrainClassification: macroLevel === 'critical' || macroLevel === 'high' ? 'Counter-cyclical' : 'Cyclical',
        impliedPoints: isBreaking ? (sentiment.score > 0 ? 5 : -5) : null,
        instrument: null,
        authorHandle: tweet.authorHandle,
    };
}

/**
 * Fetch fresh news from Nitter and store in database
 */
export async function fetchAndStoreNews(limit: number = 15): Promise<{ fetched: number; stored: number }> {
    try {
        const tweets = await nitterClient.fetchAllFinancialNews(Math.ceil(limit / FINANCIAL_ACCOUNTS.length));
        const articles = tweets.slice(0, limit).map(tweetToArticle);
        let stored = 0;

        for (const article of articles) {
            try {
                await sql`
          INSERT INTO news_articles (
            title, summary, content, source, url, published_at,
            sentiment, iv_impact, symbols, is_breaking, macro_level,
            price_brain_sentiment, price_brain_classification, implied_points,
            instrument, author_handle
          ) VALUES (
            ${article.title}, ${article.summary}, ${article.content}, ${article.source},
            ${article.url}, ${article.publishedAt}::timestamptz,
            ${article.sentiment}, ${article.ivImpact}, ${article.symbols},
            ${article.isBreaking}, ${article.macroLevel},
            ${article.priceBrainSentiment}, ${article.priceBrainClassification},
            ${article.impliedPoints}, ${article.instrument}, ${article.authorHandle}
          )
          ON CONFLICT (url) DO UPDATE SET
            is_breaking = EXCLUDED.is_breaking,
            updated_at = NOW()
        `;
                stored++;
            } catch (err) {
                // Ignore duplicate errors
                if (!(err instanceof Error) || !err.message.includes('duplicate')) {
                    console.warn('Failed to store article:', err);
                }
            }
        }
        return { fetched: articles.length, stored };
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return { fetched: 0, stored: 0 };
    }
}

/**
 * Get news feed from database
 */
export async function getNewsFeed(options: {
    symbol?: string;
    limit?: number;
    offset?: number;
}): Promise<{ articles: NewsArticle[]; total: number }> {
    const { symbol, limit = 15, offset = 0 } = options;

    try {
        let articles;
        if (symbol) {
            articles = await sql`
        SELECT * FROM news_articles
        WHERE ${symbol} = ANY(symbols) OR symbols = '{}'
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        } else {
            articles = await sql`
        SELECT * FROM news_articles
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        }

        const [countResult] = await sql`SELECT COUNT(*)::integer as count FROM news_articles`;

        return {
            articles: articles.map((row: any) => ({
                id: row.id,
                title: row.title,
                summary: row.summary,
                content: row.content,
                source: row.source,
                url: row.url,
                publishedAt: row.published_at?.toISOString() || new Date().toISOString(),
                sentiment: row.sentiment,
                ivImpact: row.iv_impact,
                symbols: row.symbols || [],
                isBreaking: row.is_breaking,
                macroLevel: row.macro_level,
                priceBrainSentiment: row.price_brain_sentiment,
                priceBrainClassification: row.price_brain_classification,
                impliedPoints: row.implied_points,
                instrument: row.instrument,
                authorHandle: row.author_handle,
            })),
            total: countResult?.count || 0,
        };
    } catch (error) {
        console.error('Failed to get news feed:', error);
        return { articles: [], total: 0 };
    }
}

/**
 * Get breaking news for autopilot pause decisions
 */
export async function getBreakingNews(options: {
    symbol?: string;
    minutesBack?: number;
}): Promise<{ hasBreaking: boolean; articles: NewsArticle[]; pauseUntil: string | null }> {
    const { symbol, minutesBack = 10 } = options;
    const cutoff = new Date(Date.now() - minutesBack * 60 * 1000);

    try {
        const articles = await sql`
      SELECT * FROM news_articles
      WHERE is_breaking = true AND published_at > ${cutoff.toISOString()}::timestamptz
      ORDER BY published_at DESC LIMIT 10
    `;

        const hasBreaking = articles.length > 0;
        const pauseUntil = hasBreaking && articles[0]
            ? new Date(new Date(articles[0].published_at).getTime() + 10 * 60 * 1000).toISOString()
            : null;

        return {
            hasBreaking,
            articles: articles.map((row: any) => ({
                id: row.id,
                title: row.title,
                summary: row.summary,
                content: row.content,
                source: row.source,
                url: row.url,
                publishedAt: row.published_at?.toISOString(),
                sentiment: row.sentiment,
                ivImpact: row.iv_impact,
                symbols: row.symbols || [],
                isBreaking: row.is_breaking,
                macroLevel: row.macro_level,
                priceBrainSentiment: row.price_brain_sentiment,
                priceBrainClassification: row.price_brain_classification,
                impliedPoints: row.implied_points,
                instrument: row.instrument,
                authorHandle: row.author_handle,
            })),
            pauseUntil,
        };
    } catch (error) {
        console.error('Failed to get breaking news:', error);
        return { hasBreaking: false, articles: [], pauseUntil: null };
    }
}

export function getNitterHealth() {
    return nitterClient.getHealthStatus();
}
