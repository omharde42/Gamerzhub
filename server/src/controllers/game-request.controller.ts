import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';

export class GameRequestController {
  // Any authenticated user can submit a game request
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { gameName, genre, logo } = req.body;

    if (!gameName || !genre) {
      return sendError(res, 400, 'Game name and genre are required');
    }

    // Check for duplicate pending request from this user
    const existing = await prisma.gameRequest.findFirst({
      where: {
        gameName: { equals: gameName, mode: 'insensitive' },
        userId: req.user!.userId,
        status: 'PENDING',
      },
    });
    if (existing) {
      return sendError(res, 400, 'You already have a pending request for this game');
    }

    const request = await prisma.gameRequest.create({
      data: {
        gameName,
        genre,
        logo: logo || null,
        userId: req.user!.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { username: true, avatar: true },
            },
          },
        },
      },
    });

    sendSuccess(res, request, 'Game request submitted for admin approval', 201);
  });

  // Any authenticated user can view their own requests
  myRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const requests = await prisma.gameRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, requests);
  });

  // Public: list all approved games
  listApproved = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const approved = await prisma.gameRequest.findMany({
      where: { status: 'APPROVED' },
      orderBy: { gameName: 'asc' },
      select: {
        id: true,
        gameName: true,
        genre: true,
        logo: true,
      },
    });
    sendSuccess(res, approved);
  });

  // Admin: list all pending requests
  listPending = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const pending = await prisma.gameRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { username: true, avatar: true },
            },
          },
        },
      },
    });
    sendSuccess(res, pending);
  });

  // Admin: list all requests (all statuses)
  listAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const all = await prisma.gameRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: { username: true, avatar: true },
            },
          },
        },
      },
    });
    sendSuccess(res, all);
  });

  // Admin: approve a request
  approve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { adminNote } = req.body;

    const request = await prisma.gameRequest.findUnique({ where: { id } });
    if (!request) return sendError(res, 404, 'Game request not found');
    if (request.status !== 'PENDING') return sendError(res, 400, 'Request already processed');

    const updated = await prisma.gameRequest.update({
      where: { id },
      data: { status: 'APPROVED', adminNote },
    });

    try {
      const { logAdminAction } = await import('./admin.controller');
      await logAdminAction(req.user!.userId, 'GAME_REQUEST_APPROVED', 'GameRequest', id, { gameName: request.gameName, adminNote }, req.ip, req.headers['user-agent']);
    } catch {}

    sendSuccess(res, updated, 'Game request approved');
  });

  // Admin: reject a request
  reject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { adminNote } = req.body;

    const request = await prisma.gameRequest.findUnique({ where: { id } });
    if (!request) return sendError(res, 404, 'Game request not found');
    if (request.status !== 'PENDING') return sendError(res, 400, 'Request already processed');

    const updated = await prisma.gameRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote },
    });

    try {
      const { logAdminAction } = await import('./admin.controller');
      await logAdminAction(req.user!.userId, 'GAME_REQUEST_REJECTED', 'GameRequest', id, { gameName: request.gameName, adminNote }, req.ip, req.headers['user-agent']);
    } catch {}

    sendSuccess(res, updated, 'Game request rejected');
  });
}

export const gameRequestController = new GameRequestController();
