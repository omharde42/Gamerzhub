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

// ─── News & Editorial Management ────────────────────────────────────────────
router.get(
  '/news',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getNews.bind(adminController)
);
router.post(
  '/news',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.createNews.bind(adminController)
);
router.put(
  '/news/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateNews.bind(adminController)
);
router.delete(
  '/news/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteNews.bind(adminController)
);
router.patch(
  '/news/:id/toggle-publish',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.toggleNewsPublish.bind(adminController)
);
router.patch(
  '/news/:id/toggle-feature',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.toggleNewsFeatured.bind(adminController)
);

// ─── Community Feed & Posts Moderation ──────────────────────────────────────
router.get(
  '/feed/posts',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getFeedPosts.bind(adminController)
);
router.delete(
  '/feed/posts/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteFeedPost.bind(adminController)
);
router.patch(
  '/feed/posts/:id/toggle-pin',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.togglePinFeedPost.bind(adminController)
);

// ─── Careers & Esports Jobs ─────────────────────────────────────────────────
router.get(
  '/jobs',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getJobs.bind(adminController)
);
router.post(
  '/jobs',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.createJob.bind(adminController)
);
router.delete(
  '/jobs/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteJob.bind(adminController)
);

// ─── Tournament Creation & Deletion ─────────────────────────────────────────
router.post(
  '/tournaments',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.createTournament.bind(adminController)
);
router.delete(
  '/tournaments/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteTournament.bind(adminController)
);

// ─── Platform Games Catalog CMS ─────────────────────────────────────────────
router.get(
  '/games/catalog',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getGamesCatalog.bind(adminController)
);
router.post(
  '/games',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.createGame.bind(adminController)
);
router.put(
  '/games/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateGame.bind(adminController)
);
router.patch(
  '/games/:id/toggle',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.toggleGameStatus.bind(adminController)
);
router.delete(
  '/games/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.deleteGame.bind(adminController)
);

// ─── User Logins & Live Sessions Tracking ──────────────────────────────────
router.get(
  '/logins/stats',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getLoginStats.bind(adminController)
);
router.get(
  '/logins/history',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getLoginHistory.bind(adminController)
);
router.delete(
  '/logins/sessions/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.revokeSession.bind(adminController)
);

// ─── Platform & Site Configuration ─────────────────────────────────────────
router.get(
  '/settings',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.getSiteSettings.bind(adminController)
);
router.put(
  '/settings',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  adminController.updateSiteSettings.bind(adminController)
);
router.get(
  '/public-settings',
  adminController.getPublicSettings.bind(adminController)
);

export default router;

