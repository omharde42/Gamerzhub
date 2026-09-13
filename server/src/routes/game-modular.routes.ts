import { Router } from 'express';
import { gameModularController } from '../controllers/game-modular.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Registry & user connections
router.get('/registry', gameModularController.getGameRegistry);
router.get('/user-connections', optionalAuth, gameModularController.getUserConnections);

// Dynamic game routes
router.get('/:game/config', gameModularController.getGameConfig);
router.get('/:game/profile', optionalAuth, gameModularController.getGameProfile);
router.get('/:game/stats', optionalAuth, gameModularController.getGameStats);
router.get('/:game/discover', optionalAuth, gameModularController.discoverTeammates);

router.post('/:game/connect', authenticate, gameModularController.connectGame);
router.post('/:game/disconnect', authenticate, gameModularController.disconnectGame);

// Session & Join flows
router.post('/:game/session', authenticate, gameModularController.createSession);
router.get('/:game/session/:sessionId/instructions', optionalAuth, gameModularController.getJoinInstructions);
router.post('/:game/session/:sessionId/request', authenticate, gameModularController.sendJoinRequest);
router.post('/:game/session/request/:requestId/accept', authenticate, gameModularController.acceptJoinRequest);
router.post('/:game/session/:sessionId/complete', authenticate, gameModularController.completeSession);
router.post('/:game/rating', authenticate, gameModularController.rateTeammate);

export default router;
