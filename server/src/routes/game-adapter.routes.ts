import { Router } from 'express';
import { gameAdapterController } from '../controllers/game-adapter.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/registry', authenticate, gameAdapterController.getGamesRegistry.bind(gameAdapterController));
router.get('/:gameId/config', authenticate, gameAdapterController.getGameConfig.bind(gameAdapterController));

router.get('/:gameId/profile', authenticate, gameAdapterController.getProfile.bind(gameAdapterController));
router.post('/:gameId/profile', authenticate, gameAdapterController.upsertProfile.bind(gameAdapterController));

router.get('/:gameId/teammates', authenticate, gameAdapterController.discoverTeammates.bind(gameAdapterController));

router.post('/sessions', authenticate, gameAdapterController.createSession.bind(gameAdapterController));
router.post('/sessions/:sessionId/join', authenticate, gameAdapterController.sendJoinRequest.bind(gameAdapterController));
router.patch('/requests/:requestId', authenticate, gameAdapterController.handleJoinRequest.bind(gameAdapterController));
router.post('/sessions/:sessionId/rate', authenticate, gameAdapterController.rateTeammate.bind(gameAdapterController));

export default router;
