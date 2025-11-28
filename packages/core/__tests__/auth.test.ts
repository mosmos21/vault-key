import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createConnection, closeConnection, createUser } from '@core/database';
import {
  issueToken,
  verifyToken,
  invalidateToken,
} from '@core/auth/tokenManager';
import { AuthenticationError } from '@core/utils/errors';

describe('Authentication', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
  });

  afterEach(() => {
    closeConnection(db);
  });

  describe('Token Management', () => {
    const userId = 'test-user';
    const tokenTtl = 3600;
    const maxTokensPerUser = 5;

    beforeEach(() => {
      createUser(db, { userId });
    });

    describe('issueToken', () => {
      it('should issue new token', () => {
        const result = issueToken(db, userId, tokenTtl, maxTokensPerUser);

        expect(result.token).toBeDefined();
        expect(result.token).toHaveLength(64);
        expect(result.tokenHash).toBeDefined();
        expect(result.expiresAt).toBeDefined();

        const expiresAt = new Date(result.expiresAt);
        const now = new Date();
        const expectedExpiry = new Date(now.getTime() + tokenTtl * 1000);

        expect(
          Math.abs(expiresAt.getTime() - expectedExpiry.getTime()),
        ).toBeLessThan(1000);
      });

      it('should delete oldest token when limit is reached', () => {
        const tokens = [];
        for (let i = 0; i < maxTokensPerUser + 1; i++) {
          tokens.push(issueToken(db, userId, tokenTtl, maxTokensPerUser));
        }

        const count = db
          .prepare(
            'SELECT COUNT(*) as count FROM tokens WHERE userId = ? AND isRevoked = 0',
          )
          .get(userId) as { count: number };

        expect(count.count).toBe(maxTokensPerUser);

        const firstTokenStillExists = db
          .prepare('SELECT COUNT(*) as count FROM tokens WHERE tokenHash = ?')
          .get(tokens[0]!.tokenHash) as { count: number };

        expect(firstTokenStillExists.count).toBe(0);
      });
    });

    describe('verifyToken', () => {
      it('should verify valid token and return userId', () => {
        const { token } = issueToken(db, userId, tokenTtl, maxTokensPerUser);

        const result = verifyToken(db, token);

        expect(result).toBe(userId);
      });

      it('should update lastUsedAt when token is verified', () => {
        const { token, tokenHash } = issueToken(
          db,
          userId,
          tokenTtl,
          maxTokensPerUser,
        );

        const beforeVerify = db
          .prepare('SELECT lastUsedAt FROM tokens WHERE tokenHash = ?')
          .get(tokenHash) as { lastUsedAt: string | null };
        expect(beforeVerify.lastUsedAt).toBeNull();

        verifyToken(db, token);

        const afterVerify = db
          .prepare('SELECT lastUsedAt FROM tokens WHERE tokenHash = ?')
          .get(tokenHash) as { lastUsedAt: string | null };
        expect(afterVerify.lastUsedAt).not.toBeNull();
      });

      it('should throw error for invalid token', () => {
        const invalidToken = 'a'.repeat(64);

        expect(() => verifyToken(db, invalidToken)).toThrow(
          AuthenticationError,
        );
        expect(() => verifyToken(db, invalidToken)).toThrow('Invalid token');
      });

      it('should throw error for expired token', () => {
        const expiredTokenTtl = -1;
        const { token } = issueToken(
          db,
          userId,
          expiredTokenTtl,
          maxTokensPerUser,
        );

        expect(() => verifyToken(db, token)).toThrow(AuthenticationError);
        expect(() => verifyToken(db, token)).toThrow('Invalid token');
      });

      it('should throw error for revoked token', () => {
        const { token } = issueToken(db, userId, tokenTtl, maxTokensPerUser);
        invalidateToken(db, token);

        expect(() => verifyToken(db, token)).toThrow(AuthenticationError);
        expect(() => verifyToken(db, token)).toThrow('Invalid token');
      });
    });

    describe('invalidateToken', () => {
      it('should revoke token', () => {
        const { token, tokenHash } = issueToken(
          db,
          userId,
          tokenTtl,
          maxTokensPerUser,
        );

        invalidateToken(db, token);

        const result = db
          .prepare(
            'SELECT isRevoked, revokedAt FROM tokens WHERE tokenHash = ?',
          )
          .get(tokenHash) as { isRevoked: number; revokedAt: string | null };

        expect(result.isRevoked).toBe(1);
        expect(result.revokedAt).not.toBeNull();
      });

      it('should not affect other tokens', () => {
        const token1 = issueToken(db, userId, tokenTtl, maxTokensPerUser);
        const token2 = issueToken(db, userId, tokenTtl, maxTokensPerUser);

        invalidateToken(db, token1.token);

        expect(() => verifyToken(db, token1.token)).toThrow(
          AuthenticationError,
        );
        expect(verifyToken(db, token2.token)).toBe(userId);
      });
    });
  });
});
