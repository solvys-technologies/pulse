/**
 * RiskFlow Routes
 * News feed endpoints for financial news aggregation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
    getNewsFeed,
    getBreakingNews,
    refreshNewsFeed,
    getNitterHealth,
} from '../services/news-service.js';

const riskflowRoutes = new Hono();

// Query parameter schemas
const feedQuerySchema = z.object({
    symbol: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(15),
    offset: z.coerce.number().min(0).default(0),
});

const breakingQuerySchema = z.object({
    symbol: z.string().optional(),
    minutesBack: z.coerce.number().min(1).max(60).default(10),
});

/**
 * GET /riskflow/feed
 * Get paginated news feed with optional symbol filter
 */
riskflowRoutes.get('/feed', async (c) => {
    try {
        const query = feedQuerySchema.safeParse({
            symbol: c.req.query('symbol'),
            limit: c.req.query('limit'),
            offset: c.req.query('offset'),
        });

        if (!query.success) {
            return c.json({
                error: 'Invalid query parameters',
                details: query.error.flatten(),
            }, 400);
        }

        const { symbol, limit, offset } = query.data;
        const { articles, total } = await getNewsFeed({ symbol, limit, offset });

        return c.json({
            articles: articles.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                source: a.source,
                author: a.author,
                url: a.url,
                publishedAt: a.publishedAt,
                macroLevel: a.macroLevel,
                symbols: a.symbols,
                sentiment: a.sentiment,
                ivImpact: a.ivImpact,
                isBreaking: a.isBreaking,
            })),
            total,
            hasMore: offset + articles.length < total,
        });
    } catch (error) {
        console.error('Failed to get RiskFlow feed:', error);
        return c.json({
            error: 'Failed to get RiskFlow feed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /riskflow - Alias for /riskflow/feed
 */
riskflowRoutes.get('/', async (c) => {
    // Redirect to /feed handler
    const query = feedQuerySchema.safeParse({
        symbol: c.req.query('symbol'),
        limit: c.req.query('limit'),
        offset: c.req.query('offset'),
    });

    if (!query.success) {
        return c.json({
            error: 'Invalid query parameters',
            details: query.error.flatten(),
        }, 400);
    }

    const { symbol, limit, offset } = query.data;
    const { articles, total } = await getNewsFeed({ symbol, limit, offset });

    return c.json({
        items: articles.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            source: a.source,
            author: a.author,
            url: a.url,
            timestamp: a.publishedAt,
            macroLevel: a.macroLevel,
            symbols: a.symbols,
            sentiment: a.sentiment,
        })),
        total,
    });
});

/**
 * GET /riskflow/breaking
 * Get breaking news for autopilot pause decisions
 */
riskflowRoutes.get('/breaking', async (c) => {
    try {
        const query = breakingQuerySchema.safeParse({
            symbol: c.req.query('symbol'),
            minutesBack: c.req.query('minutesBack'),
        });

        if (!query.success) {
            return c.json({
                error: 'Invalid query parameters',
                details: query.error.flatten(),
            }, 400);
        }

        const { symbol, minutesBack } = query.data;
        const { hasBreaking, articles, pauseUntil } = await getBreakingNews({
            symbol,
            minutesBack,
        });

        return c.json({
            hasBreakingRiskFlow: hasBreaking,
            events: articles.map(a => ({
                id: a.id,
                title: a.title,
                macroLevel: a.macroLevel,
                publishedAt: a.publishedAt,
                sentiment: a.sentiment,
            })),
            pauseUntil,
            pauseDurationMs: pauseUntil
                ? Math.max(0, new Date(pauseUntil).getTime() - Date.now())
                : 0,
        });
    } catch (error) {
        console.error('Failed to get breaking RiskFlow:', error);
        return c.json({
            hasBreakingRiskFlow: false,
            events: [],
            pauseUntil: null,
            pauseDurationMs: 0,
        });
    }
});

/**
 * POST /riskflow/refresh
 * Manually refresh news feed from Nitter
 */
riskflowRoutes.post('/refresh', async (c) => {
    try {
        const result = await refreshNewsFeed();
        return c.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error('Failed to refresh RiskFlow:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

/**
 * GET /riskflow/health
 * Get Nitter instance health status
 */
riskflowRoutes.get('/health', async (c) => {
    const instances = getNitterHealth();
    const healthyCount = instances.filter(i => i.healthy).length;

    return c.json({
        status: healthyCount > 0 ? 'operational' : 'degraded',
        instances,
        healthyCount,
        totalCount: instances.length,
    });
});

export { riskflowRoutes };
