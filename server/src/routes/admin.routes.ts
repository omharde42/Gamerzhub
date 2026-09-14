import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateReportStatusValidation, resolveReportValidation } from '../validators/tournament';

const router = Router();
router.get('/dashboard', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.getDashboardStats.bind(adminController));
router.get('/users', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.getUsers.bind(adminController));
router.post('/users/:id/ban', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.banUser.bind(adminController));
router.post('/users/:id/unban', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.unbanUser.bind(adminController));
router.get('/reports', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.getReports.bind(adminController));
router.post('/reports/:id/resolve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.resolveReport.bind(adminController));
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN'), adminController.getAuditLogs.bind(adminController));

// Phase 6 Tournament Moderation Routes
router.get('/tournament-reports', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.getTournamentReports.bind(adminController));
router.get('/tournament-reports/:reportId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.getTournamentReportDetail.bind(adminController));
router.patch('/tournament-reports/:reportId/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateReportStatusValidation, validate, adminController.updateReportStatus.bind(adminController));
router.post('/tournament-reports/:reportId/resolve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), resolveReportValidation, validate, adminController.resolveTournamentReport.bind(adminController));
router.post('/tournaments/:id/suspend', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), adminController.suspendTournament.bind(adminController));

export default router;
