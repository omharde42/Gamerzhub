import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import axios from 'axios';
import prisma from '../config/database';

// NOTE: We prioritize real database-stored platform news created via Admin Panel,
// complemented by real external headlines.

/** Strip tracking params so the same article URL always dedupes consistently. */
function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return raw || '';
  }
}

interface NewsItem {
  id?: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  image: string;
  publishedAt?: string;
  source: string;
  category?: string;
  isFeatured?: boolean;
  isOfficial?: boolean;
}

/** Keep only real, de-duplicated articles (must have a title + reachable URL). */
function sanitizeArticles(articles: any[]): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  for (const art of articles || []) {
    const title = (art.title || '').trim();
    const url = normalizeUrl(art.url || '');
    if (!title || !url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: art.id,
      title,
      description: (art.description || '').slice(0, 500),
      content: art.content,
      url,
      image: art.image || art.urlToImage || (art.enclosure?.link) || '',
      publishedAt: art.publishedAt || undefined,
      source: art.source?.name || art.source || 'Gaming News',
      category: art.category,
      isFeatured: art.isFeatured,
      isOfficial: art.isOfficial,
    });
  }
  return result;
}

interface NewsCache {
  data: NewsItem[];
  timestamp: number;
}
const newsCacheByRegion = new Map<string, NewsCache>();
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class NewsController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const region = (req.query.region as string) || 'global';

    // 1. Fetch official platform news from database
    let dbArticles: any[] = [];
    try {
      dbArticles = await (prisma as any).newsArticle.findMany({
        where: { isPublished: true },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: 30,
      });
    } catch {
      // safe fallback if database table not yet synchronized
    }

    const officialItems: NewsItem[] = dbArticles.map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.summary || (a.content ? a.content.slice(0, 300) : ''),
      content: a.content || undefined,
      url: a.sourceUrl || `/news#${a.id}`,
      image: a.imageUrl || '',
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
      source: a.source || 'GamerZ Hub Official',
      category: a.category || 'Esports',
      isFeatured: a.isFeatured,
      isOfficial: true,
    }));

    const cached = newsCacheByRegion.get(region);

    if (cached && (Date.now() - cached.timestamp < NEWS_CACHE_TTL_MS)) {
      sendSuccess(res, [...officialItems, ...cached.data]);
      return;
    }

    const apiKey = process.env.GNEWS_API_KEY || process.env.GNEWS_KEY;
    let externalArticles: NewsItem[] = [];

    // 1. Primary source: GNews API (real headlines only).
    if (apiKey) {
      try {
        const response = await axios.get('https://gnews.io/api/v4/search', {
          params: {
            q: 'gaming OR esports OR videogames',
            lang: 'en',
            max: 10,
            country: region === 'india' ? 'in' : undefined,
            apikey: apiKey,
          },
          timeout: 10000,
        });

        const articles = sanitizeArticles(response.data?.articles);
        if (articles.length > 0) {
          newsCacheByRegion.set(region, { data: articles, timestamp: Date.now() });
          sendSuccess(res, [...officialItems, ...articles]);
          return;
        }
      } catch (err: any) {
        console.error('[GNews API Error]:', err.response?.data || err.message);
      }
    }

    // 2. Fallback source: Google News RSS (real, aggregated headlines).
    try {
      const response = await fetch(
        'https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss/search?q=gaming+esports&hl=en-US&gl=US',
        { signal: AbortSignal.timeout(10000) },
      );
      if (response.ok) {
        const data = await response.json();
        const items = sanitizeArticles((data.items || []).map((item: any) => ({
          title: item.title,
          description: item.description || '',
          source: (() => {
            try { return new URL(item.link).hostname.replace('www.', ''); } catch { return 'Google News'; }
          })(),
          url: item.link,
          image: item.enclosure?.link || '',
          publishedAt: item.pubDate || undefined,
        })));
        if (items.length > 0) {
          newsCacheByRegion.set(region, { data: items, timestamp: Date.now() });
          sendSuccess(res, [...officialItems, ...items]);
          return;
        }
      }
    } catch {
      // ignore — fallback to DB items or cached below
    }

    // Return cached stale data + official items if available
    if (cached?.data?.length) {
      sendSuccess(res, [...officialItems, ...cached.data]);
      return;
    }

    // 3. Return database official news if available even if external feeds fail
    if (officialItems.length > 0) {
      sendSuccess(res, officialItems);
      return;
    }

    sendSuccess(res, [], 'Gaming news is temporarily unavailable. Please try again later.');
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const article = await (prisma as any).newsArticle.findUnique({
        where: { id },
      });
      if (!article) {
        sendError(res, 404, 'News article not found');
        return;
      }
      sendSuccess(res, article);
    } catch {
      sendError(res, 500, 'Failed to fetch article');
    }
  });
}

export const newsController = new NewsController();

