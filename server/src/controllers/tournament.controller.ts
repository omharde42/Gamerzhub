import { Response } from 'express';
import { AuthRequest } from '../types';
import { tournamentService } from '../services/tournament.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { TournamentStatus } from '@prisma/client';
import prisma from '../config/database';

export class TournamentController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tournament = await tournamentService.create(req.body, req.user!.userId);
    sendSuccess(res, tournament, 'Tournament created successfully', 201);
  });

  updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tournament = await tournamentService.updateStatus(req.params.id, req.body.status, req.user!.userId);
    sendSuccess(res, tournament, 'Tournament status updated');
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tournament = await tournamentService.getById(req.params.id, req.user?.userId);
    sendSuccess(res, tournament);
  });

  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, status, game, search, q } = req.query;
    const result = await tournamentService.list({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status ? (status as TournamentStatus) : undefined,
      game: game as string,
      search: (search || q) as string,
      q: (q || search) as string,
    });
    sendSuccess(res, result.data, undefined, 200, result.meta);
  });

  registerTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { teamId } = req.body;
    const result = await tournamentService.registerTeam(req.params.id, teamId, req.user!.userId);
    sendSuccess(res, result);
  });

  generateBrackets = asyncHandler(async (req: AuthRequest, res: Response) => {
    const matches = await tournamentService.generateBrackets(req.params.id);
    sendSuccess(res, matches);
  });

  submitResult = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.submitResult(req.params.id, req.params.matchId, req.user!.userId, req.body);
    sendSuccess(res, result, 'Match result recorded');
  });

  myTournaments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const tournaments = await prisma.tournament.findMany({
      where: {
        OR: [
          { participants: { some: { userId: req.user!.userId } } },
          { teams: { some: { members: { some: { userId: req.user!.userId } } } } },
        ],
      },
      include: { organizer: { select: { id: true, name: true, avatar: true } }, _count: { select: { teams: true } } },
      orderBy: { startDate: 'desc' },
    });
    sendSuccess(res, tournaments);
  });

  getStandings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const standings = await tournamentService.getStandings(req.params.id);
    sendSuccess(res, standings);
  });

  fileDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dispute = await tournamentService.fileDispute(req.params.id, req.params.matchId, req.user!.userId, req.body);
    sendSuccess(res, dispute, undefined, 201);
  });

  resolveDispute = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dispute = await tournamentService.resolveDispute(req.params.id, req.params.disputeId, req.user!.userId, req.body);
    sendSuccess(res, dispute, 'Dispute resolved');
  });

  getPlayerActionCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await tournamentService.getPlayerActionCenter(req.user!.userId);
    sendSuccess(res, data);
  });

  getOrganizerCommandCenter = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await tournamentService.getOrganizerCommandCenter(req.params.id, req.user!.userId);
    sendSuccess(res, data);
  });

  matchCheckIn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { teamId } = req.body;
    const result = await tournamentService.checkInMatch(req.params.matchId, teamId, req.user!.userId);
    sendSuccess(res, result, 'Check-in successful');
  });

  getActivityFeed = asyncHandler(async (req: AuthRequest, res: Response) => {
    const feed = await tournamentService.getTournamentActivityFeed(req.params.id);
    sendSuccess(res, feed);
  });

  addTicketMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const message = await tournamentService.addTicketMessage(req.params.ticketId, req.user!.userId, req.body);
    sendSuccess(res, message, undefined, 201);
  });

  getTicketMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const messages = await tournamentService.getTicketMessages(req.params.ticketId);
    sendSuccess(res, messages);
  });

  processMapVeto = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { teamId, action, mapName } = req.body;
    const result = await tournamentService.processMapVeto(req.params.matchId, teamId, action, mapName, req.user!.userId);
    sendSuccess(res, result, 'Map veto processed');
  });

  updatePayoutStage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { payoutStage, payoutDetails } = req.body;
    const result = await tournamentService.updatePayoutStage(req.params.id, req.user!.userId, payoutStage, payoutDetails);
    sendSuccess(res, result, 'Payout stage updated');
  });

  forfeitNoShowTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { forfeitTeamId } = req.body;
    const result = await tournamentService.forfeitNoShowTeam(req.params.matchId, forfeitTeamId, req.user!.userId);
    sendSuccess(res, result, 'Team forfeit recorded');
  });

  acceptTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.acceptTeamRegistration(req.params.id, req.params.teamId, req.user!.userId);
    sendSuccess(res, result, 'Team accepted');
  });

  rejectTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.rejectTeamRegistration(req.params.id, req.params.teamId, req.user!.userId, req.body.rejectionReason);
    sendSuccess(res, result, 'Team rejected');
  });

  checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.processCheckIn(req.params.id, req.user!.userId);
    sendSuccess(res, result, 'Checked in successfully');
  });

  setMatchCredentials = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.setMatchCredentials(req.params.id, req.params.matchId, req.user!.userId, req.body);
    sendSuccess(res, result, 'Match room credentials saved');
  });

  createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
    const announcement = await tournamentService.createAnnouncement(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, announcement, 'Announcement published', 201);
  });

  getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
    const announcements = await tournamentService.getAnnouncements(req.params.id);
    sendSuccess(res, announcements);
  });

  rateOrganizer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const rating = await tournamentService.rateOrganizer(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, rating, 'Rating submitted');
  });

  getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = await tournamentService.getAnalytics(req.params.id, req.user!.userId);
    sendSuccess(res, analytics);
  });
}

export const tournamentController = new TournamentController();

