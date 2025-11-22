import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  createConnection,
  closeConnection,
  createUser,
  createSecret,
  getSecret,
  updateSecret,
  deleteSecret,
  listSecrets,
  listExpiredSecrets,
  deleteExpiredSecrets,
  updateSecretLastAccessed,
  deleteAllUserSecrets,
} from '../../src/database';

describe('secretRepository', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
    // テスト用ユーザーを作成
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('should create and retrieve a secret', () => {
    const input = {
      userId: 'user1',
      key: 'api_key',
      encryptedValue: Buffer.from('encrypted').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    };

    createSecret(db, input);
    const secret = getSecret(db, 'user1', 'api_key');

    expect(secret).not.toBeNull();
    expect(secret?.userId).toBe('user1');
    expect(secret?.key).toBe('api_key');
    expect(secret?.encryptedValue).toBe(
      Buffer.from('encrypted').toString('base64'),
    );
    expect(secret?.expiresAt).toBeNull();
  });

  it('should return null for non-existent secret', () => {
    const secret = getSecret(db, 'user1', 'nonexistent');
    expect(secret).toBeNull();
  });

  it('should update a secret', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'api_key',
      encryptedValue: Buffer.from('encrypted').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    const newValue = Buffer.from('new_encrypted').toString('base64');
    updateSecret(db, {
      userId: 'user1',
      key: 'api_key',
      encryptedValue: newValue,
      expiresAt: null,
      updatedBy: 'user1',
    });

    const secret = getSecret(db, 'user1', 'api_key');
    expect(secret?.encryptedValue).toBe(newValue);
  });

  it('should delete a secret', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'api_key',
      encryptedValue: Buffer.from('encrypted').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    deleteSecret(db, 'user1', 'api_key');

    const secret = getSecret(db, 'user1', 'api_key');
    expect(secret).toBeNull();
  });

  it('should list secrets', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'key1',
      encryptedValue: Buffer.from('value1').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });
    createSecret(db, {
      userId: 'user1',
      key: 'key2',
      encryptedValue: Buffer.from('value2').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    const secrets = listSecrets(db, 'user1');
    expect(secrets).toHaveLength(2);
  });

  it('should not include expired secrets by default', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'expired',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: '2020-01-01T00:00:00Z',
      createdBy: 'user1',
    });
    createSecret(db, {
      userId: 'user1',
      key: 'valid',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    const secrets = listSecrets(db, 'user1');
    expect(secrets).toHaveLength(1);
    expect(secrets[0]?.key).toBe('valid');
  });

  it('should include expired secrets when requested', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'expired',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: '2020-01-01T00:00:00Z',
      createdBy: 'user1',
    });

    const secrets = listSecrets(db, 'user1', { includeExpired: true });
    expect(secrets).toHaveLength(1);
  });

  it('should list expired secrets', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'expired',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: '2020-01-01T00:00:00Z',
      createdBy: 'user1',
    });

    const expiredSecrets = listExpiredSecrets(db, 'user1');
    expect(expiredSecrets).toHaveLength(1);
    expect(expiredSecrets[0]?.key).toBe('expired');
  });

  it('should delete expired secrets', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'expired',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: '2020-01-01T00:00:00Z',
      createdBy: 'user1',
    });

    const count = deleteExpiredSecrets(db, 'user1');
    expect(count).toBe(1);

    const secrets = listSecrets(db, 'user1', { includeExpired: true });
    expect(secrets).toHaveLength(0);
  });

  it('should update secret last accessed time', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'api_key',
      encryptedValue: Buffer.from('encrypted').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    updateSecretLastAccessed(db, 'user1', 'api_key');

    const stmt = db.prepare(
      'SELECT lastAccessedAt FROM secrets WHERE userId = ? AND key = ?',
    );
    const row = stmt.get('user1', 'api_key') as {
      lastAccessedAt: string | null;
    };
    expect(row.lastAccessedAt).not.toBeNull();
  });

  it('should delete all user secrets', () => {
    createSecret(db, {
      userId: 'user1',
      key: 'key1',
      encryptedValue: Buffer.from('value1').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });
    createSecret(db, {
      userId: 'user1',
      key: 'key2',
      encryptedValue: Buffer.from('value2').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    const count = deleteAllUserSecrets(db, 'user1');
    expect(count).toBe(2);

    const secrets = listSecrets(db, 'user1');
    expect(secrets).toHaveLength(0);
  });
});
