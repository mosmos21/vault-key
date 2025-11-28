import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createConnection, closeConnection, createUser } from '@core/database';
import {
  saveSecret,
  retrieveSecret,
  removeSecret,
  listAllSecrets,
} from '@core/secrets';
import { generateMasterKey } from '@core/crypto/encryption';
import { NotFoundError, ValidationError } from '@core/utils/errors';

describe('Secrets Management', () => {
  let db: DatabaseSync;
  let masterKey: string;
  const userId = 'test-user';

  beforeEach(() => {
    db = createConnection(':memory:');
    masterKey = generateMasterKey();
    createUser(db, { userId });
  });

  afterEach(() => {
    closeConnection(db);
  });

  describe('saveSecret', () => {
    it('should create new secret', () => {
      const key = 'test-key';
      const value = 'test-value';

      saveSecret(db, userId, key, value, masterKey);

      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(1);
      expect(secrets[0]!.key).toBe(key);
    });

    it('should update existing secret', () => {
      const key = 'test-key';
      const value1 = 'test-value-1';
      const value2 = 'test-value-2';

      saveSecret(db, userId, key, value1, masterKey);
      saveSecret(db, userId, key, value2, masterKey);

      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(1);

      const retrieved = retrieveSecret(db, userId, key, masterKey);
      expect(retrieved.value).toBe(value2);
    });

    it('should save secret with expiration', () => {
      const key = 'test-key';
      const value = 'test-value';
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      saveSecret(db, userId, key, value, masterKey, expiresAt);

      const secrets = listAllSecrets(db, userId);
      expect(secrets[0]!.expiresAt).toBe(expiresAt);
    });

    it('should throw error for empty key', () => {
      expect(() => saveSecret(db, userId, '', 'value', masterKey)).toThrow(
        ValidationError,
      );
      expect(() => saveSecret(db, userId, '  ', 'value', masterKey)).toThrow(
        ValidationError,
      );
    });

    it('should throw error for empty value', () => {
      expect(() => saveSecret(db, userId, 'key', '', masterKey)).toThrow(
        ValidationError,
      );
      expect(() => saveSecret(db, userId, 'key', '  ', masterKey)).toThrow(
        ValidationError,
      );
    });

    it('should encrypt value correctly', () => {
      const key = 'test-key';
      const value = 'sensitive-data';

      saveSecret(db, userId, key, value, masterKey);

      const rawSecret = db
        .prepare(
          'SELECT encryptedValue FROM secrets WHERE userId = ? AND key = ?',
        )
        .get(userId, key) as { encryptedValue: Uint8Array };

      const encryptedStr = Buffer.from(rawSecret.encryptedValue).toString(
        'base64',
      );
      expect(encryptedStr).not.toContain(value);
    });
  });

  describe('retrieveSecret', () => {
    it('should retrieve and decrypt secret', () => {
      const key = 'test-key';
      const value = 'test-value';

      saveSecret(db, userId, key, value, masterKey);
      const retrieved = retrieveSecret(db, userId, key, masterKey);

      expect(retrieved.key).toBe(key);
      expect(retrieved.value).toBe(value);
      expect(retrieved.expiresAt).toBeNull();
    });

    it('should throw error for non-existent secret', () => {
      expect(() =>
        retrieveSecret(db, userId, 'non-existent', masterKey),
      ).toThrow(NotFoundError);
      expect(() =>
        retrieveSecret(db, userId, 'non-existent', masterKey),
      ).toThrow('Secret not found: non-existent');
    });

    it('should throw error for expired secret', () => {
      const key = 'expired-key';
      const value = 'test-value';
      const expiresAt = new Date(Date.now() - 1000).toISOString();

      saveSecret(db, userId, key, value, masterKey, expiresAt);

      expect(() => retrieveSecret(db, userId, key, masterKey)).toThrow(
        NotFoundError,
      );
      expect(() => retrieveSecret(db, userId, key, masterKey)).toThrow(
        'Secret expired: expired-key',
      );
    });

    it('should update lastAccessedAt when secret is retrieved', () => {
      const key = 'test-key';
      const value = 'test-value';

      saveSecret(db, userId, key, value, masterKey);

      const beforeAccess = db
        .prepare(
          'SELECT lastAccessedAt FROM secrets WHERE userId = ? AND key = ?',
        )
        .get(userId, key) as { lastAccessedAt: string | null };
      expect(beforeAccess.lastAccessedAt).toBeNull();

      retrieveSecret(db, userId, key, masterKey);

      const afterAccess = db
        .prepare(
          'SELECT lastAccessedAt FROM secrets WHERE userId = ? AND key = ?',
        )
        .get(userId, key) as { lastAccessedAt: string | null };
      expect(afterAccess.lastAccessedAt).not.toBeNull();
    });

    it('should include expiration in retrieved secret', () => {
      const key = 'test-key';
      const value = 'test-value';
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      saveSecret(db, userId, key, value, masterKey, expiresAt);
      const retrieved = retrieveSecret(db, userId, key, masterKey);

      expect(retrieved.expiresAt).toBe(expiresAt);
    });
  });

  describe('removeSecret', () => {
    it('should delete secret', () => {
      const key = 'test-key';
      const value = 'test-value';

      saveSecret(db, userId, key, value, masterKey);
      removeSecret(db, userId, key);

      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(0);
    });

    it('should throw error for non-existent secret', () => {
      expect(() => removeSecret(db, userId, 'non-existent')).toThrow(
        NotFoundError,
      );
      expect(() => removeSecret(db, userId, 'non-existent')).toThrow(
        'Secret not found: non-existent',
      );
    });

    it('should not affect other secrets', () => {
      saveSecret(db, userId, 'key1', 'value1', masterKey);
      saveSecret(db, userId, 'key2', 'value2', masterKey);

      removeSecret(db, userId, 'key1');

      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(1);
      expect(secrets[0]!.key).toBe('key2');
    });
  });

  describe('listAllSecrets', () => {
    it('should list all secrets without values', () => {
      saveSecret(db, userId, 'key1', 'value1', masterKey);
      saveSecret(db, userId, 'key2', 'value2', masterKey);

      const secrets = listAllSecrets(db, userId);

      expect(secrets).toHaveLength(2);
      expect(secrets[0]!.key).toBeDefined();
      expect(secrets[0]!.createdAt).toBeDefined();
      expect(secrets[0]!.updatedAt).toBeDefined();
      expect('value' in secrets[0]!).toBe(false);
    });

    it('should exclude expired secrets by default', () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 3600 * 1000).toISOString();

      saveSecret(db, userId, 'expired-key', 'value1', masterKey, expiredAt);
      saveSecret(db, userId, 'valid-key', 'value2', masterKey, futureAt);

      const secrets = listAllSecrets(db, userId);

      expect(secrets).toHaveLength(1);
      expect(secrets[0]!.key).toBe('valid-key');
    });

    it('should include expired secrets when requested', () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const futureAt = new Date(Date.now() + 3600 * 1000).toISOString();

      saveSecret(db, userId, 'expired-key', 'value1', masterKey, expiredAt);
      saveSecret(db, userId, 'valid-key', 'value2', masterKey, futureAt);

      const secrets = listAllSecrets(db, userId, { includeExpired: true });

      expect(secrets).toHaveLength(2);
    });

    it('should return empty array when no secrets exist', () => {
      const secrets = listAllSecrets(db, userId);
      expect(secrets).toHaveLength(0);
    });

    it('should only show secrets for specified user', () => {
      const user2 = 'user2';
      createUser(db, { userId: user2 });

      saveSecret(db, userId, 'key1', 'value1', masterKey);
      saveSecret(db, user2, 'key2', 'value2', masterKey);

      const user1Secrets = listAllSecrets(db, userId);
      const user2Secrets = listAllSecrets(db, user2);

      expect(user1Secrets).toHaveLength(1);
      expect(user1Secrets[0]!.key).toBe('key1');
      expect(user2Secrets).toHaveLength(1);
      expect(user2Secrets[0]!.key).toBe('key2');
    });
  });
});
