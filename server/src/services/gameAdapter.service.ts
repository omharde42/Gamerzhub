import { CANONICAL_GAMES_REGISTRY, GameRegistryEntry, getCanonicalGame } from '../config/gamesRegistry';
import { AppError } from '../utils/errors';
import prisma from '../config/database';
import { appwriteService } from './appwrite.service';

export interface GameSessionParams {
  hostId: string;
  gameId: string;
  mode: string;
  title?: string;
  roomCode?: string;
  roomPassword?: string;
  partyUrl?: string;
  maxPlayers?: number;
}

export interface JoinRequestParams {
  sessionId: string;
  senderId: string;
  message?: string;
}

export class GameAdapterService {
  /**
   * 1. validateGameEnabled
   */
  validateGameEnabled(gameId: string): GameRegistryEntry {
    const game = getCanonicalGame(gameId);
    if (!game) {
      throw new AppError(`Game not found: ${gameId}`, 404, 'GAME_NOT_FOUND');
    }
    if (!game.enabledState) {
      throw new AppError(`Game is currently disabled: ${game.displayName}`, 400, 'GAME_DISABLED');
    }
    return game;
  }

  /**
   * 2. validateGameProfile
   */
  validateGameProfile(gameId: string, profileData: Record<string, any>): boolean {
    const game = this.validateGameEnabled(gameId);
    for (const field of game.requiredProfileFields) {
      if (!profileData || !profileData[field] || String(profileData[field]).trim() === '') {
        throw new AppError(
          `Missing required profile field '${field}' for ${game.displayName}`,
          400,
          'INVALID_GAME_IDENTITY'
        );
      }
    }
    return true;
  }

  /**
   * 3. validateSessionType
   */
  validateSessionType(gameId: string, sessionType: string): boolean {
    const game = this.validateGameEnabled(gameId);
    if (game.joinCapability === 'UNSUPPORTED') {
      throw new AppError(
        `${game.displayName} does not support multiplayer session joining`,
        400,
        'GAME_CAPABILITY_UNSUPPORTED'
      );
    }
    return true;
  }

  /**
   * 4. createOrFindSession
   */
  async createOrFindSession(params: GameSessionParams) {
    const game = this.validateGameEnabled(params.gameId);

    if (game.joinCapability === 'UNSUPPORTED') {
      throw new AppError(
        `${game.displayName} is a single-player game and cannot host multiplayer sessions.`,
        400,
        'JOIN_NOT_AVAILABLE'
      );
    }

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameId: game.gameId,
      hostId: params.hostId,
      mode: params.mode || game.modes[0] || 'Default',
      title: params.title || `${game.displayName} Session`,
      roomCode: params.roomCode || null,
      roomPassword: params.roomPassword || null,
      partyUrl: params.partyUrl || null,
      maxPlayers: params.maxPlayers || (game.teamModel === 'SOLO' ? 2 : 4),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 5. sendInviteOrJoinRequest
   */
  async sendInviteOrJoinRequest(params: JoinRequestParams) {
    if (!params.sessionId) {
      throw new AppError('Session ID is required', 400, 'SESSION_NOT_FOUND');
    }
    return {
      id: `request_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: params.sessionId,
      senderId: params.senderId,
      message: params.message || 'Hey, let\'s team up!',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 6. acceptJoin
   */
  async acceptJoin(gameId: string, requestId: string) {
    this.validateGameEnabled(gameId);
    return {
      requestId,
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
    };
  }

  /**
   * 7. produceJoinInstructions
   */
  produceJoinInstructions(gameId: string, sessionData: any) {
    const game = this.validateGameEnabled(gameId);

    if (game.joinCapability === 'UNSUPPORTED') {
      return {
        gameId: game.gameId,
        joinCapability: 'UNSUPPORTED',
        instructions: game.externalLaunchNote || 'No multiplayer joining available for this title.',
        actionableUrl: null,
        manualHandoffRequired: false,
      };
    }

    if (game.joinCapability === 'NATIVE_LINK' && sessionData?.partyUrl) {
      return {
        gameId: game.gameId,
        joinCapability: 'NATIVE_LINK',
        instructions: `Click the link to join the ${game.displayName} party lobby immediately.`,
        actionableUrl: sessionData.partyUrl,
        manualHandoffRequired: false,
      };
    }

    if (game.joinCapability === 'ROOM_CODE' && sessionData?.roomCode) {
      return {
        gameId: game.gameId,
        joinCapability: 'ROOM_CODE',
        instructions: `1. Open ${game.displayName}.\n2. Select Private/Custom Room mode.\n3. Enter Room ID: ${sessionData.roomCode} ${sessionData.roomPassword ? `and Password: ${sessionData.roomPassword}` : ''}.`,
        roomCode: sessionData.roomCode,
        roomPassword: sessionData.roomPassword || null,
        manualHandoffRequired: true,
      };
    }

    return {
      gameId: game.gameId,
      joinCapability: 'MANUAL_HANDOFF',
      instructions: game.externalLaunchNote || `Connect with host in ${game.displayName} using in-game ID/player tag.`,
      manualHandoffRequired: true,
    };
  }

  /**
   * 8. transitionSessionState
   */
  async transitionSessionState(sessionId: string, newState: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
    return {
      sessionId,
      status: newState,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 9. completeSession
   */
  async completeSession(sessionId: string) {
    return this.transitionSessionState(sessionId, 'COMPLETED');
  }

  /**
   * 10. createPostSessionRating
   */
  async createPostSessionRating(raterId: string, ratedUserId: string, rating: number, feedback?: string) {
    if (raterId === ratedUserId) {
      throw new AppError('Self-rating is strictly prohibited', 400, 'UNAUTHORIZED_SESSION_ACTION');
    }
    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5 stars', 400, 'INVALID_GAME_IDENTITY');
    }
    return {
      raterId,
      ratedUserId,
      rating,
      feedback: feedback || null,
      createdAt: new Date().toISOString(),
    };
  }
}

export const gameAdapterService = new GameAdapterService();
