import { DatabaseSync } from 'node:sqlite';
import { User, CreateUserInput } from '@core/types';
import { DatabaseError } from '@core/utils/errors';
import { userRowSchema, type UserRow } from '@core/database/schemas';

/**
 * データベース行から User 型に変換
 */
const rowToUser = (row: UserRow): User => ({
  userId: row.userId,
  credentialId: row.credentialId,
  publicKey: row.publicKey,
  createdAt: row.createdAt,
});

/**
 * ユーザーを作成する
 */
export const createUser = (db: DatabaseSync, input: CreateUserInput): void => {
  try {
    const stmt = db.prepare(`
      INSERT INTO users (userId, credentialId, publicKey)
      VALUES (?, ?, ?)
    `);
    stmt.run(input.userId, input.credentialId, input.publicKey);
  } catch {
    throw new DatabaseError('Failed to create user');
  }
};

/**
 * ユーザー ID でユーザーを取得する
 */
export const getUserById = (db: DatabaseSync, userId: string): User | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM users WHERE userId = ?
    `);
    const row = stmt.get(userId);
    if (!row) {
      return null;
    }
    const parsedRow = userRowSchema.parse(row);
    return rowToUser(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get user by ID');
  }
};

/**
 * Credential ID でユーザーを取得する
 */
export const getUserByCredentialId = (
  db: DatabaseSync,
  credentialId: string,
): User | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM users WHERE credentialId = ?
    `);
    const row = stmt.get(credentialId);
    if (!row) {
      return null;
    }
    const parsedRow = userRowSchema.parse(row);
    return rowToUser(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get user by credential ID');
  }
};

/**
 * すべてのユーザーを取得する
 */
export const getAllUsers = (db: DatabaseSync): User[] => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM users ORDER BY createdAt DESC
    `);
    const rows = stmt.all();
    const parsedRows = rows.map((row) => userRowSchema.parse(row));
    return parsedRows.map(rowToUser);
  } catch {
    throw new DatabaseError('Failed to get all users');
  }
};

/**
 * ユーザーの最終ログイン日時を更新する
 */
export const updateUserLastLogin = (db: DatabaseSync, userId: string): void => {
  try {
    const stmt = db.prepare(`
      UPDATE users SET lastLogin = datetime('now') WHERE userId = ?
    `);
    stmt.run(userId);
  } catch {
    throw new DatabaseError('Failed to update user last login');
  }
};

/**
 * ユーザーを削除する (CASCADE で関連データも削除される)
 */
export const deleteUser = (db: DatabaseSync, userId: string): void => {
  try {
    const stmt = db.prepare(`
      DELETE FROM users WHERE userId = ?
    `);
    stmt.run(userId);
  } catch {
    throw new DatabaseError('Failed to delete user');
  }
};
