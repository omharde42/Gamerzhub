import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateReportStatusValidation, resolveReportValidation } from '../validators/tournament';
import { uploadProductImage } from '../middleware/upload';

const router = Router();

// ─── Dashboard Stats & KPIs ─────────────────────────────────────────────────
router.get(
  '/dashboard',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getDashboardStats.bind(adminController)
);

// ─── User / Gamer Management ────────────────────────────────────────────────
router.get(
  '/users',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getUsers.bind(adminController)
);
router.get(
  '/users/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getUserDetail.bind(adminController)
);
router.patch(
  '/users/:id/role',
  authenticate,
  authorize('SUPER_ADMIN'),
  adminController.updateUserRole.bind(adminController)
);
router.post(
  '/users/:id/ban',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.banUser.bind(adminController)
);
router.post(
  '/users/:id/unban',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.unbanUser.bind(adminController)
);
router.patch(
  '/users/:id/verify-profile',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.toggleProfileVerification.bind(adminController)
);

// ─── Game & Gamer Identity Management ───────────────────────────────────────
router.get(
  '/games',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getGames.bind(adminController)
);
router.get(
  '/gamer-identities',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getGamerIdentities.bind(adminController)
);
router.patch(
  '/gamer-identities/:id/verify',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.verifyGamerIdentity.bind(adminController)
);

// ─── Squads & Squad Continuity ──────────────────────────────────────────────
router.get(
  '/squads',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getSquads.bind(adminController)
);
router.get(
  '/squads/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getSquadDetail.bind(adminController)
);
router.patch(
  '/squads/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateSquadStatus.bind(adminController)
);
router.get(
  '/squad-invitations',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getSquadInvitations.bind(adminController)
);

// ─── Gaming Sessions & Community Activity ───────────────────────────────────
router.get(
  '/gaming-sessions',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getGamingSessions.bind(adminController)
);
router.get(
  '/session-ratings',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getSessionRatings.bind(adminController)
);

// ─── Tournament Management ──────────────────────────────────────────────────
router.get(
  '/tournaments',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getTournaments.bind(adminController)
);
router.get(
  '/tournaments/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getTournamentDetail.bind(adminController)
);
router.patch(
  '/tournaments/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateTournamentStatus.bind(adminController)
);
router.post(
  '/tournaments/:id/suspend',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.suspendTournament.bind(adminController)
);

// ─── Tournament Support Tickets & Disputes (Phase 6 preservation) ───────────
router.get(
  '/tournament-reports',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getTournamentReports.bind(adminController)
);
router.get(
  '/tournament-reports/:reportId',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getTournamentReportDetail.bind(adminController)
);
router.patch(
  '/tournament-reports/:reportId/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  updateReportStatusValidation,
  validate,
  adminController.updateReportStatus.bind(adminController)
);
router.post(
  '/tournament-reports/:reportId/resolve',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  resolveReportValidation,
  validate,
  adminController.resolveTournamentReport.bind(adminController)
);

// ─── Reports & Moderation ───────────────────────────────────────────────────
router.get(
  '/reports',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getReports.bind(adminController)
);
router.post(
  '/reports/:id/resolve',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.resolveReport.bind(adminController)
);

// ─── Admin Audit Logs ───────────────────────────────────────────────────────
router.get(
  '/audit-logs',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getAuditLogs.bind(adminController)
);

// ─── Product / Merchandise / Digital Items Management (Preserved) ───────────
router.get(
  '/products',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getProducts.bind(adminController)
);
router.get(
  '/products/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getProductDetail.bind(adminController)
);
router.post(
  '/products',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.createProduct.bind(adminController)
);
router.put(
  '/products/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateProduct.bind(adminController)
);
router.delete(
  '/products/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteProduct.bind(adminController)
);
router.post(
  '/upload',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  uploadProductImage,
  adminController.uploadMedia.bind(adminController)
);

// ─── Order & Transaction Management (Preserved) ─────────────────────────────
router.get(
  '/orders',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getOrders.bind(adminController)
);
router.get(
  '/orders/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getOrderDetail.bind(adminController)
);
router.patch(
  '/orders/:id/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateOrderStatus.bind(adminController)
);

export default router;
