import { appwriteService } from './appwrite.service';

describe('AppwriteService Unit Tests', () => {
  it('should initialize gracefully even if Appwrite credentials are not set', () => {
    expect(appwriteService).toBeDefined();
    expect(typeof appwriteService.getIsConfigured()).toBe('boolean');
  });

  it('should handle document sync gracefully when Appwrite is unconfigured', async () => {
    const mockProfile = {
      userId: 'user-123',
      gameId: 'freefiremax',
      rank: 'HEROIC',
      playstyle: 'AGGRESSIVE',
      language: 'ENGLISH',
      micPreference: true,
      availability: 'EVENING',
      reputationScore: 4.8,
      completedSessions: 12,
      isVerified: false,
      identityType: 'SELF_REPORTED',
      identityData: { uid: '123456789' },
    };

    const synced = await appwriteService.syncGameProfile(mockProfile);
    expect(typeof synced).toBe('boolean');
  });

  it('should return null when reading teammates from unconfigured Appwrite', async () => {
    const candidates = await appwriteService.getTeammatesFromReadModel('freefiremax', 'user-123', {});
    // When unconfigured, it returns null to trigger seamless PostgreSQL fallback
    if (!appwriteService.getIsConfigured()) {
      expect(candidates).toBeNull();
    }
  });
});
