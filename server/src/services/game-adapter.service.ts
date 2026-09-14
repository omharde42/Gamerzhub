import prisma from '../config/database';
import { CANONICAL_GAMES_REGISTRY, GameCapabilityConfig } from '../config/gamesRegistry';
import { AppError } from '../utils/errors';
import { appwriteService } from './appwrite.service';

export interface UpsertGameProfileInput {
  identityData: Record<string, any>;
  rank?: string;
  playstyle?: string;
  language?: string;
  micPreference?: boolean;
  availability?: string;
}

export interface CreateGameSessionInput {
  gameId: string;
  mode: string;
  title?: string;
  roomCode?: string;
  roomPassword?: string;
  joinUrl?: string;
  maxParticipants?: number;
}

export class GameAdapterService {
  /**
   * Validate game existence and capability enablement
   */
  getGameConfig(gameId: string): GameCapabilityConfig {
    const config = CANONICAL_GAMES_REGISTRY[gameId.toLowerCase()];
    if (!config) {
      throw new AppError(`GAME_NOT_FOUND: Game ID '${gameId}' is not registered in GamerZ Hub`, 404);
    }
    if (!config.enabled) {
      throw new AppError(`GAME_DISABLED: Game '${config.displayName}' is currently disabled`, 400);
    }
    return config;
  }

  /**
   * Validate Game Profile Inputs according to canonical game fields
   */
  validateProfileFields(config: GameCapabilityConfig, identityData: Record<string, any>) {
    for (const field of config.fields) {
      if (field.required && (!identityData || !identityData[field.name])) {
        throw new AppError(`INVALID_GAME_IDENTITY: Missing required field '${field.label}' for ${config.displayName}`, 400);
      }
    }
  }

  /**
   * Upsert user game profile in database
   */
  async upsertGameProfile(userId: string, gameId: string, input: UpsertGameProfileInput) {
    const config = this.getGameConfig(gameId);
    this.validateProfileFields(config, input.identityData);

    const isOfficialApi = config.identityType === 'OFFICIAL_API';

    const profile = await (prisma as any).gameProfile.upsert({
      where: { userId_gameId: { userId, gameId: config.gameId } },
      create: {
        userId,
        gameId: config.gameId,
        identityData: input.identityData,
        rank: input.rank || 'UNRANKED',
        playstyle: input.playstyle || 'BALANCED',
        language: input.language || 'ENGLISH',
        micPreference: input.micPreference !== undefined ? input.micPreference : true,
        availability: input.availability || 'EVENING',
        isVerified: isOfficialApi, // Only verified if official API adapter exists
        identityType: config.identityType,
      },
      update: {
        identityData: input.identityData,
        rank: input.rank,
        playstyle: input.playstyle,
        language: input.language,
        micPreference: input.micPreference,
        availability: input.availability,
        isVerified: isOfficialApi,
        identityType: config.identityType,
      },
    });

    // Write-through sync to Appwrite Read Model
    appwriteService.syncGameProfile(profile).catch((err) => {
      console.warn('Background Appwrite sync error:', err);
    });

    return profile;
  }

  /**
   * Get game profile for user
   */
  async getGameProfile(userId: string, gameId: string) {
    const config = this.getGameConfig(gameId);
    return (prisma as any).gameProfile.findUnique({
      where: { userId_gameId: { userId, gameId: config.gameId } },
      include: {
        user: { select: { id: true, profile: { select: { username: true, displayName: true, avatar: true } } } },
      },
    });
  }

