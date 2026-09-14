import prisma from '../config/database';
import { io } from '../index';
import { steamService } from './steam.service';
import { appwriteService } from './appwrite.service';
import { AppError } from '../utils/errors';

export interface SyncResult {
  success: boolean;
  platform: string;
  gameAccount: any;
  message?: string;
}

const UNSUPPORTED_MESSAGE =
  'This game does not currently support verified account connection. GamerZ Hub only verifies Clash of Clans, PUBG PC/Console and Steam accounts through their official APIs.';

export class GameSyncService {
  /**
   * Synchronize a Steam account using the official Steam Web API.
   * Only real API data is stored — no fabricated playtime, matches, win rates
   * or achievements. A steamID64 is required (never defaulted).
   */
  async syncSteam(userId: string, steamId: string): Promise<SyncResult> {
    const profile = await steamService.getSteamProfileData(steamId);

    const updated = await prisma.gameAccount.upsert({
      where: { userId_game: { userId, game: 'STEAM' } },
      update: {
        inGameUid: profile.steamId,
        inGameName: profile.username,
        level: profile.level,
        steamLevel: profile.level,
        hoursPlayed: profile.totalPlaytimeHours,
        avatarUrl: profile.avatar || undefined,
        verified: true,
        syncStatus: 'SUCCESS',
        lastSyncedAt: new Date(),
      },
      create: {
        userId,
        game: 'STEAM',
        inGameUid: profile.steamId,
        inGameName: profile.username,
        level: profile.level,
        steamLevel: profile.level,
        hoursPlayed: profile.totalPlaytimeHours,
        avatarUrl: profile.avatar || undefined,
        verified: true,
        syncStatus: 'SUCCESS',
        lastSyncedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        steamId: profile.steamId,
        steamUsername: profile.username,
        steamAvatar: profile.avatar || undefined,
        steamLevel: profile.level,
        steamConnectedAt: new Date(),
      },
    });

    appwriteService.syncGameProfile({
      userId,
      game: 'STEAM',
      inGameUid: profile.steamId,
      inGameName: profile.username,
      level: profile.level,
      verified: true,
      syncStatus: 'SUCCESS',
      updatedAt: new Date().toISOString(),
    }).catch(err => console.warn('[Appwrite] Game profile sync warning on Steam sync:', err?.message));

    this.broadcastUpdate(userId, 'STEAM', updated);
    return { success: true, platform: 'STEAM', gameAccount: updated };
  }

  /**
   * Riot Games (Valorant / League of Legends) have no official player-data
   * integration on this backend. Always refuse — never fabricate ranks.
   */
  async syncRiot(): Promise<SyncResult> {
    throw new AppError(UNSUPPORTED_MESSAGE, 400);
  }

  /** FACEIT has no official integration on this backend. Always refuse. */
  async syncFaceit(): Promise<SyncResult> {
    throw new AppError(UNSUPPORTED_MESSAGE, 400);
  }

  /** Discord identity is not a game-statistics source. Always refuse. */
  async syncDiscord(): Promise<SyncResult> {
    throw new AppError(UNSUPPORTED_MESSAGE, 400);
  }

  /**
   * Supercell games (Clash Royale / Clash of Clans / Brawl Stars) are only
   * verified through the dedicated Clash of Clans connector. This generic
   * path is disabled so it can never create a duplicate/alternate record.
   */
  async syncSupercell(): Promise<SyncResult> {
    throw new AppError(UNSUPPORTED_MESSAGE, 400);
  }

  /**
   * Disconnect Game/Platform Account.
   *
   * Clash of Clans: only the GameAccount row is deleted. The one-time
   * tag-change lock lives on the User row (clashTagChangeCount) and is NOT
   * reset by disconnecting, logging out, or refreshing.
   */
  async disconnectAccount(userId: string, game: string): Promise<boolean> {
    try {
      await prisma.gameAccount.deleteMany({
        where: { userId, game },
      });
      if (game === 'STEAM') {
        await prisma.user.update({
          where: { id: userId },
          data: { steamId: null, steamUsername: null, steamLevel: null, steamConnectedAt: null },
        });
      }
      if (game === 'DISCORD') {
        await prisma.user.update({
          where: { id: userId },
          data: { discordId: null, discordUsername: null, discordConnectedAt: null },
        });
      }
      this.broadcastUpdate(userId, game, null);
      return true;
    } catch (err) {
      console.error('Disconnect error:', err);
      return false;
    }
  }

  /**
   * Broadcast real-time Socket.io update to online users
   */
  private broadcastUpdate(userId: string, platform: string, data: any) {
    try {
      if (io) {
        io.emit('game-stats:updated', { userId, platform, data });
      }
    } catch (err) {
      console.warn('Socket broadcast warning:', err);
    }
  }
}

export const gameSyncService = new GameSyncService();
