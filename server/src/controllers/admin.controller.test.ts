import { adminController } from './admin.controller';
import prisma from '../config/database';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { UserRole, TournamentStatus, TeamStatus } from '@prisma/client';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    profile: {
      count: jest.fn(),
      update: jest.fn(),
    },
    gameProfile: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    gameAccount: { count: jest.fn() },
    connectedGame: { count: jest.fn() },
    team: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    teamMember: { count: jest.fn() },
    teamInvite: { count: jest.fn(), findMany: jest.fn() },
    teamApplication: { count: jest.fn(), findMany: jest.fn() },
    scrim: { count: jest.fn(), findMany: jest.fn() },
    challenge: { count: jest.fn(), findMany: jest.fn() },
    freeFireTeammateRequest: { count: jest.fn(), findMany: jest.fn() },
    freeFireSessionRating: { count: jest.fn(), findMany: jest.fn() },
    tournament: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    tournamentParticipant: { count: jest.fn() },
    tournamentTeam: { count: jest.fn() },
    report: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    tournamentSupportTicket: { count: jest.fn() },
    gameRequest: { count: jest.fn(), findMany: jest.fn() },
    partnershipApplication: { count: jest.fn() },
    product: { count: jest.fn(), groupBy: jest.fn() },
    order: { count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
    subscription: { count: jest.fn(), groupBy: jest.fn() },
    auditLog: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('../services/tournament.service', () => ({
  tournamentService: {
    getAdminReports: jest.fn(),
    getAdminReportDetail: jest.fn(),
    updateReportStatus: jest.fn(),
    resolveReport: jest.fn(),
    suspendTournamentByAdmin: jest.fn(),
  },
}));

const mockReq = (params: any = {}, query: any = {}, body: any = {}, user: any = { userId: 'admin-1', role: 'ADMIN' }) => ({
  params,
  query,
  body,
  user,
  ip: '127.0.0.1',
  headers: { 'user-agent': 'JestTest' },
} as any);

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AdminController Automated Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('returns calculated aggregate metrics from genuine database counts', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(150).mockResolvedValueOnce(5); // total, banned
      (prisma.user.groupBy as jest.Mock).mockResolvedValue([{ role: 'USER', _count: { id: 140 } }]);
      (prisma.gameProfile.count as jest.Mock).mockResolvedValue(45);
      (prisma.gameAccount.count as jest.Mock).mockResolvedValue(30);
      (prisma.connectedGame.count as jest.Mock).mockResolvedValue(20);
      (prisma.profile.count as jest.Mock).mockResolvedValue(12);
      (prisma.team.count as jest.Mock).mockResolvedValue(10);
      (prisma.team.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.teamMember.count as jest.Mock).mockResolvedValue(35);
      (prisma.teamInvite.count as jest.Mock).mockResolvedValue(4);
      (prisma.teamApplication.count as jest.Mock).mockResolvedValue(2);
      (prisma.scrim.count as jest.Mock).mockResolvedValue(8);
      (prisma.challenge.count as jest.Mock).mockResolvedValue(6);
      (prisma.freeFireTeammateRequest.count as jest.Mock).mockResolvedValue(15);
      (prisma.freeFireSessionRating.count as jest.Mock).mockResolvedValue(18);
      (prisma.tournament.count as jest.Mock).mockResolvedValue(5);
      (prisma.tournament.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.tournamentParticipant.count as jest.Mock).mockResolvedValue(40);
      (prisma.tournamentTeam.count as jest.Mock).mockResolvedValue(8);
      (prisma.report.count as jest.Mock).mockResolvedValueOnce(3).mockResolvedValueOnce(10);
      (prisma.tournamentSupportTicket.count as jest.Mock).mockResolvedValue(1);
      (prisma.gameRequest.count as jest.Mock).mockResolvedValue(2);
      (prisma.partnershipApplication.count as jest.Mock).mockResolvedValue(1);
      (prisma.product.count as jest.Mock).mockResolvedValue(0);
      (prisma.product.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.order.count as jest.Mock).mockResolvedValue(0);
      (prisma.order.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.order.aggregate as jest.Mock).mockResolvedValue({ _sum: { totalAmount: 0 } });
      (prisma.subscription.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      await adminController.getDashboardStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            users: expect.objectContaining({ total: 150, active: 145, banned: 5 }),
            squads: expect.objectContaining({ total: 10, totalMembers: 35 }),
          }),
        })
      );
    });
  });

  describe('updateUserRole', () => {
    it('prevents demoting the last SUPER_ADMIN', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-super',
        email: 'super@gamerzhub.com',
        role: UserRole.SUPER_ADMIN,
      });
      (prisma.user.count as jest.Mock).mockResolvedValue(1); // Only 1 super admin exists

      const req = mockReq({ id: 'u-super' }, {}, { role: 'ADMIN' }, { userId: 'u-super', role: 'SUPER_ADMIN' });
      const res = mockRes();
      const next = jest.fn();

      await adminController.updateUserRole(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Cannot demote the only remaining SUPER_ADMIN') })
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('banUser and unbanUser', () => {
    it('rejects ban request with short or missing reason', async () => {
      const req = mockReq({ id: 'u-123' }, {}, { reason: 'no' });
      const res = mockRes();
      const next = jest.fn();

      await adminController.banUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('prevents banning a SUPER_ADMIN', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-super',
        email: 'owner@gamerzhub.com',
        role: UserRole.SUPER_ADMIN,
      });

      const req = mockReq({ id: 'u-super' }, {}, { reason: 'Violation testing' });
      const res = mockRes();
      const next = jest.fn();

      await adminController.banUser(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Super Administrators cannot be banned') })
      );
    });

    it('successfully bans regular user and writes an audit log', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-regular',
        email: 'gamer@test.com',
        role: UserRole.USER,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u-regular', banned: true });

      const req = mockReq({ id: 'u-regular' }, {}, { reason: 'Cheating in tournament match' });
      const res = mockRes();
      const next = jest.fn();

      await adminController.banUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-regular' },
        data: { banned: true, banReason: 'Cheating in tournament match' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_BANNED',
            entity: 'User',
            entityId: 'u-regular',
          }),
        })
      );
    });
  });

  describe('updateTournamentStatus', () => {
    it('rejects status changes if tournament is already COMPLETED', async () => {
      (prisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        id: 'tourney-1',
        title: 'Valorant Cup',
        status: TournamentStatus.COMPLETED,
      });

      const req = mockReq({ id: 'tourney-1' }, {}, { status: TournamentStatus.IN_PROGRESS });
      const res = mockRes();
      const next = jest.fn();

      await adminController.updateTournamentStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Completed tournaments cannot transition') })
      );
      expect(prisma.tournament.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyGamerIdentity', () => {
    it('updates verified status for gamer identity and logs audit event', async () => {
      (prisma.gameProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'gp-1',
        game: 'Free Fire',
        gameUid: '987654321',
        user: { email: 'ffpro@test.com' },
      });
      (prisma.gameProfile.update as jest.Mock).mockResolvedValue({ id: 'gp-1', verified: true });

      const req = mockReq({ id: 'gp-1' }, {}, { verified: true, reason: 'Verified via screenshot' });
      const res = mockRes();
      const next = jest.fn();

      await adminController.verifyGamerIdentity(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(prisma.gameProfile.update).toHaveBeenCalledWith({
        where: { id: 'gp-1' },
        data: { verified: true },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'GAMER_IDENTITY_VERIFIED',
            entity: 'GameProfile',
            entityId: 'gp-1',
          }),
        })
      );
    });
  });
});
