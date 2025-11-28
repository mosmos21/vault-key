import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  storeChallenge,
  consumeChallenge,
  cleanupExpiredChallenges,
  clearChallenges,
} from '@core/passkey/challengeStore';

describe('challengeStore', () => {
  beforeEach(() => {
    clearChallenges();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('storeChallenge / consumeChallenge', () => {
    it('should store and consume a challenge', () => {
      const userId = 'test-user';
      const challenge = 'test-challenge-123';

      storeChallenge(userId, challenge);
      const result = consumeChallenge(userId);

      expect(result).toBe(challenge);
    });

    it('should return null when consuming non-existent challenge', () => {
      const result = consumeChallenge('non-existent-user');

      expect(result).toBeNull();
    });

    it('should delete challenge after consumption (one-time use)', () => {
      const userId = 'test-user';
      const challenge = 'test-challenge-123';

      storeChallenge(userId, challenge);
      consumeChallenge(userId);
      const result = consumeChallenge(userId);

      expect(result).toBeNull();
    });

    it('should overwrite existing challenge for same user', () => {
      const userId = 'test-user';
      const challenge1 = 'challenge-1';
      const challenge2 = 'challenge-2';

      storeChallenge(userId, challenge1);
      storeChallenge(userId, challenge2);
      const result = consumeChallenge(userId);

      expect(result).toBe(challenge2);
    });

    it('should handle multiple users independently', () => {
      storeChallenge('user1', 'challenge-1');
      storeChallenge('user2', 'challenge-2');

      const result1 = consumeChallenge('user1');
      const result2 = consumeChallenge('user2');

      expect(result1).toBe('challenge-1');
      expect(result2).toBe('challenge-2');
    });
  });

  describe('challenge expiration', () => {
    it('should return null for expired challenge', () => {
      const userId = 'test-user';
      const challenge = 'test-challenge';

      storeChallenge(userId, challenge);

      // Advance time by 6 minutes (challenge TTL is 5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const result = consumeChallenge(userId);

      expect(result).toBeNull();
    });

    it('should return challenge before expiration', () => {
      const userId = 'test-user';
      const challenge = 'test-challenge';

      storeChallenge(userId, challenge);

      // Advance time by 4 minutes (less than 5 minute TTL)
      vi.advanceTimersByTime(4 * 60 * 1000);

      const result = consumeChallenge(userId);

      expect(result).toBe(challenge);
    });
  });

  describe('cleanupExpiredChallenges', () => {
    it('should remove expired challenges', () => {
      storeChallenge('user1', 'challenge-1');

      // Advance time past expiration
      vi.advanceTimersByTime(6 * 60 * 1000);

      storeChallenge('user2', 'challenge-2');

      cleanupExpiredChallenges();

      expect(consumeChallenge('user1')).toBeNull();
      expect(consumeChallenge('user2')).toBe('challenge-2');
    });
  });

  describe('clearChallenges', () => {
    it('should remove all challenges', () => {
      storeChallenge('user1', 'challenge-1');
      storeChallenge('user2', 'challenge-2');

      clearChallenges();

      expect(consumeChallenge('user1')).toBeNull();
      expect(consumeChallenge('user2')).toBeNull();
    });
  });
});
