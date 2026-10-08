import { Router } from 'express';
import { friendController } from '../controllers/friend.controller';
import { authenticate } from '../middleware/auth';
import {
  sendFriendRequestValidation,
  friendIdParamValidation,
  removeFriendValidation,
} from '../validators/friend';
import { validate } from '../middleware/validate';
const router = Router();

router.post('/request', authenticate, sendFriendRequestValidation, validate, friendController.sendRequest);
router.post('/accept/:id', authenticate, friendIdParamValidation, validate, friendController.acceptRequest);
router.post('/reject/:id', authenticate, friendIdParamValidation, validate, friendController.rejectRequest);
router.post('/remove', authenticate, removeFriendValidation, validate, friendController.removeFriend);
router.get('/', authenticate, friendController.listFriends);
router.get('/requests', authenticate, friendController.listRequests);
router.get('/suggestions', authenticate, friendController.getSuggestions);

export default router;