  /**
   * Discover teammates using explainable scoring
   */
  async discoverTeammates(userId: string, gameId: string, filters: { rank?: string; playstyle?: string; limit?: number }) {
    const config = this.getGameConfig(gameId);
    const myProfile = await this.getGameProfile(userId, config.gameId);

    // Attempt to query high-read discovery load from Appwrite Read Model first
    let candidates = await appwriteService.getTeammatesFromReadModel(config.gameId, userId, filters);

    // Fallback to PostgreSQL/Prisma if Appwrite is unconfigured or returned null
    if (!candidates) {
      candidates = await (prisma as any).gameProfile.findMany({
        where: {
          gameId: config.gameId,
          userId: { not: userId },
          ...(filters.rank ? { rank: filters.rank } : {}),
          ...(filters.playstyle ? { playstyle: filters.playstyle } : {}),
        },
        take: filters.limit || 20,
        include: {
          user: { select: { id: true, profile: { select: { username: true, displayName: true, avatar: true } } } },
        },
      });
    }

    return candidates.map((candidate: any) => {
      const scoring = this.calculateCompatibility(myProfile, candidate);
      return {
        profile: candidate,
        compatibility: scoring.score,
        reasons: scoring.reasons,
        identityType: candidate.identityType,
        isVerified: candidate.isVerified,
      };
    }).sort((a: any, b: any) => b.compatibility - a.compatibility);
  }

  /**
   * Explainable compatibility calculation
   */
  calculateCompatibility(userA: any, userB: any) {
    let score = 50;
    const reasons: string[] = [];

    if (!userA) {
      return { score: 50, reasons: ['Base Compatibility'] };
    }

    if (userA.language && userB.language && userA.language.toUpperCase() === userB.language.toUpperCase()) {
      score += 20;
      reasons.push(`Speaks ${userB.language}`);
    }

    if (userA.playstyle && userB.playstyle && userA.playstyle.toUpperCase() === userB.playstyle.toUpperCase()) {
      score += 15;
      reasons.push(`Matching ${userB.playstyle} playstyle`);
    }

    if (userA.micPreference === userB.micPreference) {
      score += 10;
      reasons.push(userB.micPreference ? 'Uses Mic' : 'No-Mic Preferred');
    }

    if (userA.availability && userB.availability && userA.availability.toUpperCase() === userB.availability.toUpperCase()) {
      score += 15;
      reasons.push(`Available ${userB.availability}`);
    }

    if (userB.reputationScore >= 4.5) {
      score += 10;
      reasons.push(`High Trust Score (${userB.reputationScore.toFixed(1)}⭐)`);
    }

    return {
      score: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['General Gamer Match'],
    };
  }

  /**
   * Create a Game Session with honest join capability handoff
   */
  async createSession(hostId: string, input: CreateGameSessionInput) {
    const config = this.getGameConfig(input.gameId);

    const profile = await (prisma as any).gameProfile.findUnique({
      where: { userId_gameId: { userId: hostId, gameId: config.gameId } },
    });

    if (!profile) {
      throw new AppError(`GAME_PROFILE_REQUIRED: You must create a ${config.displayName} profile before hosting a session`, 400);
    }

    const session = await (prisma as any).gameSession.create({
      data: {
        gameId: config.gameId,
        hostId,
        mode: input.mode,
        title: input.title || `${config.displayName} Squad Session`,
        roomCode: input.roomCode,
        roomPassword: input.roomPassword,
        joinUrl: input.joinUrl,
        maxParticipants: input.maxParticipants || (config.teamModel === 'DUO' ? 2 : 4),
        participants: { create: { userId: hostId } },
      },
      include: {
        host: { select: { id: true, profile: true } },
        participants: { include: { user: { select: { id: true, profile: true } } } },
      },
    });

    return {
      session,
      joinInstructions: this.getJoinInstructions(config, session),
    };
  }

  /**
   * Generate honest Join Instructions based on capability matrix
   */
  getJoinInstructions(config: GameCapabilityConfig, session: any) {
    return {
      joinCapability: config.joinCapability,
      externalLaunchRequirement: config.externalLaunchRequirement,
      instructions: config.joinInstructions,
      roomCode: session.roomCode || null,
      roomPassword: session.roomPassword || null,
      joinUrl: session.joinUrl || null,
      isNativeJoinSupported: config.joinCapability === 'NATIVE_DEEPLINK',
    };
  }

