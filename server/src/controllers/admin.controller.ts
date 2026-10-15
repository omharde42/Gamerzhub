import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { tournamentService } from '../services/tournament.service';
import { mediaStorageService } from '../utils/storage';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { UserRole, ProductStatus, OrderStatus, PaymentStatus, TeamStatus, TournamentStatus } from '@prisma/client';
import { getAllCanonicalGames } from '../config/gamesRegistry';

/**
 * Audit log helper to record administrative actions.
 */
export async function logAdminAction(
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: any,
  ip?: string,
  userAgent?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        metadata: metadata ? (typeof metadata === 'object' ? metadata : { info: metadata }) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (err: any) {
    console.warn('[AuditLog Warn] Failed to record admin audit log:', err?.message || err);
  }
}

export class AdminController {
  // ─── Dashboard Stats & KPIs ───────────────────────────────────────────────
  getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const [
      totalUsers,
      bannedUsers,
      usersByRole,
      totalGamerProfiles,
      totalGameAccounts,
      totalConnectedGames,
      verifiedProfilesCount,
      verifiedGamerProfilesCount,
      totalSquads,
      squadsByStatus,
      totalSquadMembers,
      pendingSquadInvites,
      acceptedSquadInvites,
      pendingSquadApplications,
      totalScrims,
      totalChallenges,
      totalTeammateRequests,
      totalSessionRatings,
      totalTournaments,
      tournamentsByStatus,
      totalTournamentParticipants,
      totalTournamentTeams,
      pendingUserReports,
      totalUserReports,
      pendingTournamentReports,
      totalTournamentReports,
      gameRequestsPending,
      partnershipsPending,
      totalProducts,
      productsByStatus,
      productsLowStock,
      totalOrders,
      ordersByStatus,
      ordersByPayment,
      paidOrdersRevenue,
      subscriptionsByTier,
      activeSubscriptionsCount,
      recentAuditLogs,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),

      // Gamer identities
      prisma.gameProfile.count(),
      prisma.gameAccount.count(),
      prisma.connectedGame.count(),
      prisma.profile.count({ where: { verified: true } }),
      prisma.gameProfile.count({ where: { verified: true } }),

      // Squads & Continuity
      prisma.team.count(),
      prisma.team.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.teamMember.count(),
      prisma.teamInvite.count({ where: { status: 'PENDING' } }),
      prisma.teamInvite.count({ where: { status: 'ACCEPTED' } }),
      prisma.teamApplication.count({ where: { status: 'PENDING' } }),

      // Gaming sessions & community activity
      prisma.scrim.count(),
      prisma.challenge.count(),
      prisma.freeFireTeammateRequest.count(),
      prisma.freeFireSessionRating.count(),

      // Tournaments & participants
      prisma.tournament.count(),
      prisma.tournament.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.tournamentParticipant.count(),
      prisma.tournamentTeam.count(),

      // Reports & Moderation
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count(),
      prisma.tournamentSupportTicket.count({ where: { status: 'OPEN' } }),
      prisma.tournamentSupportTicket.count(),
      prisma.gameRequest.count({ where: { status: 'PENDING' } }),
      prisma.partnershipApplication.count({ where: { status: 'PENDING' } }),

      // Products & Stock
      prisma.product.count(),
      prisma.product.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.product.count({ where: { stock: { lte: 5, gt: 0 } } }),

      // Orders & Revenue
      prisma.order.count(),
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.order.groupBy({ by: ['paymentStatus'], _count: { id: true } }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),

