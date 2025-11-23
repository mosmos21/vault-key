import { DatabaseSync } from 'node:sqlite';
import { Secret, ListSecretsOptions } from '@core/types';
import { DatabaseError } from '@core/utils/errors';
import { secretRowSchema, type SecretRow } from '@core/database/schemas';

/**
 * データベース行から Secret 型に変換
 */
const rowToSecret = (row: SecretRow): Secret => ({
  userId: row.userId,
  key: row.key,
  encryptedValue: Buffer.from(row.encryptedValue).toString('base64'),
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * 機密情報を作成する
 */
export const createSecret = (
  db: DatabaseSync,
  input: {
    userId: string;
    key: string;
    encryptedValue: string;
    expiresAt: string | null;
    createdBy: string;
  },
): void => {
  try {
    const stmt = db.prepare(`
      INSERT INTO secrets (userId, key, encryptedValue, expiresAt, createdBy)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      input.userId,
      input.key,
      Buffer.from(input.encryptedValue, 'base64'),
      input.expiresAt,
      input.createdBy,
    );
  } catch {
    throw new DatabaseError('Failed to create secret');
  }
};

/**
 * 機密情報を取得する
 */
export const getSecret = (
  db: DatabaseSync,
  userId: string,
  key: string,
): Secret | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM secrets WHERE userId = ? AND key = ?
    `);
    const row = stmt.get(userId, key);
    if (!row) {
      return null;
    }
    const parsedRow = secretRowSchema.parse(row);
    return rowToSecret(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get secret');
  }
};

/**
 * 機密情報を更新する
 */
export const updateSecret = (
  db: DatabaseSync,
  input: {
    userId: string;
    key: string;
    encryptedValue: string;
    expiresAt: string | null;
    updatedBy: string;
  },
): void => {
  try {
    const stmt = db.prepare(`
      UPDATE secrets
      SET encryptedValue = ?,
          expiresAt = ?,
          updatedAt = datetime('now'),
          updatedBy = ?
      WHERE userId = ? AND key = ?
    `);
    stmt.run(
      Buffer.from(input.encryptedValue, 'base64'),
      input.expiresAt,
      input.updatedBy,
      input.userId,
      input.key,
    );
  } catch {
    throw new DatabaseError('Failed to update secret');
  }
};

/**
 * 機密情報を削除する
 */
export const deleteSecret = (
  db: DatabaseSync,
  userId: string,
  key: string,
): void => {
  try {
    const stmt = db.prepare(`
      DELETE FROM secrets WHERE userId = ? AND key = ?
    `);
    stmt.run(userId, key);
  } catch {
    throw new DatabaseError('Failed to delete secret');
  }
};

/**
 * ユーザーの機密情報一覧を取得する
 */
export const listSecrets = (
  db: DatabaseSync,
  userId: string,
  options: ListSecretsOptions = {},
): Secret[] => {
  try {
    let sql = `SELECT * FROM secrets WHERE userId = ?`;
    if (!options.includeExpired) {
      sql += ` AND (expiresAt IS NULL OR datetime(expiresAt) > datetime('now'))`;
    }
    if (options.pattern) {
      sql += ` AND key LIKE ?`;
    }
    sql += ` ORDER BY createdAt DESC`;

    const stmt = db.prepare(sql);
    const params = options.pattern
      ? [userId, options.pattern.replace(/\*/g, '%')]
      : [userId];
    const rows = stmt.all(...params);
    const parsedRows = rows.map((row) => secretRowSchema.parse(row));
    return parsedRows.map(rowToSecret);
  } catch {
    throw new DatabaseError('Failed to list secrets');
  }
};

/**
 * 有効期限切れの機密情報一覧を取得する
 */
export const listExpiredSecrets = (
  db: DatabaseSync,
  userId: string,
): Secret[] => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM secrets
      WHERE userId = ? AND datetime(expiresAt) <= datetime('now')
      ORDER BY expiresAt ASC
    `);
    const rows = stmt.all(userId);
    const parsedRows = rows.map((row) => secretRowSchema.parse(row));
    return parsedRows.map(rowToSecret);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * 有効期限切れの機密情報を削除する
 */
export const deleteExpiredSecrets = (
  db: DatabaseSync,
  userId: string,
): number => {
  try {
    const stmt = db.prepare(`
      DELETE FROM secrets
      WHERE userId = ? AND datetime(expiresAt) <= datetime('now')
    `);
    const result = stmt.run(userId);
    return Number(result.changes ?? 0);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * 機密情報の最終アクセス日時を更新する
 */
export const updateSecretLastAccessed = (
  db: DatabaseSync,
  userId: string,
  key: string,
): void => {
  try {
    const stmt = db.prepare(`
      UPDATE secrets SET lastAccessedAt = datetime('now')
      WHERE userId = ? AND key = ?
    `);
    stmt.run(userId, key);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};

/**
 * ユーザーのすべての機密情報を削除する
 */
export const deleteAllUserSecrets = (
  db: DatabaseSync,
  userId: string,
): number => {
  try {
    const stmt = db.prepare(`
      DELETE FROM secrets WHERE userId = ?
    `);
    const result = stmt.run(userId);
    return Number(result.changes ?? 0);
  } catch {
    throw new DatabaseError('DATABASE_ERROR');
  }
};
