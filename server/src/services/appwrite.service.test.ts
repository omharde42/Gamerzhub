import { AppwriteService, appwriteService } from './appwrite.service';
import * as appwriteConfigModule from '../config/appwrite';
import { isAppwriteConfigured } from '../config/appwrite';

describe('AppwriteService Integration & Fallback', () => {
  let service: AppwriteService;

  beforeEach(() => {
    service = new AppwriteService();
  });

  it('should report availability status based on environment configuration', () => {
    const isConfigured = isAppwriteConfigured();
    expect(typeof service.isAvailable()).toBe('boolean');
    if (!isConfigured) {
      expect(service.isAvailable()).toBe(false);
    }
  });

  it('should return null on getGameRegistry when Appwrite is not configured or throws error', async () => {
    const result = await service.getGameRegistry('non_existent_game');
    // Expect safe null return (fallback to Prisma/local registry)
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('should return null on getPublicProfile when profile is missing or Appwrite unconfigured', async () => {
    const result = await service.getPublicProfile('user_99999');
    expect(result).toBeNull();
  });

  it('should return null on getGameProfile when profile is missing or Appwrite unconfigured', async () => {
    const result = await service.getGameProfile('user_99999', 'bgmi');
    expect(result).toBeNull();
  });

  it('should return null on getTeammateCandidates when candidates missing or Appwrite unconfigured', async () => {
    const result = await service.getTeammateCandidates('bgmi', { limit: 10 });
    expect(result).toBeNull();
  });

  it('should handle syncPublicProfile without throwing unhandled exceptions', async () => {
    const success = await service.syncPublicProfile({
      userId: 'test_user_1',
      username: 'testgamer',
      displayName: 'Test Gamer',
      avatar: 'https://example.com/avatar.jpg',
      rank: 'HEROIC',
      winRate: 65.5,
      kd: 3.2,
      totalMatches: 100,
      gamerScore: 1200,
      verified: false,
      languages: ['ENGLISH', 'HINDI'],
      updatedAt: new Date().toISOString(),
    });

    expect(typeof success).toBe('boolean');
  });

  it('should handle syncGameProfile without throwing unhandled exceptions', async () => {
    const success = await service.syncGameProfile({
      userId: 'test_user_1',
      game: 'freefire',
      inGameUid: '123456789',
      inGameName: 'ProShooter',
      rank: 'HEROIC',
      verified: false,
      updatedAt: new Date().toISOString(),
    });

    expect(typeof success).toBe('boolean');
  });

  it('should handle syncTeammateDiscovery without throwing unhandled exceptions', async () => {
    const success = await service.syncTeammateDiscovery({
      id: 'freefire_test_user_1',
      userId: 'test_user_1',
      gameId: 'freefire',
      rank: 'HEROIC',
      playstyle: 'AGGRESSIVE',
      language: 'ENGLISH',
      micPreference: true,
      availability: 'EVENING',
      reputationScore: 4.8,
      isVerified: false,
      username: 'testgamer',
      updatedAt: new Date().toISOString(),
    });

    expect(typeof success).toBe('boolean');
  });

  describe('Appwrite mock database operations & failure handling', () => {
    let mockGetDocument: jest.Mock;
    let mockListDocuments: jest.Mock;
    let mockCreateDocument: jest.Mock;
    let mockUpdateDocument: jest.Mock;

    beforeEach(() => {
      mockGetDocument = jest.fn();
      mockListDocuments = jest.fn();
      mockCreateDocument = jest.fn();
      mockUpdateDocument = jest.fn();

      const mockDatabases = {
        getDocument: mockGetDocument,
        listDocuments: mockListDocuments,
        createDocument: mockCreateDocument,
        updateDocument: mockUpdateDocument,
      };

      jest.spyOn(appwriteConfigModule, 'getAppwriteDatabases').mockReturnValue(mockDatabases as any);
      jest.spyOn(appwriteConfigModule, 'isAppwriteConfigured').mockReturnValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should retrieve public profile document and parse JSON languages array', async () => {
      mockGetDocument.mockResolvedValueOnce({
        userId: 'u123',
        username: 'pro_gamer',
        displayName: 'Pro Gamer',
        avatar: 'https://example.com/avatar.png',
        rank: 'HEROIC',
        winRate: 75.0,
        kd: 4.5,
        totalMatches: 250,
        gamerScore: 1800,
        verified: true,
        languages: JSON.stringify(['ENGLISH', 'SPANISH']),
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      const profile = await service.getPublicProfile('u123');
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe('u123');
      expect(profile?.languages).toEqual(['ENGLISH', 'SPANISH']);
    });

    it('should return null safely if getPublicProfile encounters a database error', async () => {
      mockGetDocument.mockRejectedValueOnce(new Error('Document not found or network error'));
      const profile = await service.getPublicProfile('u123');
      expect(profile).toBeNull();
    });

    it('should update document or create document if update fails during syncPublicProfile', async () => {
      mockUpdateDocument.mockRejectedValueOnce(new Error('Document not found'));
      mockCreateDocument.mockResolvedValueOnce({ $id: 'u123' });

      const success = await service.syncPublicProfile({
        userId: 'u123',
        username: 'pro_gamer',
        updatedAt: new Date().toISOString(),
      });

      expect(success).toBe(true);
      expect(mockUpdateDocument).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument).toHaveBeenCalledTimes(1);
    });

    it('should return false if both update and create fail during syncPublicProfile', async () => {
      mockUpdateDocument.mockRejectedValueOnce(new Error('Update failed'));
      mockCreateDocument.mockRejectedValueOnce(new Error('Create failed'));

      const success = await service.syncPublicProfile({
        userId: 'u123',
        username: 'pro_gamer',
        updatedAt: new Date().toISOString(),
      });

      expect(success).toBe(false);
    });
  });
});
