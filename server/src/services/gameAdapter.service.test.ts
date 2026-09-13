import { gameAdapterService } from './gameAdapter.service';
import { CANONICAL_GAMES_REGISTRY, getAllCanonicalGames } from '../config/gamesRegistry';

describe('GameAdapterService 15-Game Matrix', () => {
  const ALL_15_GAMES = [
    'bgmi',
    'clashofclans',
    'pubg_mobile',
    'freefire',
    'smashkarts',
    'codm',
    'roblox',
    'minecraft',
    'ludoking',
    'eightballpool',
    'brawlstars',
    'clashroyale',
    'realcricket',
    'efootball',
    'drdriving',
  ];

  it('should verify that all 15 canonical games exist in the registry', () => {
    const games = getAllCanonicalGames();
    expect(games.length).toBe(15);
    const gameIds = games.map(g => g.gameId);
    ALL_15_GAMES.forEach(id => {
      expect(gameIds).toContain(id);
    });
  });

  it('should enforce distinct game IDs for BGMI and PUBG Mobile', () => {
    const bgmi = CANONICAL_GAMES_REGISTRY['bgmi'];
    const pubgMobile = CANONICAL_GAMES_REGISTRY['pubg_mobile'];

    expect(bgmi).toBeDefined();
    expect(pubgMobile).toBeDefined();
    expect(bgmi.gameId).not.toBe(pubgMobile.gameId);
    expect(bgmi.displayName).toBe('BGMI');
    expect(pubgMobile.displayName).toBe('PUBG Mobile');
  });

  describe.each(ALL_15_GAMES)('Game Adapter Validation: %s', (gameId) => {
    it(`should validate enabled state for ${gameId}`, () => {
      const config = gameAdapterService.validateGameEnabled(gameId);
      expect(config.gameId).toBe(gameId);
      expect(config.enabledState).toBe(true);
    });

    it(`should validate game profile fields for ${gameId}`, () => {
      const config = CANONICAL_GAMES_REGISTRY[gameId];
      if (config.requiredProfileFields.length > 0) {
        const mockValidProfile: Record<string, string> = {};
        config.requiredProfileFields.forEach(field => {
          mockValidProfile[field] = 'valid_test_value';
        });
        expect(gameAdapterService.validateGameProfile(gameId, mockValidProfile)).toBe(true);

        expect(() => {
          gameAdapterService.validateGameProfile(gameId, {});
        }).toThrow();
      } else {
        expect(gameAdapterService.validateGameProfile(gameId, {})).toBe(true);
      }
    });

    it(`should produce valid join instructions for ${gameId}`, () => {
      const instructions = gameAdapterService.produceJoinInstructions(gameId, {
        roomCode: '123456',
        roomPassword: 'pass',
        partyUrl: 'https://smashkarts.io/party/123',
      });

      expect(instructions.gameId).toBe(gameId);
      expect(instructions.instructions).toBeDefined();

      if (gameId === 'drdriving') {
        expect(instructions.joinCapability).toBe('UNSUPPORTED');
      } else if (['smashkarts', 'roblox'].includes(gameId)) {
        expect(instructions.joinCapability).toBe('NATIVE_LINK');
        expect(instructions.actionableUrl).toBe('https://smashkarts.io/party/123');
      } else if (['bgmi', 'pubg_mobile', 'freefire', 'codm', 'ludoking', 'realcricket', 'efootball'].includes(gameId)) {
        expect(instructions.joinCapability).toBe('ROOM_CODE');
      } else {
        expect(instructions.joinCapability).toBe('MANUAL_HANDOFF');
      }
    });
  });

  it('should prevent session creation for Dr. Driving with UNSUPPORTED join capability', async () => {
    await expect(
      gameAdapterService.createOrFindSession({
        hostId: 'user_1',
        gameId: 'drdriving',
        mode: 'Single Player',
      })
    ).rejects.toThrow('Dr. Driving is a single-player game and cannot host multiplayer sessions.');
  });

  it('should allow session creation for supported games like Free Fire MAX', async () => {
    const session = await gameAdapterService.createOrFindSession({
      hostId: 'user_1',
      gameId: 'freefire',
      mode: 'BR Squad',
      roomCode: '987654',
    });

    expect(session.gameId).toBe('freefire');
    expect(session.roomCode).toBe('987654');
    expect(session.status).toBe('OPEN');
  });

  it('should send join requests and transition session state correctly', async () => {
    const req = await gameAdapterService.sendInviteOrJoinRequest({
      sessionId: 'session_123',
      senderId: 'user_2',
      message: 'Can I join your squad?',
    });

    expect(req.sessionId).toBe('session_123');
    expect(req.status).toBe('PENDING');

    const accepted = await gameAdapterService.acceptJoin('freefire', req.id);
    expect(accepted.status).toBe('ACCEPTED');

    const completed = await gameAdapterService.completeSession('session_123');
    expect(completed.status).toBe('COMPLETED');
  });

  it('should reject self-ratings and handle valid ratings', async () => {
    await expect(
      gameAdapterService.createPostSessionRating('user_1', 'user_1', 5)
    ).rejects.toThrow('Self-rating is strictly prohibited');

    const rating = await gameAdapterService.createPostSessionRating('user_1', 'user_2', 5, 'Great teamwork!');
    expect(rating.rating).toBe(5);
    expect(rating.ratedUserId).toBe('user_2');
  });
});
