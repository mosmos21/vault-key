import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultKeyClient } from '@core/client';
import { generateMasterKey } from '@core/crypto/encryption';
import { AuthenticationError, NotFoundError } from '@core/utils/errors';

describe('VaultKeyClient', () => {
  let client: VaultKeyClient;
  let masterKey: string;

  beforeEach(() => {
    masterKey = generateMasterKey();
    client = new VaultKeyClient({
      dbPath: ':memory:',
      masterKey,
      tokenTtl: 3600,
      maxTokensPerUser: 5,
    });
  });

  afterEach(() => {
    client.close();
  });

  describe('registerUser()', () => {
    it('should register a new user', () => {
      const userId = 'test-user';

      expect(() => client.registerUser(userId)).not.toThrow();
    });

    it('should allow registering the same user multiple times (idempotent)', () => {
      const userId = 'test-user';

      client.registerUser(userId);
      expect(() => client.registerUser(userId)).not.toThrow();
    });
  });

  describe('issueToken()', () => {
    it('should issue a token for a registered user', () => {
      const userId = 'test-user';
      client.registerUser(userId);

      const result = client.issueToken(userId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenHash');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('should issue a token with custom TTL', () => {
      const userId = 'test-user';
      client.registerUser(userId);

      const customTtl = 7200;
      const result = client.issueToken(userId, customTtl);

      expect(result).toHaveProperty('expiresAt');
      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffSeconds = Math.floor(
        (expiresAt.getTime() - now.getTime()) / 1000,
      );

      expect(diffSeconds).toBeGreaterThan(7100);
      expect(diffSeconds).toBeLessThanOrEqual(7200);
    });
  });

  describe('storeSecret() / getSecret()', () => {
    it('should store and retrieve a secret', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const key = 'api-key';
      const value = 'super-secret-value';

      client.storeSecret(key, value, token);

      const retrieved = client.getSecret(key, token);
      expect(retrieved.key).toBe(key);
      expect(retrieved.value).toBe(value);
      expect(retrieved.expiresAt).toBeNull();
      expect(retrieved.createdAt).toBeDefined();
      expect(retrieved.updatedAt).toBeDefined();
    });

    it('should store a secret with expiration', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const key = 'api-key';
      const value = 'super-secret-value';
      const expiresAt = new Date('2030-12-31T23:59:59Z').toISOString();

      client.storeSecret(key, value, token, expiresAt);

      const retrieved = client.getSecret(key, token);
      expect(retrieved.expiresAt).toBe(expiresAt);
    });

    it('should throw NotFoundError when retrieving a non-existent secret', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      expect(() => client.getSecret('non-existent', token)).toThrow(
        NotFoundError,
      );
    });

    it('should throw AuthenticationError with invalid token', () => {
      expect(() => client.getSecret('any-key', 'invalid-token')).toThrow(
        AuthenticationError,
      );
    });
  });

  describe('updateSecret()', () => {
    it('should update an existing secret', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const key = 'api-key';
      const originalValue = 'original-value';
      const newValue = 'new-value';

      client.storeSecret(key, originalValue, token);
      client.updateSecret(key, newValue, token);

      const retrieved = client.getSecret(key, token);
      expect(retrieved.value).toBe(newValue);
    });

    it('should update expiration date', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const key = 'api-key';
      const value = 'value';
      const newExpiresAt = new Date('2030-12-31T23:59:59Z').toISOString();

      client.storeSecret(key, value, token);
      client.updateSecret(key, value, token, newExpiresAt);

      const retrieved = client.getSecret(key, token);
      expect(retrieved.expiresAt).toBe(newExpiresAt);
    });
  });

  describe('deleteSecret()', () => {
    it('should delete a secret', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const key = 'api-key';
      const value = 'value';

      client.storeSecret(key, value, token);
      client.deleteSecret(key, token);

      expect(() => client.getSecret(key, token)).toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deleting a non-existent secret', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      expect(() => client.deleteSecret('non-existent', token)).toThrow(
        NotFoundError,
      );
    });
  });

  describe('listSecrets()', () => {
    it('should list all secrets for a user', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      client.storeSecret('key1', 'value1', token);
      client.storeSecret('key2', 'value2', token);
      client.storeSecret('key3', 'value3', token);

      const secrets = client.listSecrets(token);
      expect(secrets).toHaveLength(3);
      expect(secrets.map((s) => s.key)).toEqual(
        expect.arrayContaining(['key1', 'key2', 'key3']),
      );
    });

    it('should list secrets matching a pattern', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      client.storeSecret('apiKeyOpenai', 'value1', token);
      client.storeSecret('apiKeyAnthropic', 'value2', token);
      client.storeSecret('dbPassword', 'value3', token);

      const secrets = client.listSecrets(token, 'apiKey*');
      expect(secrets).toHaveLength(2);
      expect(secrets.map((s) => s.key)).toEqual(
        expect.arrayContaining(['apiKeyOpenai', 'apiKeyAnthropic']),
      );
    });

    it('should return empty array when no secrets exist', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      const secrets = client.listSecrets(token);
      expect(secrets).toHaveLength(0);
    });
  });

  describe('revokeToken()', () => {
    it('should revoke a token', () => {
      const userId = 'test-user';
      client.registerUser(userId);
      const { token } = client.issueToken(userId);

      client.storeSecret('key', 'value', token);

      client.revokeToken(token);

      expect(() => client.getSecret('key', token)).toThrow(AuthenticationError);
    });
  });

  describe('listTokens()', () => {
    it('should list all active tokens for a user', () => {
      const userId = 'test-user';
      client.registerUser(userId);

      const token1 = client.issueToken(userId);
      const token2 = client.issueToken(userId);
      const token3 = client.issueToken(userId);

      const tokens = client.listTokens(token1.token);
      expect(tokens).toHaveLength(3);
      expect(tokens.map((t) => t.tokenHash)).toEqual(
        expect.arrayContaining([
          token1.tokenHash,
          token2.tokenHash,
          token3.tokenHash,
        ]),
      );
    });

    it('should not include revoked tokens', () => {
      const userId = 'test-user';
      client.registerUser(userId);

      const token1 = client.issueToken(userId);
      const token2 = client.issueToken(userId);

      client.revokeToken(token1.token);

      const tokens = client.listTokens(token2.token);
      expect(tokens).toHaveLength(1);
      const firstToken = tokens[0];
      expect(firstToken).toBeDefined();
      if (firstToken) {
        expect(firstToken.tokenHash).toBe(token2.tokenHash);
      }
    });
  });

  describe('User isolation', () => {
    it('should isolate secrets between users', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      client.registerUser(user1);
      client.registerUser(user2);

      const token1 = client.issueToken(user1).token;
      const token2 = client.issueToken(user2).token;

      client.storeSecret('shared-key', 'user1-value', token1);
      client.storeSecret('shared-key', 'user2-value', token2);

      const secret1 = client.getSecret('shared-key', token1);
      const secret2 = client.getSecret('shared-key', token2);

      expect(secret1.value).toBe('user1-value');
      expect(secret2.value).toBe('user2-value');
    });

    it("should not allow user to access another user's secret", () => {
      const user1 = 'user1';
      const user2 = 'user2';

      client.registerUser(user1);
      client.registerUser(user2);

      const token1 = client.issueToken(user1).token;
      const token2 = client.issueToken(user2).token;

      client.storeSecret('user1-key', 'user1-value', token1);

      expect(() => client.getSecret('user1-key', token2)).toThrow(
        NotFoundError,
      );
    });
  });

  describe('Token limit', () => {
    it('should delete oldest token when limit is reached', () => {
      const userId = 'test-user';
      client.registerUser(userId);

      const tokens = [];
      for (let i = 0; i < 6; i++) {
        tokens.push(client.issueToken(userId));
      }

      const token5 = tokens[5];
      expect(token5).toBeDefined();
      if (!token5) {
        throw new Error('token5 is undefined');
      }

      const activeTokens = client.listTokens(token5.token);
      expect(activeTokens).toHaveLength(5);

      const activeTokenHashes = activeTokens.map((t) => t.tokenHash);
      const token0 = tokens[0];
      const token1 = tokens[1];
      expect(token0).toBeDefined();
      expect(token1).toBeDefined();
      if (token0 && token1) {
        expect(activeTokenHashes).not.toContain(token0.tokenHash);
        expect(activeTokenHashes).toContain(token1.tokenHash);
        expect(activeTokenHashes).toContain(token5.tokenHash);
      }
    });
  });

  describe('close()', () => {
    it('should close database connection', () => {
      const testClient = new VaultKeyClient({
        dbPath: ':memory:',
        masterKey: generateMasterKey(),
      });

      expect(() => testClient.close()).not.toThrow();
    });
  });
});
