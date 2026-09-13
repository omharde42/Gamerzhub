import { Router } from 'express';
import { appController } from '../controllers/app.controller';

const router = Router();

router.get('/version', appController.getVersion);
router.get('/download', appController.downloadApk);
router.get('/stats', appController.getPublicStats);
router.get('/games', appController.getGameRegistry);

export default router;
