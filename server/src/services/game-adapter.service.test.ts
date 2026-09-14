import { CANONICAL_GAMES_REGISTRY } from '../config/gamesRegistry';
import { gameAdapterService } from './game-adapter.service';

describe('Canonical 15-Game Architecture & Registry Tests', () => {
  const gamesList = Object.keys(CANONICAL_GAMES_REGISTRY);

  it('should contain exactly 15 canonical games in the registry', () => {
    expect(gamesList.length).toBe(15);
    expect(gamesList).toEqual([
      'bgmi',
      'clashofclans',
      'pubgmobile',
      'freefiremax',
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
    ]);
  });

  it.each(gamesList)('should retrieve valid game config for %s', (gameId) => {
    const config = gameAdapterService.getGameConfig(gameId);
    expect(config).toBeDefined();
    expect(config.gameId).toBe(gameId);
    expect(config.enabled).toBe(true);
    expect(config.displayName).toBeTruthy();
    expect(config.joinInstructions).toBeTruthy();
  });

  it('should strictly separate BGMI and PUBG Mobile as independent game IDs', () => {
    const bgmi = gameAdapterService.getGameConfig('bgmi');
    const pubg = gameAdapterService.getGameConfig('pubgmobile');

    expect(bgmi.gameId).toBe('bgmi');
    expect(pubg.gameId).toBe('pubgmobile');
    expect(bgmi.displayName).not.toEqual(pubg.displayName);
  });

  it.each(gamesList)('should correctly produce join instructions for %s', (gameId) => {
    const config = gameAdapterService.getGameConfig(gameId);
    const mockSession = {
      roomCode: 'TEST1234',
      roomPassword: 'KEY9',
      joinUrl: 'https://gamerzhub.gg/join',
    };

    const instructions = gameAdapterService.getJoinInstructions(config, mockSession);
    expect(instructions.joinCapability).toBe(config.joinCapability);
    expect(instructions.externalLaunchRequirement).toBe(config.externalLaunchRequirement);
    expect(instructions.instructions).toBe(config.joinInstructions);
  });

  it('should reject non-existent game IDs with GAME_NOT_FOUND', () => {
    expect(() => {
      gameAdapterService.getGameConfig('invalid_unknown_game');
    }).toThrow('GAME_NOT_FOUND');
  });

  it('should calculate explainable compatibility scores', () => {
    const userA = { language: 'ENGLISH', playstyle: 'AGGRESSIVE', micPreference: true, availability: 'EVENING' };
    const userB = { language: 'ENGLISH', playstyle: 'AGGRESSIVE', micPreference: true, availability: 'EVENING', reputationScore: 4.9 };

    const score = gameAdapterService.calculateCompatibility(userA, userB);
    expect(score.score).toBe(100);
    expect(score.reasons).toContain('Speaks ENGLISH');
    expect(score.reasons).toContain('Matching AGGRESSIVE playstyle');
  });
});
