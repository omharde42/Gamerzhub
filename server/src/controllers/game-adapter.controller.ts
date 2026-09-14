import { Response } from 'express';
import { AuthRequest } from '../types';
import { gameAdapterService } from '../services/game-adapter.service';
import { CANONICAL_GAMES_REGISTRY } from '../config/gamesRegistry';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export class GameAdapterController {
  getGamesRegistry = asyncHandler(async (req: AuthRequest, res: Response) => {
    sendSuccess(res, Object.values(CANONICAL_GAMES_REGISTRY));
  });

  getGameConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gameId } = req.params;
    const config = gameAdapterService.getGameConfig(gameId);
    sendSuccess(res, config);
  });

  upsertProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const profile = await gameAdapterService.upsertGameProfile(userId, gameId, req.body);
    sendSuccess(res, profile, 'Game profile updated successfully');
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const profile = await gameAdapterService.getGameProfile(userId, gameId);
    sendSuccess(res, profile);
  });

  discoverTeammates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const { rank, playstyle, limit } = req.query;

    const teammates = await gameAdapterService.discoverTeammates(userId, gameId, {
      rank: rank as string,
      playstyle: playstyle as string,
      limit: limit ? parseInt(limit as string) : 20,
    });

    sendSuccess(res, teammates);
  });

  createSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const hostId = req.user!.userId;
    const sessionData = await gameAdapterService.createSession(hostId, req.body);
    sendSuccess(res, sessionData, 'Game session created successfully');
  });

  sendJoinRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const senderId = req.user!.userId;
    const { sessionId } = req.params;
    const { message } = req.body;

    const request = await gameAdapterService.sendJoinRequest(senderId, sessionId, message);
    sendSuccess(res, request, 'Join request sent successfully');
  });

  handleJoinRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const hostId = req.user!.userId;
    const { requestId } = req.params;
    const { action } = req.body; // 'ACCEPT' | 'DECLINE'

    const updated = await gameAdapterService.handleJoinRequest(requestId, hostId, action);
    sendSuccess(res, updated, `Join request ${action.toLowerCase()}ed`);
  });

  rateTeammate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const raterId = req.user!.userId;
    const { sessionId } = req.params;
    const { ratedUserId, rating, feedback } = req.body;

    const result = await gameAdapterService.rateSessionParticipant(
      sessionId,
      raterId,
      ratedUserId,
      parseInt(rating),
      feedback
    );

    sendSuccess(res, result, 'Session rating submitted successfully');
  });
}

export const gameAdapterController = new GameAdapterController();
