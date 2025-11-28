import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createConnection, closeConnection, createUser } from '@core/database';
import {
  issueToken,
  verifyToken,
  invalidateToken,
} from '@core/auth/tokenManager';
import {
  saveSecret,
  retrieveSecret,
  removeSecret,
  listAllSecrets,
} from '@core/secrets';
import { generateMasterKey } from '@core/crypto/encryption';
import { AuthenticationError, NotFoundError } from '@core/utils/errors';

describe('Integration Tests', () => {
  let db: DatabaseSync;
  let masterKey: string;
  const tokenTtl = 3600;
  const maxTokensPerUser = 5;

  beforeEach(() => {
    db = createConnection(':memory:');
    masterKey = generateMasterKey();
  });

  afterEach(() => {
    closeConnection(db);
  });

  describe('Complete user flow', () => {
    it('should support complete flow: register -> login -> save secret -> retrieve secret', () => {
      const userId = 'test-user';
      const secretKey = 'api-key';
      const secretValue = 'super-secret-value';

      createUser(db, { userId });

      const { token } = issueToken(db, userId, tokenTtl, maxTokensPerUser);

      const verifiedUserId = verifyToken(db, token);
      expect(verifiedUserId).toBe(userId);

      saveSecret(db, verifiedUserId, secretKey, secretValue, masterKey);

      const retrieved = retrieveSecret(
        db,
        verifiedUserId,
        secretKey,
        masterKey,
      );
      expect(retrieved.value).toBe(secretValue);
    });

    it('should support multiple secrets for a user', () => {
      const userId = 'test-user';
      const secrets = [
        { key: 'api-key-1', value: 'value-1' },
        { key: 'api-key-2', value: 'value-2' },
        { key: 'password', value: 'my-password' },
      ];

      createUser(db, { userId });
      const { token } = issueToken(db, userId, tokenTtl, maxTokensPerUser);
      const verifiedUserId = verifyToken(db, token);

      secrets.forEach(({ key, value }) => {
        saveSecret(db, verifiedUserId, key, value, masterKey);
      });

      const listed = listAllSecrets(db, verifiedUserId);
      expect(listed).toHaveLength(3);

      secrets.forEach(({ key, value }) => {
        const retrieved = retrieveSecret(db, verifiedUserId, key, masterKey);
        expect(retrieved.value).toBe(value);
      });
    });
  });

  describe('Token invalidation', () => {
    it('should prevent access after token invalidation', () => {
      const userId = 'test-user';
      const secretKey = 'api-key';
      const secretValue = 'secret-value';

      createUser(db, { userId });
      const { token } = issueToken(db, userId, tokenTtl, maxTokensPerUser);

      saveSecret(db, userId, secretKey, secretValue, masterKey);

      invalidateToken(db, token);

      expect(() => verifyToken(db, token)).toThrow(AuthenticationError);
    });

    it('should allow new token after invalidation', () => {
      const userId = 'test-user';

      createUser(db, { userId });
      const token1 = issueToken(db, userId, tokenTtl, maxTokensPerUser);
      invalidateToken(db, token1.token);

      const token2 = issueToken(db, userId, tokenTtl, maxTokensPerUser);
      const verifiedUserId = verifyToken(db, token2.token);

      expect(verifiedUserId).toBe(userId);
    });
  });

  describe('User isolation', () => {
    it('should isolate secrets between users', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const secretKey = 'shared-key-name';
      const secret1Value = 'user1-secret';
      const secret2Value = 'user2-secret';

      createUser(db, { userId: user1 });
      createUser(db, { userId: user2 });

      saveSecret(db, user1, secretKey, secret1Value, masterKey);
      saveSecret(db, user2, secretKey, secret2Value, masterKey);

      const user1Secret = retrieveSecret(db, user1, secretKey, masterKey);
      const user2Secret = retrieveSecret(db, user2, secretKey, masterKey);

      expect(user1Secret.value).toBe(secret1Value);
      expect(user2Secret.value).toBe(secret2Value);
    });

    it('should prevent user from accessing other user secrets', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const secretKey = 'user1-secret';

      createUser(db, { userId: user1 });
      createUser(db, { userId: user2 });

      saveSecret(db, user1, secretKey, 'secret-value', masterKey);

      expect(() => retrieveSecret(db, user2, secretKey, masterKey)).toThrow(
        NotFoundError,
      );
    });

    it('should prevent user from deleting other user secrets', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const secretKey = 'user1-secret';

      createUser(db, { userId: user1 });
      createUser(db, { userId: user2 });

      saveSecret(db, user1, secretKey, 'secret-value', masterKey);

      expect(() => removeSecret(db, user2, secretKey)).toThrow(NotFoundError);

      const user1Secret = retrieveSecret(db, user1, secretKey, masterKey);
      expect(user1Secret.value).toBe('secret-value');
    });

    it('should list only user-specific secrets', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      createUser(db, { userId: user1 });
      createUser(db, { userId: user2 });

      saveSecret(db, user1, 'user1-key1', 'value1', masterKey);
      saveSecret(db, user1, 'user1-key2', 'value2', masterKey);
      saveSecret(db, user2, 'user2-key1', 'value3', masterKey);

      const user1Secrets = listAllSecrets(db, user1);
      const user2Secrets = listAllSecrets(db, user2);

      expect(user1Secrets).toHaveLength(2);
      expect(user2Secrets).toHaveLength(1);

      expect(user1Secrets.every((s) => s.key.startsWith('user1'))).toBe(true);
      expect(user2Secrets.every((s) => s.key.startsWith('user2'))).toBe(true);
    });
  });

  describe('Secret expiration', () => {
    it('should prevent access to expired secrets', () => {
      const userId = 'test-user';
      const secretKey = 'temp-secret';
      const secretValue = 'temporary-value';
      const expiresAt = new Date(Date.now() - 1000).toISOString();

      createUser(db, { userId });
      saveSecret(db, userId, secretKey, secretValue, masterKey, expiresAt);

      expect(() => retrieveSecret(db, userId, secretKey, masterKey)).toThrow(
        NotFoundError,
      );
      expect(() => retrieveSecret(db, userId, secretKey, masterKey)).toThrow(
        /expired/,
      );
    });

    it('should allow access to non-expired secrets', () => {
      const userId = 'test-user';
      const secretKey = 'temp-secret';
      const secretValue = 'temporary-value';
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      createUser(db, { userId });
      saveSecret(db, userId, secretKey, secretValue, masterKey, expiresAt);

      const retrieved = retrieveSecret(db, userId, secretKey, masterKey);
      expect(retrieved.value).toBe(secretValue);
    });

    it('should filter expired secrets from listing by default', () => {
      const userId = 'test-user';
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 3600 * 1000).toISOString();

      createUser(db, { userId });
      saveSecret(db, userId, 'expired-1', 'value1', masterKey, expiredAt);
      saveSecret(db, userId, 'expired-2', 'value2', masterKey, expiredAt);
      saveSecret(db, userId, 'valid-1', 'value3', masterKey, futureAt);
      saveSecret(db, userId, 'valid-2', 'value4', masterKey);

      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(2);
      expect(secrets.every((s) => s.key.startsWith('valid'))).toBe(true);
    });
  });

  describe('Token limit enforcement', () => {
    it('should enforce maximum token limit per user', () => {
      const userId = 'test-user';
      const limit = 3;

      createUser(db, { userId });

      const tokens: Array<{
        token: string;
        tokenHash: string;
        expiresAt: string;
      }> = [];
      for (let i = 0; i < limit + 2; i++) {
        tokens.push(issueToken(db, userId, tokenTtl, limit));
      }

      let validTokenCount = 0;
      for (const { token } of tokens) {
        try {
          verifyToken(db, token);
          validTokenCount++;
        } catch {
          // Token was invalidated
        }
      }

      expect(validTokenCount).toBe(limit);

      expect(() => verifyToken(db, tokens[0]!.token)).toThrow(
        AuthenticationError,
      );
      expect(() => verifyToken(db, tokens[1]!.token)).toThrow(
        AuthenticationError,
      );

      expect(verifyToken(db, tokens[limit]!.token)).toBe(userId);
      expect(verifyToken(db, tokens[limit + 1]!.token)).toBe(userId);
    });

    it('should not affect other users when enforcing token limit', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const limit = 2;

      createUser(db, { userId: user1 });
      createUser(db, { userId: user2 });

      const user1Tokens: Array<{
        token: string;
        tokenHash: string;
        expiresAt: string;
      }> = [];
      for (let i = 0; i < limit + 1; i++) {
        user1Tokens.push(issueToken(db, user1, tokenTtl, limit));
      }

      const user2Token = issueToken(db, user2, tokenTtl, limit);

      expect(() => verifyToken(db, user1Tokens[0]!.token)).toThrow(
        AuthenticationError,
      );
      expect(verifyToken(db, user2Token.token)).toBe(user2);
    });
  });
});