      // Subscriptions
      prisma.subscription.groupBy({ by: ['tier'], _count: { id: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),

      // Recent Activity
      prisma.auditLog.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, profile: { select: { username: true } } } } },
      }),
    ]);

    // Calculate aggregated revenue (from paid orders)
    const totalOrderRevenue = paidOrdersRevenue._sum.totalAmount || 0;

    // Estimate subscription revenue
    const subscriptionTierRates: Record<string, number> = {
      FREE: 0,
      PREMIUM: 9.99,
      PRO: 19.99,
      ENTERPRISE: 49.99,
      ELITE: 29.99,
      TEAM_PRO: 39.99,
    };
    let estimatedMonthlySubscriptionRevenue = 0;
    for (const sub of subscriptionsByTier) {
      const rate = subscriptionTierRates[sub.tier] || 0;
      estimatedMonthlySubscriptionRevenue += rate * sub._count.id;
    }

    sendSuccess(res, {
      users: {
        total: totalUsers,
        active: totalUsers - bannedUsers,
        banned: bannedUsers,
        byRole: usersByRole.reduce((acc, curr) => ({ ...acc, [curr.role]: curr._count.id }), {}),
      },
      gaming: {
        totalGamerProfiles,
        totalGameAccounts,
        totalConnectedGames,
        supportedGames: getAllCanonicalGames().length,
        verifiedProfiles: verifiedProfilesCount,
        verifiedGamerProfiles: verifiedGamerProfilesCount,
      },
      squads: {
        total: totalSquads,
        byStatus: squadsByStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
        totalMembers: totalSquadMembers,
        invitesPending: pendingSquadInvites,
        invitesAccepted: acceptedSquadInvites,
        applicationsPending: pendingSquadApplications,
      },
      sessions: {
        totalScrims,
        totalChallenges,
        totalTeammateRequests,
        totalSessionRatings,
      },
      tournaments: {
        total: totalTournaments,
        byStatus: tournamentsByStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
        totalParticipants: totalTournamentParticipants,
        totalTeams: totalTournamentTeams,
      },
      moderation: {
        pendingUserReports,
        totalUserReports,
        pendingTournamentReports,
        totalTournamentReports,
        pendingGameRequests: gameRequestsPending,
        pendingPartnerships: partnershipsPending,
      },
      products: {
        total: totalProducts,
        byStatus: productsByStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
        lowStock: productsLowStock,
      },
      orders: {
        total: totalOrders,
        revenue: totalOrderRevenue,
        byStatus: ordersByStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
        byPayment: ordersByPayment.reduce((acc, curr) => ({ ...acc, [curr.paymentStatus]: curr._count.id }), {}),
      },
      subscriptions: {
        activeTotal: activeSubscriptionsCount,
        estimatedMonthlyRevenue: Math.round(estimatedMonthlySubscriptionRevenue * 100) / 100,
        byTier: subscriptionsByTier.reduce((acc, curr) => ({ ...acc, [curr.tier]: curr._count.id }), {}),
      },
      recentActivity: recentAuditLogs,
    });
  });

  // ─── User / Customer Management ───────────────────────────────────────────
  getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      page = '1',
      limit = '20',
      search = '',
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { gamerzId: { contains: q, mode: 'insensitive' } },
        { profile: { username: { contains: q, mode: 'insensitive' } } },
        { profile: { displayName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (role && typeof role === 'string' && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole;
    }

    if (status === 'banned') {
      where.banned = true;
    } else if (status === 'active') {
      where.banned = false;
    }

    const orderBy: any = {};
    if (sortBy === 'createdAt' || sortBy === 'email') {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          gamerzId: true,
          role: true,
          banned: true,
          banReason: true,
          createdAt: true,
          updatedAt: true,
          emailVerified: true,
          presence: true,
          profile: {
            select: {
              username: true,
              displayName: true,
              avatar: true,
              country: true,
              verified: true,
              gamerScore: true,
            },
          },
          gameProfiles: {
            take: 3,
            select: {
              id: true,
              game: true,
              inGameName: true,
              rank: true,
              verified: true,
            },
          },
          subscription: {
            select: {
              tier: true,
              status: true,
            },
          },
          _count: {
            select: {
              orders: true,
              posts: true,
              tournamentParticipants: true,
              teamMembers: true,
              reports: true,
            },
          },
        },
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getUserDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        gamerzId: true,
        role: true,
        banned: true,
        banReason: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        presence: true,
        profile: true,
        gameProfiles: true,
        gameAccounts: true,
        subscription: true,
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                status: true,
                rank: true,
                region: true,
              },
            },
          },
        },
        tournamentParticipants: {
          include: {
            tournament: {
              select: {
                id: true,
                title: true,
                game: true,
                status: true,
                startDate: true,
              },
            },
          },
        },
        freeFireProfile: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: { select: { id: true, name: true } } } } },
        },
        accounts: {
          select: { provider: true, providerUsername: true },
        },
        reports: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: {
              select: {
                id: true,
                email: true,
                profile: { select: { username: true } },
              },
            },
          },
        },
        reportsMade: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          take: 15,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    sendSuccess(res, user);
  });

  updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      throw new ValidationError({ role: ['Invalid or missing user role'] });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new NotFoundError('User not found');

    // Prevent demoting the last SUPER_ADMIN
    if (targetUser.role === UserRole.SUPER_ADMIN && role !== UserRole.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } });
      if (superAdminCount <= 1) {
        throw new AppError('Cannot demote the only remaining SUPER_ADMIN on the platform', 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: { id: true, email: true, role: true },
    });

    await logAdminAction(
      req.user!.userId,
      'USER_ROLE_UPDATED',
      'User',
      id,
      { previousRole: targetUser.role, newRole: role, targetEmail: targetUser.email },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, `Role updated to ${role}`);
  });

  banUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new ValidationError({ reason: ['A specific ban reason of at least 3 characters is required'] });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('User not found');

    if (target.role === UserRole.SUPER_ADMIN) {
      throw new AppError('Super Administrators cannot be banned through this panel', 403);
    }

    await prisma.user.update({
      where: { id },
      data: { banned: true, banReason: reason.trim() },
    });

    await logAdminAction(
      req.user!.userId,
      'USER_BANNED',
      'User',
      id,
      { reason: reason.trim(), targetEmail: target.email },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, null, 'User banned successfully');
  });

  unbanUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('User not found');

    await prisma.user.update({
      where: { id },
      data: { banned: false, banReason: null },
    });

    await logAdminAction(
      req.user!.userId,
      'USER_UNBANNED',
      'User',
      id,
      { targetEmail: target.email },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, null, 'User unbanned successfully');
  });

  toggleProfileVerification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { verified, reason } = req.body;

    if (typeof verified !== 'boolean') {
      throw new ValidationError({ verified: ['Verified status must be a boolean'] });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundError('User not found');
    if (!user.profile) throw new NotFoundError('User does not have a profile yet');

    const updatedProfile = await prisma.profile.update({
      where: { userId: id },
      data: { verified },
    });

    await logAdminAction(
      req.user!.userId,
      verified ? 'USER_PROFILE_VERIFIED' : 'USER_PROFILE_UNVERIFIED',
      'Profile',
      user.profile.id,
      { targetEmail: user.email, targetUsername: user.profile.username, verified, reason },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updatedProfile, `Profile verification set to ${verified}`);
  });

  // ─── Game & Gamer Identity Management ─────────────────────────────────────
  getGames = asyncHandler(async (req: AuthRequest, res: Response) => {
    const canonical = getAllCanonicalGames();
    const [profileCounts, approvedRequests] = await Promise.all([
      prisma.gameProfile.groupBy({
        by: ['game'],
        _count: { id: true },
      }),
      prisma.gameRequest.findMany({
        where: { status: 'APPROVED' },
      }),
    ]);

    const countsMap = profileCounts.reduce(
      (acc, c) => ({ ...acc, [c.game.toLowerCase()]: c._count.id }),
      {} as Record<string, number>
    );

    const result = canonical.map((g) => ({
      ...g,
      totalPlayers: countsMap[g.gameId.toLowerCase()] || countsMap[g.displayName.toLowerCase()] || 0,
      source: 'CANONICAL',
    }));

    sendSuccess(res, {
      canonical: result,
      approvedCommunity: approvedRequests,
      total: result.length + approvedRequests.length,
    });
  });

  getGamerIdentities = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', search = '', game, verified } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (game && game !== 'ALL') {
      where.game = { equals: game as string, mode: 'insensitive' };
    }
    if (verified === 'true') {
      where.verified = true;
    } else if (verified === 'false') {
      where.verified = false;
    }
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { gameUid: { contains: q, mode: 'insensitive' } },
        { inGameName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { username: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [identities, total] = await Promise.all([
      prisma.gameProfile.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              profile: { select: { username: true, displayName: true, avatar: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.gameProfile.count({ where }),
    ]);

    sendSuccess(res, identities, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  verifyGamerIdentity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { verified, reason } = req.body;
    if (typeof verified !== 'boolean') {
      throw new ValidationError({ verified: ['Verified status must be a boolean'] });
    }

    const existing = await prisma.gameProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!existing) throw new NotFoundError('Gamer identity profile not found');

    const updated = await prisma.gameProfile.update({
      where: { id },
      data: { verified },
    });

    await logAdminAction(
      req.user!.userId,
      verified ? 'GAMER_IDENTITY_VERIFIED' : 'GAMER_IDENTITY_UNVERIFIED',
      'GameProfile',
      id,
      { game: existing.game, gameUid: existing.gameUid, targetEmail: existing.user.email, verified, reason },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, `Gamer identity verification set to ${verified}`);
  });

  // ─── Squads & Squad Continuity Management ─────────────────────────────────
  getSquads = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', search = '', status, region } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { tag: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status && Object.values(TeamStatus).includes(status as TeamStatus)) {
      where.status = status as TeamStatus;
    }
    if (region && region !== 'ALL') {
      where.region = region as string;
    }

    const [squads, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { members: true, invites: true, applications: true, tournaments: true, scrims: true },
          },
          members: {
            where: { role: 'LEADER' },
            take: 1,
            include: {
              user: { select: { id: true, email: true, profile: { select: { username: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.team.count({ where }),
    ]);

    sendSuccess(res, squads, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getSquadDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const squad = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                profile: { select: { username: true, displayName: true, avatar: true } },
              },
            },
          },
        },
        invites: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, profile: { select: { username: true } } } },
          },
        },
        applications: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, profile: { select: { username: true } } } },
          },
        },
        practiceSchedules: true,
        scrims: { take: 10, orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!squad) throw new NotFoundError('Squad not found');
    sendSuccess(res, squad);
  });

  updateSquadStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status || !Object.values(TeamStatus).includes(status)) {
      throw new ValidationError({ status: ['Valid squad status transition required'] });
    }

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Squad not found');

    const updated = await prisma.team.update({
      where: { id },
      data: { status },
    });

    await logAdminAction(
      req.user!.userId,
      'SQUAD_STATUS_UPDATED',
      'Team',
      id,
      { squadName: existing.name, previousStatus: existing.status, newStatus: status, reason },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, `Squad status updated to ${status}`);
  });

  getSquadInvitations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', status = 'ALL', type = 'INVITE' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (type === 'APPLICATION') {
      const where: any = {};
      if (status && status !== 'ALL') where.status = status;
      const [applications, total] = await Promise.all([
        prisma.teamApplication.findMany({
          where,
          skip,
          take: limitNum,
          include: {
            team: { select: { id: true, name: true, tag: true } },
            user: { select: { id: true, email: true, profile: { select: { username: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.teamApplication.count({ where }),
      ]);
      return sendSuccess(res, applications, undefined, 200, {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    const [invites, total] = await Promise.all([
      prisma.teamInvite.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          team: { select: { id: true, name: true, tag: true } },
          user: { select: { id: true, email: true, profile: { select: { username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamInvite.count({ where }),
    ]);

    sendSuccess(res, invites, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  // ─── Gaming Sessions & Community Ratings ──────────────────────────────────
  getGamingSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', type = 'SCRIM' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (type === 'CHALLENGE') {
      const [challenges, total] = await Promise.all([
        prisma.challenge.findMany({
          skip,
          take: limitNum,
          include: {
            challenger: { select: { id: true, email: true, profile: { select: { username: true } } } },
            opponent: { select: { id: true, email: true, profile: { select: { username: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.challenge.count(),
      ]);
      return sendSuccess(res, challenges, undefined, 200, {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    if (type === 'TEAMMATE_REQUEST') {
      const [requests, total] = await Promise.all([
        prisma.freeFireTeammateRequest.findMany({
          skip,
          take: limitNum,
          include: {
            sender: { select: { id: true, email: true, profile: { select: { username: true } } } },
            receiver: { select: { id: true, email: true, profile: { select: { username: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.freeFireTeammateRequest.count(),
      ]);
      return sendSuccess(res, requests, undefined, 200, {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // Default: Scrims
    const [scrims, total] = await Promise.all([
      prisma.scrim.findMany({
        skip,
        take: limitNum,
        include: {
          team: { select: { id: true, name: true, tag: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.scrim.count(),
    ]);

    sendSuccess(res, scrims, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getSessionRatings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [ratings, total] = await Promise.all([
      prisma.freeFireSessionRating.findMany({
        skip,
        take: limitNum,
        include: {
          rater: { select: { id: true, email: true, profile: { select: { username: true } } } },
          ratedUser: { select: { id: true, email: true, profile: { select: { username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.freeFireSessionRating.count(),
    ]);

    sendSuccess(res, ratings, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  // ─── Tournament Management ────────────────────────────────────────────────
  getTournaments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', search = '', status, game } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search && typeof search === 'string') {
      const q = search.trim();
      where.title = { contains: q, mode: 'insensitive' };
    }
    if (status && Object.values(TournamentStatus).includes(status as TournamentStatus)) {
      where.status = status as TournamentStatus;
    }
    if (game && game !== 'ALL') {
      where.game = { equals: game as string, mode: 'insensitive' };
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { teams: true, participants: true, matches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tournament.count({ where }),
    ]);

    sendSuccess(res, tournaments, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getTournamentDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: {
          take: 30,
          include: {
            team: { select: { id: true, name: true, tag: true } },
            members: {
              include: {
                user: { select: { id: true, email: true, profile: { select: { username: true } } } },
              },
            },
          },
        },
        participants: {
          take: 50,
          include: {
            user: { select: { id: true, email: true, profile: { select: { username: true, displayName: true } } } },
          },
        },
        matches: {
          take: 20,
          orderBy: { round: 'asc' },
        },
        activities: {
          take: 15,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!tournament) throw new NotFoundError('Tournament not found');
    sendSuccess(res, tournament);
  });

  updateTournamentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status || !Object.values(TournamentStatus).includes(status)) {
      throw new ValidationError({ status: ['Valid tournament status is required'] });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundError('Tournament not found');

    // State machine check: terminal states
    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new AppError('Completed tournaments cannot transition to other statuses', 400);
    }
    if (tournament.status === TournamentStatus.CANCELLED) {
      throw new AppError('Cancelled tournaments cannot be reopened', 400);
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { status },
    });

    await logAdminAction(
      req.user!.userId,
      'TOURNAMENT_STATUS_UPDATED',
      'Tournament',
      id,
      { tournamentTitle: tournament.title, previousStatus: tournament.status, newStatus: status, reason },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, `Tournament status updated to ${status}`);
  });

  // ─── Product Management (Catalog / Merchandise / Digital Items) ───────────
  getProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      page = '1',
      limit = '20',
      search = '',
      category,
      status,
      stockStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (status && typeof status === 'string' && Object.values(ProductStatus).includes(status as ProductStatus)) {
      where.status = status as ProductStatus;
    }

    if (stockStatus === 'out') {
      where.stock = 0;
    } else if (stockStatus === 'low') {
      where.stock = { lte: 5, gt: 0 };
    } else if (stockStatus === 'in') {
      where.stock = { gt: 5 };
    }

    const orderBy: any = {};
    if (['createdAt', 'name', 'price', 'stock'].includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          _count: { select: { orderItems: true } },
        },
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    sendSuccess(res, products, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getProductDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { order: { select: { id: true, orderNumber: true, status: true, createdAt: true, user: { select: { email: true } } } } },
        },
      },
    });

    if (!product) throw new NotFoundError('Product not found');
    sendSuccess(res, product);
  });

  createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, description, category, price, stock = 0, images = [], sizes = [], colors = [], status = 'ACTIVE' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError({ name: ['Product name is required'] });
    }
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      throw new ValidationError({ category: ['Category is required'] });
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new ValidationError({ price: ['Price must be a non-negative number'] });
    }
    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      throw new ValidationError({ stock: ['Stock must be a non-negative integer'] });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category: category.trim(),
        price: numPrice,
        stock: numStock,
        images: Array.isArray(images) ? images.filter(Boolean) : [],
        sizes: Array.isArray(sizes) ? sizes.filter(Boolean) : [],
        colors: Array.isArray(colors) ? colors.filter(Boolean) : [],
        status: Object.values(ProductStatus).includes(status) ? status : ProductStatus.ACTIVE,
      },
    });

    await logAdminAction(
      req.user!.userId,
      'PRODUCT_CREATED',
      'Product',
      product.id,
      { name: product.name, price: product.price, stock: product.stock },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, product, 'Product created successfully', 201);
  });

  updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, category, price, stock, images, sizes, colors, status } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Product not found');

    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError({ name: ['Product name cannot be empty'] });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (category !== undefined) updateData.category = category.trim();

    if (price !== undefined) {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new ValidationError({ price: ['Price must be a non-negative number'] });
      }
      updateData.price = numPrice;
    }

    if (stock !== undefined) {
      const numStock = parseInt(stock, 10);
      if (isNaN(numStock) || numStock < 0) {
        throw new ValidationError({ stock: ['Stock must be a non-negative integer'] });
      }
      updateData.stock = numStock;
      if (numStock === 0 && (!status || status === ProductStatus.ACTIVE)) {
        updateData.status = ProductStatus.OUT_OF_STOCK;
      }
    }

    if (images !== undefined && Array.isArray(images)) updateData.images = images.filter(Boolean);
    if (sizes !== undefined && Array.isArray(sizes)) updateData.sizes = sizes.filter(Boolean);
    if (colors !== undefined && Array.isArray(colors)) updateData.colors = colors.filter(Boolean);
    if (status !== undefined && Object.values(ProductStatus).includes(status)) {
      updateData.status = status;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction(
      req.user!.userId,
      'PRODUCT_UPDATED',
      'Product',
      id,
      { changes: Object.keys(updateData) },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, 'Product updated successfully');
  });

  deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!existing) throw new NotFoundError('Product not found');

    if (existing._count.orderItems > 0) {
      const archived = await prisma.product.update({
        where: { id },
        data: { status: ProductStatus.ARCHIVED },
      });

      await logAdminAction(
        req.user!.userId,
        'PRODUCT_ARCHIVED',
        'Product',
        id,
        { reason: 'Product has historical orders; archived instead of hard-deleted to preserve customer records' },
        req.ip,
        req.headers['user-agent']
      );

      return sendSuccess(res, archived, 'Product archived to preserve order history');
    }

    await prisma.product.delete({ where: { id } });

    await logAdminAction(
      req.user!.userId,
      'PRODUCT_DELETED',
      'Product',
      id,
      { name: existing.name },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, null, 'Product deleted successfully');
  });

  uploadMedia = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      throw new ValidationError({ image: ['No file uploaded or file rejected by security filter'] });
    }

    const upload = await mediaStorageService.uploadMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'posts'
    );

    sendSuccess(res, { url: upload.url, publicId: upload.publicId }, 'Image uploaded successfully');
  });

  // ─── Order & Transaction Management ───────────────────────────────────────
  getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      page = '1',
      limit = '20',
      search = '',
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { profile: { username: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (status && typeof status === 'string' && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status as OrderStatus;
    }

    if (paymentStatus && typeof paymentStatus === 'string' && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }

    const orderBy: any = {};
    if (['createdAt', 'totalAmount'].includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { username: true, displayName: true } },
            },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
        },
        orderBy,
      }),
      prisma.order.count({ where }),
    ]);

    sendSuccess(res, orders, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  getOrderDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundError('Order not found');
    sendSuccess(res, order);
  });

  updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      throw new ValidationError({ status: ['Valid order status transition required'] });
    }

    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) throw new NotFoundError('Order not found');

    if (currentOrder.status === OrderStatus.DELIVERED && status !== OrderStatus.REFUNDED) {
      throw new AppError('Delivered orders can only be refunded, not changed back to earlier fulfillment states', 400);
    }
    if (currentOrder.status === OrderStatus.CANCELLED) {
      throw new AppError('Cancelled orders cannot be reopened or shipped', 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        notes: notes ? (currentOrder.notes ? `${currentOrder.notes}\n[${new Date().toISOString()}] ${notes}` : notes) : currentOrder.notes,
      },
    });

    await logAdminAction(
      req.user!.userId,
      'ORDER_STATUS_UPDATED',
      'Order',
      id,
      { previousStatus: currentOrder.status, newStatus: status, notes },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, `Order status updated to ${status}`);
  });

  // ─── Reports & Moderation ─────────────────────────────────────────────────
  getReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', status = 'ALL' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          reporter: { select: { id: true, email: true, profile: { select: { username: true, avatar: true } } } },
          reported: { select: { id: true, email: true, profile: { select: { username: true, avatar: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    sendSuccess(res, reports, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  resolveReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution || typeof resolution !== 'string' || resolution.trim().length < 3) {
      throw new ValidationError({ resolution: ['A resolution note of at least 3 characters is required'] });
    }

    const target = await prisma.report.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('Report not found');

    const updated = await prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED', resolution: resolution.trim(), resolvedAt: new Date() },
    });

    await logAdminAction(
      req.user!.userId,
      'REPORT_RESOLVED',
      'Report',
      id,
      { resolution: resolution.trim(), reportReason: target.reason },
      req.ip,
      req.headers['user-agent']
    );

    sendSuccess(res, updated, 'Report resolved successfully');
  });

  // ─── Admin Audit Logs ─────────────────────────────────────────────────────
  getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '50', action = '', search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action && typeof action === 'string' && action !== 'ALL') {
      where.action = action;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, logs, undefined, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  });

  // ─── Tournament Moderation (Phase 6 preservation) ──────────────────────────
  getTournamentReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await tournamentService.getAdminReports(req.query as any);
    sendSuccess(res, result.reports, undefined, 200, result.pagination);
  });

  getTournamentReportDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const detail = await tournamentService.getAdminReportDetail(req.params.reportId);
    sendSuccess(res, detail);
  });

  updateReportStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await tournamentService.updateReportStatus(req.params.reportId, req.user!.userId, req.body.status);
    await logAdminAction(req.user!.userId, 'TOURNAMENT_REPORT_STATUS_UPDATED', 'TournamentSupportTicket', req.params.reportId, { status: req.body.status });
    sendSuccess(res, report, 'Report status updated');
  });

  resolveTournamentReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await tournamentService.resolveReport(req.params.reportId, req.user!.userId, req.body);
    await logAdminAction(req.user!.userId, 'TOURNAMENT_REPORT_RESOLVED', 'TournamentSupportTicket', req.params.reportId, req.body);
    sendSuccess(res, report, 'Report resolved');
  });

  suspendTournament = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    const tournament = await tournamentService.suspendTournamentByAdmin(req.params.id, req.user!.userId, reason || 'Admin suspension');
    await logAdminAction(req.user!.userId, 'TOURNAMENT_SUSPENDED', 'Tournament', req.params.id, { reason });
    sendSuccess(res, tournament, 'Tournament suspended');
  });
}

export const adminController = new AdminController();
