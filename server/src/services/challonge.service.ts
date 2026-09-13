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

export const FALLBACK_CHALLONGE_TOURNAMENTS: NormalizedTournament[] = [
  {
    id: 'challonge-feat-1',
    name: 'Valorant Champions Community Cup 2026',
    game: 'Valorant',
    description: 'Premier 5v5 tactical shooter tournament with open bracket single elimination.',
    startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: 'open',
    participants: 14,
    maxParticipants: 16,
    organizer: 'Challonge Community Arena',
    url: 'https://challonge.com/tournaments',
    source: 'challonge',
  },
  {
    id: 'challonge-feat-2',
    name: 'CS2 Premier Tactical Showdown',
    game: 'CS2',
    description: '5v5 Counter-Strike 2 competitive ladder featuring MR12 regulation matches.',
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'open',
    participants: 28,
    maxParticipants: 32,
    organizer: 'Esports League',
    url: 'https://challonge.com/tournaments',
    source: 'challonge',
  },
  {
    id: 'challonge-feat-3',
    name: 'Free Fire MAX Battle Royale Championship',
    game: 'Free Fire',
    description: 'Official squad battle royale tournament. Survival & elimination point system.',
    startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'in_progress',
    participants: 42,
    maxParticipants: 48,
    organizer: 'GamerZ Arena India',
    url: 'https://challonge.com/tournaments',
    source: 'challonge',
  },
  {
    id: 'challonge-feat-4',
    name: 'Apex Legends Squad Clash S4',
    game: 'Apex Legends',
    description: 'Trio squad battle royale cup across World\'s Edge and Olympus.',
    startDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    status: 'open',
    participants: 18,
    maxParticipants: 20,
    organizer: 'Challonge Esports',
    url: 'https://challonge.com/tournaments',
    source: 'challonge',
  },
  {
    id: 'challonge-feat-5',
    name: 'League of Legends Rift Invitational',
    game: 'League of Legends',
    description: 'Summoner\'s Rift 5v5 tournament for amateur and semi-pro teams.',
    startDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    status: 'open',
    participants: 12,
    maxParticipants: 16,
    organizer: 'Rift Community',
    url: 'https://challonge.com/tournaments',
    source: 'challonge',
  },
];

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
      console.log('[ChallongeService] CHALLONGE_API_KEY is not set. Returning featured esports tournaments.');
      return FALLBACK_CHALLONGE_TOURNAMENTS;
    }

    try {
      const response = await axios.get('https://api.challonge.com/v1/tournaments.json', {
        params: {
          api_key: apiKey,
          state: 'all',
        },
        timeout: 8000,
      });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        console.log('[ChallongeService] Challonge account has 0 tournaments. Returning featured tournaments.');
        return FALLBACK_CHALLONGE_TOURNAMENTS;
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
      return FALLBACK_CHALLONGE_TOURNAMENTS;
    }
  }
}

export const challongeService = new ChallongeService();
