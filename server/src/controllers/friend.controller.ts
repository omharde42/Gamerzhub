import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';

export class FriendController {
  sendRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.body;
    if (userId === req.user!.userId) {
      return sendError(res, 400, 'Cannot send friend request to yourself');
    }
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.user!.userId, receiverId: userId },
          { senderId: userId, receiverId: req.user!.userId },
        ],
      },
    });
    if (existing) throw new ConflictError('Friend request already exists');
    const request = await prisma.friendRequest.create({
      data: { senderId: req.user!.userId, receiverId: userId },
    });
    sendSuccess(res, request, 'Friend request sent', 201);
  });

  acceptRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new NotFoundError('Friend request');
    if (request.receiverId !== req.user!.userId) throw new ForbiddenError('Not authorized to accept this request');
    const updated = await prisma.friendRequest.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' },
    });
    sendSuccess(res, updated, 'Friend request accepted');
  });

  rejectRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new NotFoundError('Friend request');
    if (request.receiverId !== req.user!.userId) throw new ForbiddenError('Not authorized to reject this request');
    await prisma.friendRequest.update({
      where: { id: req.params.id },
      data: { status: 'DECLINED' },
    });
    sendSuccess(res, null, 'Request rejected');
  });

  removeFriend = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.body;
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: req.user!.userId, receiverId: userId },
          { senderId: userId, receiverId: req.user!.userId },
        ],
        status: 'ACCEPTED',
      },
    });
    sendSuccess(res, null, 'Friend removed');
  });

  listFriends = asyncHandler(async (req: AuthRequest, res: Response) => {
    const targetUserId = (req.query.userId as string) || req.user!.userId;
    const [sent, received] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { senderId: targetUserId, status: 'ACCEPTED' },
        include: {
          receiver: { select: { id: true, presence: true, profile: true } },
        },
      }),
      prisma.friendRequest.findMany({
        where: { receiverId: targetUserId, status: 'ACCEPTED' },
        include: {
          sender: { select: { id: true, presence: true, profile: true } },
        },
      }),
    ]);
    const friends = [...sent.map((r: any) => r.receiver), ...received.map((r: any) => r.sender)];
    sendSuccess(res, friends);
  });

  listRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: req.user!.userId, status: 'PENDING' },
      include: { sender: { select: { id: true, profile: { select: { username: true, avatar: true } } } } },
    });
    sendSuccess(res, requests);
  });

  getSuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.userId;

    // 1. Fetch current user's profile & game profiles
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        profile: true,
        gameProfiles: true,
      },
    });

    if (!currentUser) throw new NotFoundError('User');

    // Primary preferences
    const primaryGameProfile = currentUser.gameProfiles[0];
    const targetGame = primaryGameProfile?.game || currentUser.profile?.mainGames?.[0] || 'Free Fire';
    const targetRegion = primaryGameProfile?.region || currentUser.profile?.country || 'ASIA';
    const targetAvailability = primaryGameProfile?.availability || currentUser.profile?.availability;
    const targetRank = primaryGameProfile?.rank || currentUser.profile?.rank || 'Heroic';

    // Rank Tier Proximity Mapping (Tiers 1..10)
    const rankTierMap: Record<string, number> = {
      'BRONZE': 1, 'SILVER': 2, 'GOLD': 3, 'PLATINUM': 4, 'DIAMOND': 5,
      'ASCENDANT': 6, 'HEROIC': 7, 'MASTER': 7, 'GRANDMASTER': 8, 'ACE': 9, 'RADIANT': 10,
    };

    const getRankTier = (r?: string | null): number => {
      if (!r) return 5;
      const upper = r.toUpperCase();
      for (const [key, val] of Object.entries(rankTierMap)) {
        if (upper.includes(key)) return val;
      }
      return 5;
    };

    const currentRankTier = getRankTier(targetRank);
    const minTier = Math.max(1, currentRankTier - 2);
    const maxTier = Math.min(10, currentRankTier + 2);

    // 2. Gather excluded IDs (Current user, existing friends, pending requests, blocked users)
    const [sentRequests, receivedRequests, userBlocks, blockedBy] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { senderId: currentUserId },
        select: { receiverId: true },
      }),
      prisma.friendRequest.findMany({
        where: { receiverId: currentUserId },
        select: { senderId: true },
      }),
      prisma.userBlock.findMany({
        where: { blockerId: currentUserId },
        select: { blockedId: true },
      }),
      prisma.userBlock.findMany({
        where: { blockedId: currentUserId },
        select: { blockerId: true },
      }),
    ]);

    const excludedIds = new Set<string>();
    excludedIds.add(currentUserId);
    sentRequests.forEach(r => excludedIds.add(r.receiverId));
    receivedRequests.forEach(r => excludedIds.add(r.senderId));
    userBlocks.forEach(b => excludedIds.add(b.blockedId));
    blockedBy.forEach(b => excludedIds.add(b.blockerId));

    // 3. Query potential candidate suggestions
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedIds) },
        profile: {
          allowComparison: true, // Only users who enabled discovery
        },
        gameProfiles: {
          some: {
            game: targetGame,
          },
        },
      },
      take: 60,
      include: {
        profile: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            country: true,
            rank: true,
            availability: true,
          },
        },
        gameProfiles: {
          where: { game: targetGame },
        },
      },
    });

    // 4. Score and filter candidates by rank proximity, region, availability
    const scoredCandidates = candidates.map(c => {
      const gProfile = c.gameProfiles[0];
      const candidateRankTier = getRankTier(gProfile?.rank || c.profile?.rank);
      const tierDiff = Math.abs(candidateRankTier - currentRankTier);

      let score = 0;
      if (tierDiff <= 2) {
        score += (3 - tierDiff) * 25; // Proximity scoring
      }

      const candidateRegion = gProfile?.region || c.profile?.country;
      if (candidateRegion && targetRegion && candidateRegion.toUpperCase() === targetRegion.toUpperCase()) {
        score += 20;
      }

      const candidateAvail = gProfile?.availability || c.profile?.availability;
      if (candidateAvail && targetAvailability && candidateAvail.toUpperCase() === targetAvailability.toUpperCase()) {
        score += 10;
      }

      return {
        user: {
          id: c.id,
          gamerzId: c.gamerzId,
          profile: c.profile,
          gameProfile: gProfile || null,
        },
        rankTier: candidateRankTier,
        score,
      };
    });

    // Filter within +/- 2 rank proximity tier range, sort by score descending, cap at 20
    const suggestions = scoredCandidates
      .filter(sc => sc.rankTier >= minTier && sc.rankTier <= maxTier)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(sc => sc.user);

    sendSuccess(res, suggestions, 'Friend suggestions retrieved successfully');
  });
}

export const friendController = new FriendController();
