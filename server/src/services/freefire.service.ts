import prisma from '../config/database';
import { appwriteService } from './appwrite.service';
import { AppError } from '../utils/errors';

export interface FreeFireProfileInput {
  freeFireUid?: string;
  freeFireUsername?: string;
  preferredMode?: string;
  rank?: string;
  playstyle?: string;
  language?: string;
  micPreference?: boolean;
  availability?: string;
  teammatePreference?: string;
}

export interface TeammateFilterQuery {
  rank?: string;
  playstyle?: string;
  language?: string;
  availability?: string;
  micPreference?: boolean;
  limit?: number;
}

export class FreeFireService {
  /**
   * Get or create user Free Fire profile
   */
  async getProfile(userId: string) {
    let profile = await (prisma as any).freeFireProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      profile = await (prisma as any).freeFireProfile.create({
        data: {
          userId,
          isVerified: false, // Always false per Anti-Fabrication Policy
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });
    }

    return profile;
  }

  /**
   * Upsert Free Fire profile information
   */
  async updateProfile(userId: string, data: FreeFireProfileInput) {
    const profile = await (prisma as any).freeFireProfile.upsert({
      where: { userId },
      create: {
        userId,
        freeFireUid: data.freeFireUid,
        freeFireUsername: data.freeFireUsername,
        preferredMode: data.preferredMode || 'BR_SQUAD',
        rank: data.rank || 'HEROIC',
        playstyle: data.playstyle || 'BALANCED',
        language: data.language || 'ENGLISH',
        micPreference: data.micPreference !== undefined ? data.micPreference : true,
        availability: data.availability || 'EVENING',
        teammatePreference: data.teammatePreference,
        isVerified: false, // Enforce non-verified status
      },
      update: {
        freeFireUid: data.freeFireUid,
        freeFireUsername: data.freeFireUsername,
        preferredMode: data.preferredMode,
        rank: data.rank,
        playstyle: data.playstyle,
        language: data.language,
        micPreference: data.micPreference,
        availability: data.availability,
        teammatePreference: data.teammatePreference,
        isVerified: false, // Ensure users cannot self-set verified
      },
      include: {
        user: {
          select: {
            profile: {
              select: {
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Write-through sync to Appwrite teammate discovery read model
    appwriteService.syncTeammateDiscovery({
      id: `freefire_${userId}`,
      userId,
      gameId: 'freefire',
      rank: profile.rank || 'HEROIC',
      playstyle: profile.playstyle || 'BALANCED',
      language: profile.language || 'ENGLISH',
      micPreference: profile.micPreference,
      availability: profile.availability || 'EVENING',
      reputationScore: profile.reputationScore || 5.0,
      isVerified: false,
      username: profile.user?.profile?.username || 'Gamer',
      displayName: profile.user?.profile?.displayName || profile.user?.profile?.username || 'Gamer',
      avatar: profile.user?.profile?.avatar || null,
      updatedAt: new Date().toISOString(),
    }).catch(err => console.warn('[Appwrite] Teammate discovery sync error for Free Fire:', err?.message));

    return profile;
  }

  /**
   * Discover compatible Free Fire teammates with explainable scoring
   */
  async discoverTeammates(currentUserId: string, filters: TeammateFilterQuery) {
    const currentUserProfile = await this.getProfile(currentUserId);

    // 1. Appwrite Read Model Attempt
    const cachedCandidates = await appwriteService.getTeammateCandidates('freefire', {
      rank: filters.rank,
      playstyle: filters.playstyle,
      language: filters.language,
      availability: filters.availability,
      limit: filters.limit || 20,
    });

    if (cachedCandidates && cachedCandidates.length > 0) {
      // Filter out current user if returned in Appwrite results
      const filteredCached = cachedCandidates.filter(c => c.userId !== currentUserId);
      if (filteredCached.length > 0) {
        return filteredCached.map(candidate => {
          const matchDetails = this.calculateCompatibility(currentUserProfile, candidate);
          return {
            profile: {
              userId: candidate.userId,
              rank: candidate.rank,
              playstyle: candidate.playstyle,
              language: candidate.language,
              micPreference: candidate.micPreference,
              availability: candidate.availability,
              reputationScore: candidate.reputationScore,
              isVerified: false,
              user: {
                id: candidate.userId,
                profile: {
                  username: candidate.username,
                  displayName: candidate.displayName,
                  avatar: candidate.avatar,
                },
              },
            },
            compatibility: matchDetails.score,
            reasons: matchDetails.reasons,
            isSelfReported: true,
          };
        }).sort((a: any, b: any) => b.compatibility - a.compatibility);
      }
    }

    // 2. Primary Source Fallback (Prisma PostgreSQL)
    const candidates = await (prisma as any).freeFireProfile.findMany({
      where: {
        userId: { not: currentUserId },
        ...(filters.rank ? { rank: filters.rank } : {}),
        ...(filters.playstyle ? { playstyle: filters.playstyle } : {}),
        ...(filters.language ? { language: filters.language } : {}),
        ...(filters.availability ? { availability: filters.availability } : {}),
      },
      take: filters.limit || 20,
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Asynchronously populate Appwrite cache
    for (const c of candidates) {
      appwriteService.syncTeammateDiscovery({
        id: `freefire_${c.userId}`,
        userId: c.userId,
        gameId: 'freefire',
        rank: c.rank,
        playstyle: c.playstyle,
        language: c.language,
        micPreference: c.micPreference,
        availability: c.availability,
        reputationScore: c.reputationScore,
        isVerified: false,
        username: c.user?.profile?.username || 'Gamer',
        displayName: c.user?.profile?.displayName || c.user?.profile?.username || 'Gamer',
        avatar: c.user?.profile?.avatar || null,
        updatedAt: new Date().toISOString(),
      }).catch(err => console.warn('[Appwrite] Lazy teammate sync warning:', err?.message));
    }

    return candidates.map((candidate: any) => {
      const matchDetails = this.calculateCompatibility(currentUserProfile, candidate);
      return {
        profile: candidate,
        compatibility: matchDetails.score,
        reasons: matchDetails.reasons,
        isSelfReported: !candidate.isVerified, // Explicit trust transparency flag
      };
    }).sort((a: any, b: any) => b.compatibility - a.compatibility);
  }

  /**
   * Transparent compatibility scoring algorithm
   */
  calculateCompatibility(userA: any, userB: any) {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Language match (+20)
    if (userA.language && userB.language && userA.language.toUpperCase() === userB.language.toUpperCase()) {
      score += 20;
      reasons.push(`Speaks ${userB.language}`);
    }

    // Playstyle match (+15)
    if (userA.playstyle && userB.playstyle && userA.playstyle.toUpperCase() === userB.playstyle.toUpperCase()) {
      score += 15;
      reasons.push(`Matching ${userB.playstyle} playstyle`);
    }

    // Mic preference (+10)
    if (userA.micPreference === userB.micPreference) {
      score += 10;
      reasons.push(userB.micPreference ? 'Uses Microphone' : 'No-Mic Preferred');
    }

    // Availability overlap (+15)
    if (userA.availability && userB.availability && userA.availability.toUpperCase() === userB.availability.toUpperCase()) {
      score += 15;
      reasons.push(`Available ${userB.availability}`);
    }

    // High Reputation Bonus (+10)
    if (userB.reputationScore >= 4.5) {
      score += 10;
      reasons.push(`High Trust Rating (${userB.reputationScore.toFixed(1)}⭐)`);
    }

    return {
      score: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['General Free Fire Player'],
    };
  }

  /**
   * Send teammate request
   */
  async sendTeammateRequest(senderId: string, receiverId: string, message?: string) {
    if (senderId === receiverId) {
      throw new AppError('You cannot send a teammate request to yourself', 400);
    }

    const existing = await (prisma as any).freeFireTeammateRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new AppError('A pending request already exists for this player', 400);
    }

    return (prisma as any).freeFireTeammateRequest.create({
      data: {
        senderId,
        receiverId,
        message,
        status: 'PENDING',
      },
    });
  }

  /**
   * Update teammate request status (accept, decline, cancel)
   */
  async updateTeammateRequestStatus(requestId: string, userId: string, status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED') {
    const request = await (prisma as any).freeFireTeammateRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new AppError('Teammate request not found', 404);
    }

    if (request.receiverId !== userId && request.senderId !== userId) {
      throw new AppError('Unauthorized to update this request', 403);
    }

    return (prisma as any).freeFireTeammateRequest.update({
      where: { id: requestId },
      data: { status },
    });
  }

  /**
   * Rate a teammate post-session and update reputation
   */
  async rateTeammate(raterId: string, ratedUserId: string, rating: number, feedback?: string, commsRating?: number, reliabilityRating?: number) {
    if (raterId === ratedUserId) {
      throw new AppError('Self-rating is strictly prohibited', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5 stars', 400);
    }

    // Upsert rating
    const sessionRating = await (prisma as any).freeFireSessionRating.upsert({
      where: {
        raterId_ratedUserId: {
          raterId,
          ratedUserId,
        },
      },
      create: {
        raterId,
        ratedUserId,
        rating,
        feedback,
        communicationRating: commsRating,
        reliabilityRating,
      },
      update: {
        rating,
        feedback,
        communicationRating: commsRating,
        reliabilityRating,
      },
    });

    // Recalculate reputation score
    const allRatings = await (prisma as any).freeFireSessionRating.findMany({
      where: { ratedUserId },
      select: { rating: true },
    });

    const avgRating = allRatings.reduce((acc: number, r: any) => acc + r.rating, 0) / allRatings.length;

    await (prisma as any).freeFireProfile.update({
      where: { userId: ratedUserId },
      data: {
        reputationScore: parseFloat(avgRating.toFixed(2)),
        completedSessions: { increment: 1 },
      },
    });

    return sessionRating;
  }
}

export const freeFireService = new FreeFireService();
