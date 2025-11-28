/**
 * In-memory challenge store for WebAuthn authentication.
 * Challenges are stored temporarily and expire after 5 minutes.
 */

type StoredChallenge = {
  challenge: string;
  userId: string;
  createdAt: number;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const challengeStore = new Map<string, StoredChallenge>();

/**
 * Store a challenge for a user
 */
export const storeChallenge = (userId: string, challenge: string): void => {
  cleanupExpiredChallenges();
  challengeStore.set(userId, {
    challenge,
    userId,
    createdAt: Date.now(),
  });
};

/**
 * Consume and delete a challenge for a user (one-time use)
 */
export const consumeChallenge = (userId: string): string | null => {
  cleanupExpiredChallenges();

  const stored = challengeStore.get(userId);
  if (!stored) {
    return null;
  }

  const now = Date.now();
  if (now - stored.createdAt > CHALLENGE_TTL_MS) {
    challengeStore.delete(userId);
    return null;
  }

  challengeStore.delete(userId);
  return stored.challenge;
};

/**
 * Clean up expired challenges
 */
export const cleanupExpiredChallenges = (): void => {
  const now = Date.now();
  for (const [userId, stored] of challengeStore.entries()) {
    if (now - stored.createdAt > CHALLENGE_TTL_MS) {
      challengeStore.delete(userId);
    }
  }
};

/**
 * Clear all challenges (for testing)
 */
export const clearChallenges = (): void => {
  challengeStore.clear();
};
