import { DatabaseSync } from 'node:sqlite';
import { Token } from '@core/types';
import { DatabaseError } from '@core/utils/errors';
import {
  tokenRowSchema,
  countRowSchema,
  type TokenRow,
} from '@core/database/schemas';

/**
 * データベース行から Token 型に変換
 */
const rowToToken = (row: TokenRow): Token => ({
  tokenHash: row.tokenHash,
  userId: row.userId,
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
});

/**
 * トークンを作成する
 */
export const createToken = (
  db: DatabaseSync,
  input: { tokenHash: string; userId: string; expiresAt: string },
): void => {
  try {
    const stmt = db.prepare(`
      INSERT INTO tokens (tokenHash, userId, expiresAt)
      VALUES (?, ?, ?)
    `);
    stmt.run(input.tokenHash, input.userId, input.expiresAt);
  } catch {
    throw new DatabaseError('Failed to create token');
  }
};

/**
 * トークンハッシュでトークンを取得する
 * 無効化されたトークンや期限切れのトークンは返さない
 */
export const getToken = (db: DatabaseSync, tokenHash: string): Token | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM tokens
      WHERE tokenHash = ?
        AND isRevoked = 0
        AND datetime(expiresAt) > datetime('now')
    `);
    const row = stmt.get(tokenHash);
    if (!row) {
      return null;
    }
    const parsedRow = tokenRowSchema.parse(row);
    return rowToToken(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get token');
  }
};

/**
 * ユーザーの有効なトークン一覧を取得する
 */
export const listUserTokens = (db: DatabaseSync, userId: string): Token[] => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM tokens
      WHERE userId = ?
        AND isRevoked = 0
        AND datetime(expiresAt) > datetime('now')
      ORDER BY createdAt DESC
    `);
    const rows = stmt.all(userId);
    const parsedRows = rows.map((row) => tokenRowSchema.parse(row));
    return parsedRows.map(rowToToken);
  } catch {
    throw new DatabaseError('Failed to list user tokens');
  }
};

/**
 * ユーザーの有効なトークン数を取得する
 */
export const countUserTokens = (db: DatabaseSync, userId: string): number => {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM tokens
      WHERE userId = ?
        AND isRevoked = 0
        AND datetime(expiresAt) > datetime('now')
    `);
    const row = stmt.get(userId);
    const parsedRow = countRowSchema.parse(row);
    return parsedRow.count;
  } catch {
    throw new DatabaseError('Failed to count user tokens');
  }
};

/**
 * トークンを失効させる
 */
export const revokeToken = (db: DatabaseSync, tokenHash: string): void => {
  try {
    const stmt = db.prepare(`
      UPDATE tokens
      SET isRevoked = 1,
          revokedAt = datetime('now')
      WHERE tokenHash = ?
    `);
    stmt.run(tokenHash);
  } catch {
    throw new DatabaseError('Failed to revoke token');
  }
};

/**
 * ユーザーのすべてのトークンを失効させる
 */
export const revokeAllUserTokens = (
  db: DatabaseSync,
  userId: string,
): number => {
  try {
    const stmt = db.prepare(`
      UPDATE tokens
      SET isRevoked = 1,
          revokedAt = datetime('now')
      WHERE userId = ? AND isRevoked = 0
    `);
    const result = stmt.run(userId);
    return Number(result.changes ?? 0);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * トークンの最終使用日時を更新する
 */
export const updateTokenLastUsed = (
  db: DatabaseSync,
  tokenHash: string,
): void => {
  try {
    const stmt = db.prepare(`
      UPDATE tokens SET lastUsedAt = datetime('now')
      WHERE tokenHash = ?
    `);
    stmt.run(tokenHash);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * ユーザーの最も古いトークンを削除する
 */
export const deleteOldestToken = (db: DatabaseSync, userId: string): void => {
  try {
    const stmt = db.prepare(`
      DELETE FROM tokens
      WHERE tokenHash = (
        SELECT tokenHash FROM tokens
        WHERE userId = ?
          AND isRevoked = 0
        ORDER BY createdAt ASC
        LIMIT 1
      )
    `);
    stmt.run(userId);
  } catch {
    throw new DatabaseError('Failed to delete oldest token');
  }
};

/**
 * 有効期限切れのトークンを削除する
 */
export const deleteExpiredTokens = (db: DatabaseSync): number => {
  try {
    const stmt = db.prepare(`
      DELETE FROM tokens
      WHERE datetime(expiresAt) <= datetime('now')
    `);
    const result = stmt.run();
    return Number(result.changes ?? 0);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * トークンが有効かどうかを確認する
 */
export const isTokenValid = (db: DatabaseSync, tokenHash: string): boolean => {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM tokens
      WHERE tokenHash = ?
        AND isRevoked = 0
        AND datetime(expiresAt) > datetime('now')
    `);
    const row = stmt.get(tokenHash);
    const parsedRow = countRowSchema.parse(row);
    return parsedRow.count > 0;
  } catch {
    throw new DatabaseError('Failed to validate token');
  }
};
