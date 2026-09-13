import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { uploadAvatar, uploadBanner } from '../middleware/upload';

const router = Router();

router.get('/search', authenticate, profileController.searchProfiles);
router.get('/public/:userId', optionalAuth, profileController.getPublicProfileById);
router.get('/:username', optionalAuth, profileController.getProfile);
router.put('/', authenticate, profileController.updateProfile);
router.post('/avatar', authenticate, uploadAvatar, profileController.uploadAvatar);
router.post('/banner', authenticate, uploadBanner, profileController.uploadBanner);
router.get('/analytics/optimize', authenticate, profileController.getProfileAnalytics);

export default router;
