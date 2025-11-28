import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  createConnection,
  closeConnection,
  createUser,
  createToken,
  getToken,
  listUserTokens,
  countUserTokens,
  revokeToken,
  revokeAllUserTokens,
  updateTokenLastUsed,
  deleteOldestToken,
  deleteExpiredTokens,
  isTokenValid,
} from '@core/database';
import { lastUsedAtRowSchema } from '@core/database/schemas';

describe('tokenRepository', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
    createUser(db, { userId: 'user1' });
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('should create and retrieve a token', () => {
    const input = {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    };

    createToken(db, input);
    const token = getToken(db, 'hash1');

    expect(token).not.toBeNull();
    expect(token?.tokenHash).toBe('hash1');
    expect(token?.userId).toBe('user1');
    expect(token?.expiresAt).toBe('2099-12-31T23:59:59Z');
  });

  it('should return null for non-existent token', () => {
    const token = getToken(db, 'nonexistent');
    expect(token).toBeNull();
  });

  it('should list user tokens', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    const tokens = listUserTokens(db, 'user1');
    expect(tokens).toHaveLength(2);
  });

  it('should count user tokens', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    const count = countUserTokens(db, 'user1');
    expect(count).toBe(2);
  });

  it('should not count revoked tokens', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    revokeToken(db, 'hash1');

    const count = countUserTokens(db, 'user1');
    expect(count).toBe(1);
  });

  it('should revoke token', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    revokeToken(db, 'hash1');

    const valid = isTokenValid(db, 'hash1');
    expect(valid).toBe(false);
  });

  it('should revoke all user tokens', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    const count = revokeAllUserTokens(db, 'user1');
    expect(count).toBe(2);

    const tokens = listUserTokens(db, 'user1');
    expect(tokens).toHaveLength(0);
  });

  it('should update token last used time', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    updateTokenLastUsed(db, 'hash1');

    const stmt = db.prepare(
      'SELECT lastUsedAt FROM tokens WHERE tokenHash = ?',
    );
    const row = stmt.get('hash1');
    const parsedRow = lastUsedAtRowSchema.parse(row);
    expect(parsedRow.lastUsedAt).not.toBeNull();
  });

  it('should delete oldest token', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    deleteOldestToken(db, 'user1');

    const tokens = listUserTokens(db, 'user1');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.tokenHash).toBe('hash2');
  });

  it('should delete expired tokens', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2020-01-01T00:00:00Z',
    });
    createToken(db, {
      tokenHash: 'hash2',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    const count = deleteExpiredTokens(db);
    expect(count).toBe(1);

    const token = getToken(db, 'hash1');
    expect(token).toBeNull();
  });

  it('should validate token', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2099-12-31T23:59:59Z',
    });

    const valid = isTokenValid(db, 'hash1');
    expect(valid).toBe(true);
  });

  it('should invalidate expired token', () => {
    createToken(db, {
      tokenHash: 'hash1',
      userId: 'user1',
      expiresAt: '2020-01-01T00:00:00Z',
    });

    const valid = isTokenValid(db, 'hash1');
    expect(valid).toBe(false);
  });
});
