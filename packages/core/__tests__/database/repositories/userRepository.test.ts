import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import {
  createConnection,
  closeConnection,
  createUser,
  getUserById,
  getUserByCredentialId,
  getAllUsers,
  updateUserLastLogin,
  deleteUser,
} from '@core/database';

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
      credentialId: 'cred1',
      publicKey: '{"key":"value"}',
    };

    createUser(db, input);
    const user = getUserById(db, 'user1');

    expect(user).not.toBeNull();
    expect(user?.userId).toBe('user1');
    expect(user?.credentialId).toBe('cred1');
    expect(user?.publicKey).toBe('{"key":"value"}');
    expect(user?.createdAt).toBeDefined();
  });

  it('should return null for non-existent user', () => {
    const user = getUserById(db, 'nonexistent');
    expect(user).toBeNull();
  });

  it('should get user by credential ID', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });

    const user = getUserByCredentialId(db, 'cred1');
    expect(user?.userId).toBe('user1');
  });

  it('should get all users', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });
    createUser(db, {
      userId: 'user2',
      credentialId: 'cred2',
      publicKey: '{}',
    });

    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
  });

  it('should update user last login', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });

    updateUserLastLogin(db, 'user1');

    const stmt = db.prepare('SELECT lastLogin FROM users WHERE userId = ?');
    const row = stmt.get('user1') as { lastLogin: string | null };
    expect(row.lastLogin).not.toBeNull();
  });

  it('should delete user', () => {
    createUser(db, {
      userId: 'user1',
      credentialId: 'cred1',
      publicKey: '{}',
    });

    deleteUser(db, 'user1');

    const user = getUserById(db, 'user1');
    expect(user).toBeNull();
  });
});
