import axios from 'axios';
import { config } from '../config';

export interface NormalizedTournament {
  id: string;
  name: string;
  game: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  participants: number | null;
  maxParticipants: number | null;
  organizer: string | null;
  url: string;
  source: 'challonge' | 'gamerhub';
}

interface CacheEntry {
  data: NormalizedTournament[];
  timestamp: number;
}

class ChallongeService {
  private cache: CacheEntry | null = null;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60-second in-memory TTL cache

  async getTournaments(): Promise<NormalizedTournament[]> {
    // Return cached data if fresh
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL_MS) {
      return this.cache.data;
    }

    const apiKey = process.env.CHALLONGE_API_KEY || config.challonge?.apiKey;
    if (!apiKey) {
      console.log('[ChallongeService] CHALLONGE_API_KEY is not set in environment.');
      return this.cache ? this.cache.data : [];
    }

    try {
      const response = await axios.get('https://api.challonge.com/v1/tournaments.json', {
        params: {
          api_key: apiKey,
          state: 'all',
        },
        timeout: 8000,
      });

      if (!Array.isArray(response.data)) {
        return this.cache ? this.cache.data : [];
      }

      const tournaments: NormalizedTournament[] = response.data.map((item: any) => {
        const t = item.tournament || item;
        const fullUrl =
          t.full_challonge_url ||
          (t.url ? `https://challonge.com/${t.url}` : 'https://challonge.com');

        return {
          id: String(t.id),
          name: t.name || 'Untitled Tournament',
          game: t.game_name || t.game || null,
          description: t.description || null,
          startDate: t.start_at || t.started_at || t.created_at || null,
          endDate: t.completed_at || null,
          status: t.state || null,
          participants: typeof t.participants_count === 'number' ? t.participants_count : null,
          maxParticipants: typeof t.signup_cap === 'number' ? t.signup_cap : null,
          organizer: t.subdomain || t.created_by || 'Challonge Organizer',
          url: fullUrl,
          source: 'challonge',
        };
      });

      this.cache = {
        data: tournaments,
        timestamp: Date.now(),
      };

      return tournaments;
    } catch (error: any) {
      // Safe error logging: never expose secret API key or stack trace
      console.error('[ChallongeService] Failed to fetch Challonge tournaments:', error.message || 'Unknown network error');
      return this.cache ? this.cache.data : [];
    }
  }
}

export const challongeService = new ChallongeService();