  /**
   * Submit Join Request
   */
  async sendJoinRequest(senderId: string, sessionId: string, message?: string) {
    const session = await (prisma as any).gameSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new AppError('SESSION_NOT_FOUND: Session does not exist', 404);
    }

    if (session.status !== 'OPEN') {
      throw new AppError('SESSION_CLOSED: This session is no longer accepting join requests', 400);
    }

    if (session.hostId === senderId) {
      throw new AppError('UNAUTHORIZED_SESSION_ACTION: You are the host of this session', 400);
    }

    const isMember = session.participants.some((p: any) => p.userId === senderId);
    if (isMember) {
      throw new AppError('ALREADY_PARTICIPANT: You are already a member of this session', 400);
    }

    const existingRequest = await (prisma as any).gameJoinRequest.findFirst({
      where: { sessionId, senderId, status: 'PENDING' },
    });

    if (existingRequest) {
      throw new AppError('REQUEST_ALREADY_EXISTS: You already have a pending join request for this session', 400);
    }

    return (prisma as any).gameJoinRequest.create({
      data: {
        sessionId,
        senderId,
        receiverId: session.hostId,
        message,
        status: 'PENDING',
      },
    });
  }

  /**
   * Accept or decline join request
   */
  async handleJoinRequest(requestId: string, hostId: string, action: 'ACCEPT' | 'DECLINE') {
    const request = await (prisma as any).gameJoinRequest.findUnique({
      where: { id: requestId },
      include: { session: { include: { participants: true } } },
    });

    if (!request) {
      throw new AppError('REQUEST_NOT_FOUND: Join request not found', 404);
    }

    if (request.receiverId !== hostId) {
      throw new AppError('UNAUTHORIZED_SESSION_ACTION: Only the session host can manage join requests', 403);
    }

    if (action === 'DECLINE') {
      return (prisma as any).gameJoinRequest.update({
        where: { id: requestId },
        data: { status: 'DECLINED' },
      });
    }

    // Accept request & add participant
    await (prisma as any).gameSessionParticipant.create({
      data: {
        sessionId: request.sessionId,
        userId: request.senderId,
      },
    });

    return (prisma as any).gameJoinRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * Complete Session & Rate Teammate
   */
  async rateSessionParticipant(sessionId: string, raterId: string, ratedUserId: string, rating: number, feedback?: string) {
    if (raterId === ratedUserId) {
      throw new AppError('UNAUTHORIZED_RATING: Self-rating is strictly prohibited', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('INVALID_RATING: Rating must be between 1 and 5', 400);
    }

    const session = await (prisma as any).gameSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new AppError('SESSION_NOT_FOUND: Session not found', 404);
    }

    const isRaterParticipant = session.participants.some((p: any) => p.userId === raterId);
    const isRatedParticipant = session.participants.some((p: any) => p.userId === ratedUserId);

    if (!isRaterParticipant || !isRatedParticipant) {
      throw new AppError('UNAUTHORIZED_RATING: Only participants of this session can rate each other', 403);
    }

    // Upsert rating
    const sessionRating = await (prisma as any).gameSessionRating.upsert({
      where: {
        sessionId_raterId_ratedUserId: { sessionId, raterId, ratedUserId },
      },
      create: { sessionId, raterId, ratedUserId, rating, feedback },
      update: { rating, feedback },
    });

    // Update overall reputation on gameProfile
    const allRatings = await (prisma as any).gameSessionRating.findMany({
      where: { ratedUserId },
      select: { rating: true },
    });

    const avgRating = allRatings.reduce((acc: number, r: any) => acc + r.rating, 0) / allRatings.length;

    await (prisma as any).gameProfile.updateMany({
      where: { userId: ratedUserId, gameId: session.gameId },
      data: {
        reputationScore: parseFloat(avgRating.toFixed(2)),
        completedSessions: { increment: 1 },
      },
    });

    return sessionRating;
  }
}

export const gameAdapterService = new GameAdapterService();
