import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { uploadMedia } from '../middleware/upload';

const router = Router();

// Public / optional auth read endpoints
router.get('/trending', optionalAuth, postController.getTrending);
router.get('/', optionalAuth, postController.list);
router.get('/:id', optionalAuth, postController.getById);
router.get('/:id/comments', optionalAuth, postController.getComments);

// Protected mutation endpoints
router.post('/', authenticate, postController.create);
router.post('/upload', authenticate, uploadMedia, postController.uploadMedia);
router.post('/poll/vote', authenticate, postController.votePoll);
router.delete('/:id', authenticate, postController.delete);
router.post('/:id/like', authenticate, postController.like);
router.post('/:id/comment', authenticate, postController.comment);

export default router;
