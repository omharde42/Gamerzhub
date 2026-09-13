import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../config/database';
import { getAllCanonicalGames } from '../config/gamesRegistry';
import { appwriteService } from '../services/appwrite.service';

export class AppController {
  getVersion = asyncHandler(async (req: Request, res: Response) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;

    sendSuccess(res, {
      latestVersion: '1.2.1',
      minSupportedVersion: '1.0.0',
      apkUrl: `${baseUrl}/downloads/GamerHub-latest.apk`,
      isForceUpdate: false,
      releaseNotes: [
        '🎉 New GamerzHub launcher icon — fresh branding!',
        '🖼️ Fixed profile picture and post image uploads',
        '📊 Added interactive Poll creation and voting in feed',
        '🔒 Fixed authentication session persistence across app restarts',
        '⚡ Enhanced mobile APK stability and overall performance',
        '🐛 Fixed image display after posting'
      ]
    });
  });

  downloadApk = asyncHandler(async (req: Request, res: Response) => {
    const apkPath = path.join(__dirname, '../../public/downloads/GamerHub-latest.apk');
    if (!fs.existsSync(apkPath)) {
      return sendError(res, 404, 'APK not yet available. Please check back soon or visit GitHub Releases for the latest build.');
    }
    res.download(apkPath, 'GamerHub-latest.apk');
  });

  getPublicStats = asyncHandler(async (req: Request, res: Response) => {
    const [usersCount, teamsCount, tournamentsCount, gamesCount] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.tournament.count(),
      prisma.connectedGame.count(),
    ]);

    sendSuccess(res, {
      activePlayers: usersCount > 0 ? `${usersCount}` : '1',
      teams: teamsCount > 0 ? `${teamsCount}` : '0',
      tournaments: tournamentsCount > 0 ? `${tournamentsCount}` : '0',
      gamesSupported: gamesCount > 0 ? `${gamesCount}` : '15',
    });
  });

  getGameRegistry = asyncHandler(async (req: Request, res: Response) => {
    // 1. Appwrite Read Model Attempt
    const cachedRegistry = await appwriteService.getGameRegistry();
    if (cachedRegistry && Object.keys(cachedRegistry).length > 0) {
      return sendSuccess(res, Object.values(cachedRegistry), 'Canonical game registry fetched via Appwrite read model');
    }

    // 2. Primary Source Fallback (Canonical Games Registry)
    const games = getAllCanonicalGames();

    // Asynchronously populate Appwrite cache
    for (const game of games) {
      appwriteService.syncGameRegistry(game.gameId, game).catch(err =>
        console.warn(`[Appwrite] Sync warning for ${game.gameId}:`, err?.message)
      );
    }

    sendSuccess(res, games, 'Canonical game registry fetched via local fallback');
  });
}

export const appController = new AppController();
