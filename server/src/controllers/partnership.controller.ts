import { Response } from 'express';
import { AuthRequest } from '../types';
import { partnershipService } from '../services/partnership.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class PartnershipController {
  /** Public program overview — no private data, safe to serve unauthenticated. */
  getProgramInfo = asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, {
      program: {
        partnership: {
          title: 'GamerZ Hub Partnership Program',
          description:
            'Partner with GamerZ Hub to reach a passionate gaming community. Brands, organizations, tournaments and content creators can apply for verified partnership.',
          benefits: [
            'Verified partner badge on profiles and pages',
            'Priority placement in tournaments and community events',
            'Co-marketing opportunities with GamerZ Hub',
            'Early access to new community features',
          ],
        },
        sponsorship: {
          title: 'Sponsorship Opportunities',
          description:
            'Sponsor GamerZ Hub tournaments, teams and community challenges. Sponsorship applications are reviewed by our team on a rolling basis.',
          benefits: [
            'Brand visibility across tournaments and challenges',
            'Sponsor spotlight in event pages and live lobbies',
            'Direct engagement with competitive gamers',
            'Flexible packages from single events to season-long',
          ],
        },
      },
    });
  });

  apply = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, organizationName, contactName, contactEmail, website, description, audience } = req.body || {};
    if (!type) throw new ValidationError({ type: ['Type is required'] });
    const application = await partnershipService.apply(req.user!.userId, {
      type,
      organizationName,
      contactName,
      contactEmail,
      website,
      description,
      audience,
    });
    sendSuccess(res, application, 'Application submitted for review');
  });

  getMyApplications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const applications = await partnershipService.getMyApplications(req.user!.userId);
    sendSuccess(res, applications);
  });

  getApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await partnershipService.getApplication(req.user!.userId, req.params.id, false);
    sendSuccess(res, application);
  });

  // ── Admin (routes guarded with authorize) ──────────────────────────
  getApplicationsForAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
    const applications = await partnershipService.getApplicationsForAdmin({ status: req.query.status as string });
    sendSuccess(res, applications);
  });

  reviewApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { decision, adminNote } = req.body || {};
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      throw new ValidationError({ decision: ['Decision must be APPROVED or REJECTED'] });
    }
    const application = await partnershipService.review(req.user!.userId, req.params.id, decision, adminNote);
    try {
      const { logAdminAction } = await import('./admin.controller');
      await logAdminAction(req.user!.userId, 'PARTNERSHIP_REVIEWED', 'PartnershipApplication', req.params.id, { decision, adminNote, organizationName: (application as any)?.organizationName }, req.ip, req.headers['user-agent']);
    } catch {}
    sendSuccess(res, application, `Application ${decision.toLowerCase()}`);
  });
}

export const partnershipController = new PartnershipController();
