import { Response } from 'express';
import { AuthRequest } from '../types';
import { freeFireService } from '../services/freefire.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export class FreeFireController {
  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await freeFireService.getProfile(userId);
    sendSuccess(res, profile);
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await freeFireService.updateProfile(userId, req.body);
    sendSuccess(res, profile);
  });

  discoverTeammates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { rank, playstyle, language, availability, limit } = req.query;

    const candidates = await freeFireService.discoverTeammates(userId, {
      rank: rank as string,
      playstyle: playstyle as string,
      language: language as string,
      availability: availability as string,
      limit: limit ? parseInt(limit as string) : 20,
    });

    sendSuccess(res, candidates);
  });

  sendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const senderId = req.user!.userId;
    const { receiverId, message } = req.body;

    const request = await freeFireService.sendTeammateRequest(senderId, receiverId, message);
    sendSuccess(res, request, 'Teammate request sent successfully');
  });

  updateRequestStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { status } = req.body;

    const updated = await freeFireService.updateTeammateRequestStatus(id, userId, status);
    sendSuccess(res, updated, `Request status updated to ${status}`);
  });

  rateTeammate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const raterId = req.user!.userId;
    const { ratedUserId, rating, feedback, communicationRating, reliabilityRating } = req.body;

    const result = await freeFireService.rateTeammate(
      raterId,
      ratedUserId,
      parseInt(rating),
      feedback,
      communicationRating ? parseInt(communicationRating) : undefined,
      reliabilityRating ? parseInt(reliabilityRating) : undefined
    );

    sendSuccess(res, result, 'Teammate rating submitted successfully');
  });
}

export const freeFireController = new FreeFireController();
