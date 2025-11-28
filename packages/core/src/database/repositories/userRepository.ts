import { DatabaseSync } from 'node:sqlite';
import { User, CreateUserInput } from '@core/types';
import { DatabaseError } from '@core/utils/errors';
import { userRowSchema, type UserRow } from '@core/database/schemas';

/**
 * Convert database row to User type
 */
const rowToUser = (row: UserRow): User => ({
  userId: row.userId,
  createdAt: row.createdAt,
  lastLoginAt: row.lastLoginAt,
});

/**
 * Create a user
 */
export const createUser = (db: DatabaseSync, input: CreateUserInput): void => {
  try {
    const stmt = db.prepare(`
      INSERT INTO users (userId)
      VALUES (?)
    `);
    stmt.run(input.userId);
  } catch {
    throw new DatabaseError('Failed to create user');
  }
};

/**
 * Get user by user ID
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
 * Get all users
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
 * Update user last login timestamp
 */
export const updateUserLastLogin = (db: DatabaseSync, userId: string): void => {
  try {
    const stmt = db.prepare(`
      UPDATE users SET lastLoginAt = datetime('now') WHERE userId = ?
    `);
    stmt.run(userId);
  } catch {
    throw new DatabaseError('Failed to update user last login');
  }
};

/**
 * Delete user (related data is CASCADE deleted)
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
