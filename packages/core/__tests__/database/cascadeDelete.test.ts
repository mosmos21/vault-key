import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  createConnection,
  closeConnection,
  createUser,
  deleteUser,
  createSecret,
  getSecret,
  createToken,
  getToken,
} from '../../src/database';

describe('CASCADE DELETE', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('should delete user secrets when user is deleted', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });
    createSecret(db, {
      userId: 'user1',
      key: 'key1',
      encryptedValue: Buffer.from('value').toString('base64'),
      expiresAt: null,
      createdBy: 'user1',
    });

    deleteUser(db, 'user1');

    const secret = getSecret(db, 'user1', 'key1');
    expect(secret).toBeNull();
  });

  it('should delete user tokens when user is deleted', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    deleteUser(db, 'user1');

    const token = getToken(db, 'hash1');
    expect(token).toBeNull();
  });
});
