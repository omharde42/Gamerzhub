import { Response } from 'express';
import { AuthRequest } from '../types';
import { gameConnectorRegistry } from '../services/game-connectors';
import { gameAdapterService } from '../services/gameAdapter.service';
import { appwriteService } from '../services/appwrite.service';
import { getAllCanonicalGames, getCanonicalGame } from '../config/gamesRegistry';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';
import prisma from '../config/database';

export class GameModularController {
  /**
   * GET /api/game/registry
   */
  getGameRegistry = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const cached = await appwriteService.getGameRegistry();
    if (cached && Object.keys(cached).length > 0) {
      return sendSuccess(res, Object.values(cached), 'Canonical game registry fetched via Appwrite read model');
    }

    const games = getAllCanonicalGames();
    for (const g of games) {
      appwriteService.syncGameRegistry(g.gameId, g).catch(() => {});
    }

    sendSuccess(res, games, 'Canonical game registry fetched');
  });

  /**
   * GET /api/game/:game/config
   */
  getGameConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const config = gameAdapterService.validateGameEnabled(game);
    sendSuccess(res, config, `${config.displayName} capability configuration retrieved`);
  });

  /**
   * GET /api/game/:game/profile
   */
  getGameProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const gameConfig = gameAdapterService.validateGameEnabled(game);
    const userId = (req.query.userId as string) || req.user?.userId;

    if (userId) {
      const cached = await appwriteService.getGameProfile(userId, gameConfig.gameId);
      if (cached) {
        return sendSuccess(res, cached, `${gameConfig.displayName} profile fetched via Appwrite read model`);
      }
    }

    const uid = (req.query.uid as string) || (req.query.playerTag as string) || (req.query.riotId as string) || (req.query.steamId as string);
    const region = req.query.region as string;

    const connector = gameConnectorRegistry.getConnector(gameConfig.gameId);
    const profile = await connector.fetchProfile(uid, region);

    if (userId && profile) {
      appwriteService.syncGameProfile({
        userId,
        game: gameConfig.gameId,
        inGameUid: profile.inGameUid || uid || 'unknown',
        inGameName: profile.inGameName || 'Player',
        region: profile.region || region || null,
        rank: profile.rank || null,
        level: profile.level || null,
        kdRatio: profile.kdRatio || null,
        winRate: profile.winRate || null,
        verified: profile.verified || false,
        syncStatus: profile.syncStatus || 'IDLE',
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    sendSuccess(res, profile, `${gameConfig.displayName} profile fetched successfully`);
  });

  /**
   * GET /api/game/:game/stats
   */
  getGameStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const gameConfig = gameAdapterService.validateGameEnabled(game);
    const uid = (req.query.uid as string) || (req.query.playerTag as string) || (req.query.riotId as string);
    const region = req.query.region as string;

    const connector = gameConnectorRegistry.getConnector(gameConfig.gameId);
    const stats = await connector.fetchStats(uid, region);

    sendSuccess(res, stats, `${gameConfig.displayName} stats fetched successfully`);
  });

  /**
   * POST /api/game/:game/connect
   */
  connectGame = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const userId = req.user!.userId;
    const gameConfig = gameAdapterService.validateGameEnabled(game);

    gameAdapterService.validateGameProfile(gameConfig.gameId, req.body);

    const connector = gameConnectorRegistry.getConnector(gameConfig.gameId);
    const result = await connector.connect(userId, req.body);

    // Write-through sync to Appwrite read model
    if (result) {
      appwriteService.syncGameProfile({
        userId,
        game: gameConfig.gameId,
        inGameUid: result.inGameUid || req.body.uid || req.body.playerTag || req.body.username || 'unknown',
        inGameName: result.inGameName || req.body.username || req.body.inGameName || 'Player',
        region: result.region || req.body.region || null,
        rank: result.rank || null,
        level: result.level || null,
        kdRatio: result.kdRatio || null,
        winRate: result.winRate || null,
        verified: result.verified || false,
        syncStatus: result.syncStatus || 'SYNCED',
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    sendSuccess(res, result, `${gameConfig.displayName} connected successfully!`);
  });

  /**
   * POST /api/game/:game/disconnect
   */
  disconnectGame = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const userId = req.user!.userId;
    const gameConfig = gameAdapterService.validateGameEnabled(game);

    const connector = gameConnectorRegistry.getConnector(gameConfig.gameId);
    await connector.disconnect(userId);

    sendSuccess(res, { success: true }, `${gameConfig.displayName} disconnected successfully!`);
  });

  /**
   * GET /api/game/user-connections
   */
  getUserConnections = asyncHandler(async (req: AuthRequest, res: Response) => {
    const targetUserId = (req.query.userId as string) || req.user?.userId;
    if (!targetUserId) {
      return sendSuccess(res, [], 'No user specified');
    }

    const accounts = await prisma.gameAccount.findMany({
      where: { userId: targetUserId },
      select: {
        id: true,
        userId: true,
        game: true,
        inGameUid: true,
        inGameName: true,
        region: true,
        rank: true,
        level: true,
        kdRatio: true,
        winRate: true,
        verified: true,
        syncStatus: true,
        lastSyncedAt: true,
      },
    });

    sendSuccess(res, accounts, 'User connected games retrieved successfully');
  });

  /**
   * GET /api/game/:game/discover
   */
  discoverTeammates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const gameConfig = gameAdapterService.validateGameEnabled(game);
    const { rank, playstyle, language, availability, limit = '20' } = req.query;

    const parsedLimit = Math.min(parseInt(limit as string) || 20, 50);

    // 1. Appwrite Read Model Attempt
    const cachedCandidates = await appwriteService.getTeammateCandidates(gameConfig.gameId, {
      rank: rank as string,
      playstyle: playstyle as string,
      language: language as string,
      availability: availability as string,
      limit: parsedLimit,
    });

    if (cachedCandidates && cachedCandidates.length > 0) {
      return sendSuccess(res, cachedCandidates, `Teammates discovered for ${gameConfig.displayName} via Appwrite read model`);
    }

    // 2. Primary Source Fallback (Prisma)
    const profiles = await prisma.profile.findMany({
      take: parsedLimit,
      where: req.user?.userId ? { userId: { not: req.user.userId } } : {},
      select: {
        userId: true,
        username: true,
        displayName: true,
        avatar: true,
        rank: true,
        playStyle: true,
        languages: true,
        availability: true,
        gamerScore: true,
        verified: true,
      },
      orderBy: { gamerScore: 'desc' },
    });

    const candidates = profiles.map(p => ({
      id: `${gameConfig.gameId}_${p.userId}`,
      userId: p.userId,
      gameId: gameConfig.gameId,
      rank: p.rank || 'Unranked',
      playstyle: p.playStyle || 'BALANCED',
      language: (p.languages && p.languages[0]) || 'ENGLISH',
      micPreference: true,
      availability: p.availability || 'EVENING',
      reputationScore: 5.0,
      isVerified: p.verified,
      username: p.username,
      displayName: p.displayName || p.username,
      avatar: p.avatar,
      updatedAt: new Date().toISOString(),
    }));

    // Asynchronously populate Appwrite cache
    for (const c of candidates) {
      appwriteService.syncTeammateDiscovery(c).catch(() => {});
    }

    sendSuccess(res, candidates, `Teammates discovered for ${gameConfig.displayName} via PostgreSQL fallback`);
  });

  /**
   * POST /api/game/:game/session
   */
  createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const hostId = req.user!.userId;
    const session = await gameAdapterService.createOrFindSession({
      hostId,
      gameId: game,
      mode: req.body.mode,
      title: req.body.title,
      roomCode: req.body.roomCode,
      roomPassword: req.body.roomPassword,
      partyUrl: req.body.partyUrl,
      maxPlayers: req.body.maxPlayers,
    });
    sendSuccess(res, session, 'Game session created successfully');
  });

  /**
   * GET /api/game/:game/session/:sessionId/instructions
   */
  getJoinInstructions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game } = req.params;
    const sessionData = req.query;
    const instructions = gameAdapterService.produceJoinInstructions(game, sessionData);
    sendSuccess(res, instructions, 'Join instructions produced');
  });

  /**
   * POST /api/game/:game/session/:sessionId/request
   */
  sendJoinRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const senderId = req.user!.userId;
    const result = await gameAdapterService.sendInviteOrJoinRequest({
      sessionId,
      senderId,
      message: req.body.message,
    });
    sendSuccess(res, result, 'Join request sent successfully');
  });

  /**
   * POST /api/game/:game/session/request/:requestId/accept
   */
  acceptJoinRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { game, requestId } = req.params;
    const result = await gameAdapterService.acceptJoin(game, requestId);
    sendSuccess(res, result, 'Join request accepted');
  });

  /**
   * POST /api/game/:game/session/:sessionId/complete
   */
  completeSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const result = await gameAdapterService.completeSession(sessionId);
    sendSuccess(res, result, 'Session completed successfully');
  });

  /**
   * POST /api/game/:game/rating
   */
  rateTeammate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const raterId = req.user!.userId;
    const { ratedUserId, rating, feedback } = req.body;
    const result = await gameAdapterService.createPostSessionRating(raterId, ratedUserId, rating, feedback);
    sendSuccess(res, result, 'Rating submitted successfully');
  });
}

export const gameModularController = new GameModularController();
