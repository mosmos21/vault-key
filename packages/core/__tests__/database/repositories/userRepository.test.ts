import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  createConnection,
  closeConnection,
  createUser,
  getUserById,
  getAllUsers,
  updateUserLastLogin,
  deleteUser,
} from '@core/database';
import { lastLoginAtRowSchema } from '@core/database/schemas';

describe('userRepository', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createConnection(':memory:');
  });

  afterEach(() => {
    closeConnection(db);
  });

  it('should create and retrieve a user', () => {
    const input = {
      userId: 'user1',
    };

    createUser(db, input);
    const user = getUserById(db, 'user1');

    expect(user).not.toBeNull();
    expect(user?.userId).toBe('user1');
    expect(user?.createdAt).toBeDefined();
    expect(user?.lastLoginAt).toBeNull();
  });

  it('should return null for non-existent user', () => {
    const user = getUserById(db, 'nonexistent');
    expect(user).toBeNull();
  });

  it('should get all users', () => {
    createUser(db, { userId: 'user1' });
    createUser(db, { userId: 'user2' });

    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
  });

  it('should update user last login', () => {
    createUser(db, { userId: 'user1' });

    updateUserLastLogin(db, 'user1');

    const stmt = db.prepare('SELECT lastLoginAt FROM users WHERE userId = ?');
    const row = stmt.get('user1');
    const parsedRow = lastLoginAtRowSchema.parse(row);
    expect(parsedRow.lastLoginAt).not.toBeNull();
  });

  it('should delete user', () => {
    createUser(db, { userId: 'user1' });

    deleteUser(db, 'user1');

    const user = getUserById(db, 'user1');
    expect(user).toBeNull();
  });
});
