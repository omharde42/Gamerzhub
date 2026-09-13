import { freeFireService } from './freefire.service';

describe('FreeFireService - Compatibility Scoring Logic', () => {
  it('should calculate high compatibility when language, playstyle, mic, and availability match', () => {
    const userA = {
      language: 'ENGLISH',
      playstyle: 'AGGRESSIVE',
      micPreference: true,
      availability: 'EVENING',
    };

    const userB = {
      language: 'ENGLISH',
      playstyle: 'AGGRESSIVE',
      micPreference: true,
      availability: 'EVENING',
      reputationScore: 4.8,
    };

    const match = freeFireService.calculateCompatibility(userA, userB);

    expect(match.score).toBe(100); // 50 + 20 (lang) + 15 (playstyle) + 10 (mic) + 15 (avail) + 10 (rep) capped at 100
    expect(match.reasons).toContain('Speaks ENGLISH');
    expect(match.reasons).toContain('Matching AGGRESSIVE playstyle');
    expect(match.reasons).toContain('Uses Microphone');
    expect(match.reasons).toContain('Available EVENING');
  });

  it('should handle partial compatibility gracefully', () => {
    const userA = {
      language: 'ENGLISH',
      playstyle: 'DEFENSIVE',
      micPreference: false,
      availability: 'WEEKENDS',
    };

    const userB = {
      language: 'ENGLISH',
      playstyle: 'AGGRESSIVE',
      micPreference: false,
      availability: 'EVENING',
      reputationScore: 3.5,
    };

    const match = freeFireService.calculateCompatibility(userA, userB);

    expect(match.score).toBe(80); // 50 + 20 (lang) + 10 (mic) = 80
    expect(match.reasons).toContain('Speaks ENGLISH');
    expect(match.reasons).toContain('No-Mic Preferred');
    expect(match.reasons).not.toContain('Matching AGGRESSIVE playstyle');
  });
});
