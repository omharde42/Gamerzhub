import { Router } from 'express';
import { freeFireController } from '../controllers/freefire.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, freeFireController.getProfile.bind(freeFireController));
router.post('/profile', authenticate, freeFireController.updateProfile.bind(freeFireController));
router.get('/teammates', authenticate, freeFireController.discoverTeammates.bind(freeFireController));
router.post('/request', authenticate, freeFireController.sendRequest.bind(freeFireController));
router.patch('/request/:id', authenticate, freeFireController.updateRequestStatus.bind(freeFireController));
router.post('/rate', authenticate, freeFireController.rateTeammate.bind(freeFireController));

export default router;
