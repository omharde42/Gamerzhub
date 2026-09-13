import { Router } from 'express';
import { tournamentController } from '../controllers/tournament.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createTournamentValidation,
  registerTournamentValidation,
  tournamentIdParamValidation,
  submitResultValidation,
  disputeValidation,
  resolveDisputeValidation,
  matchCheckInValidation,
  ticketMessageValidation,
  mapVetoValidation,
  payoutStageValidation,
  teamRegistrationDecisionValidation,
  matchCredentialsValidation,
  announcementValidation,
  organizerRatingValidation,
} from '../validators/tournament';

const router = Router();

// Protected user-specific list
router.get('/my', authenticate, tournamentController.myTournaments.bind(tournamentController));
router.get('/player/actions', authenticate, tournamentController.getPlayerActionCenter.bind(tournamentController));

// Public / optional auth read endpoints
router.get('/', optionalAuth, tournamentController.list.bind(tournamentController));
router.get('/:id', optionalAuth, tournamentIdParamValidation, validate, tournamentController.getById.bind(tournamentController));
router.get('/:id/standings', optionalAuth, tournamentIdParamValidation, validate, tournamentController.getStandings.bind(tournamentController));
router.get('/:id/command-center', authenticate, tournamentIdParamValidation, validate, tournamentController.getOrganizerCommandCenter.bind(tournamentController));
router.get('/:id/activity-feed', optionalAuth, tournamentIdParamValidation, validate, tournamentController.getActivityFeed.bind(tournamentController));

// Protected mutation endpoints
router.post('/', authenticate, createTournamentValidation, validate, tournamentController.create.bind(tournamentController));
router.post('/:id/register', authenticate, registerTournamentValidation, validate, tournamentController.registerTeam.bind(tournamentController));
router.post('/:id/check-in', authenticate, tournamentIdParamValidation, validate, tournamentController.checkIn.bind(tournamentController));
router.post('/:id/brackets', authenticate, tournamentIdParamValidation, validate, tournamentController.generateBrackets.bind(tournamentController));
router.post('/:id/announcements', authenticate, announcementValidation, validate, tournamentController.createAnnouncement.bind(tournamentController));
router.post('/:id/rate-organizer', authenticate, organizerRatingValidation, validate, tournamentController.rateOrganizer.bind(tournamentController));

router.post('/:id/registrations/:teamId/accept', authenticate, teamRegistrationDecisionValidation, validate, tournamentController.acceptTeam.bind(tournamentController));
router.post('/:id/registrations/:teamId/reject', authenticate, teamRegistrationDecisionValidation, validate, tournamentController.rejectTeam.bind(tournamentController));

router.post('/:id/matches/:matchId/credentials', authenticate, matchCredentialsValidation, validate, tournamentController.setMatchCredentials.bind(tournamentController));
router.post('/:id/matches/:matchId/result', authenticate, submitResultValidation, validate, tournamentController.submitResult.bind(tournamentController));
router.post('/matches/:matchId/check-in', authenticate, matchCheckInValidation, validate, tournamentController.matchCheckIn.bind(tournamentController));
router.post('/matches/:matchId/veto', authenticate, mapVetoValidation, validate, tournamentController.processMapVeto.bind(tournamentController));
router.post('/matches/:matchId/forfeit', authenticate, tournamentController.forfeitNoShowTeam.bind(tournamentController));

router.get('/tickets/:ticketId/messages', authenticate, tournamentController.getTicketMessages.bind(tournamentController));
router.post('/tickets/:ticketId/messages', authenticate, ticketMessageValidation, validate, tournamentController.addTicketMessage.bind(tournamentController));

router.post('/:id/matches/:matchId/disputes', authenticate, disputeValidation, validate, tournamentController.fileDispute.bind(tournamentController));
router.patch('/:id/disputes/:disputeId', authenticate, resolveDisputeValidation, validate, tournamentController.resolveDispute.bind(tournamentController));
router.patch('/:id/payouts', authenticate, payoutStageValidation, validate, tournamentController.updatePayoutStage.bind(tournamentController));

export default router;

