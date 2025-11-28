import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createConnection, closeConnection } from '@core/database';
import { createUser } from '@core/database/repositories/userRepository';
import {
  createPasskey,
  getPasskeyById,
  getPasskeyByCredentialId,
  getPasskeysByUserId,
  updatePasskeyCounter,
  updatePasskeyLastUsed,
  deletePasskey,
  deletePasskeysByUserId,
} from '@core/database/repositories/passkeyRepository';
import type { CreatePasskeyInput } from '@core/types/passkey';

describe('passkeyRepository', () => {
  let db: DatabaseSync;
  const testUserId = 'test-user';

  const createTestPasskeyInput = (
    overrides: Partial<CreatePasskeyInput> = {},
  ): CreatePasskeyInput => ({
    userId: testUserId,
    credentialId: 'credential-id-123',
    publicKey: 'cHVibGljLWtleS1kYXRh',
    counter: 0,
    deviceType: 'multiDevice',
    backedUp: false,
    transports: ['internal', 'hybrid'],
    ...overrides,
  });

  beforeEach(() => {
    db = createConnection(':memory:');
    createUser(db, { userId: testUserId });
  });

  afterEach(() => {
    closeConnection(db);
  });

  describe('createPasskey', () => {
    it('should create a passkey', () => {
      const input = createTestPasskeyInput();

      const passkey = createPasskey(db, input);

      expect(passkey.id).toBeDefined();
      expect(passkey.userId).toBe(testUserId);
      expect(passkey.credentialId).toBe(input.credentialId);
      expect(passkey.publicKey).toBe(input.publicKey);
      expect(passkey.counter).toBe(0);
      expect(passkey.deviceType).toBe('multiDevice');
      expect(passkey.backedUp).toBe(false);
      expect(passkey.transports).toEqual(['internal', 'hybrid']);
      expect(passkey.createdAt).toBeDefined();
      expect(passkey.lastUsedAt).toBeNull();
    });

    it('should create a passkey with null transports', () => {
      const input = createTestPasskeyInput({ transports: null });

      const passkey = createPasskey(db, input);

      expect(passkey.transports).toBeNull();
    });

    it('should create a passkey with singleDevice type', () => {
      const input = createTestPasskeyInput({ deviceType: 'singleDevice' });

      const passkey = createPasskey(db, input);

      expect(passkey.deviceType).toBe('singleDevice');
    });

    it('should create a backed up passkey', () => {
      const input = createTestPasskeyInput({ backedUp: true });

      const passkey = createPasskey(db, input);

      expect(passkey.backedUp).toBe(true);
    });
  });

  describe('getPasskeyById', () => {
    it('should return passkey by id', () => {
      const input = createTestPasskeyInput();
      const created = createPasskey(db, input);

      const passkey = getPasskeyById(db, created.id);

      expect(passkey).not.toBeNull();
      expect(passkey?.id).toBe(created.id);
    });

    it('should return null for non-existent id', () => {
      const passkey = getPasskeyById(db, 'non-existent-id');

      expect(passkey).toBeNull();
    });
  });

  describe('getPasskeyByCredentialId', () => {
    it('should return passkey by credential id', () => {
      const input = createTestPasskeyInput();
      createPasskey(db, input);

      const passkey = getPasskeyByCredentialId(db, input.credentialId);

      expect(passkey).not.toBeNull();
      expect(passkey?.credentialId).toBe(input.credentialId);
    });

    it('should return null for non-existent credential id', () => {
      const passkey = getPasskeyByCredentialId(db, 'non-existent');

      expect(passkey).toBeNull();
    });
  });

  describe('getPasskeysByUserId', () => {
    it('should return all passkeys for a user', () => {
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-1' }));
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-2' }));

      const passkeys = getPasskeysByUserId(db, testUserId);

      expect(passkeys).toHaveLength(2);
    });

    it('should return empty array for user with no passkeys', () => {
      const passkeys = getPasskeysByUserId(db, testUserId);

      expect(passkeys).toEqual([]);
    });

    it('should return passkeys ordered by createdAt desc', () => {
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-1' }));
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-2' }));

      const passkeys = getPasskeysByUserId(db, testUserId);

      expect(passkeys).toHaveLength(2);
      const first = passkeys[0];
      const second = passkeys[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      const firstTime = new Date(first!.createdAt).getTime();
      const secondTime = new Date(second!.createdAt).getTime();
      expect(firstTime).toBeGreaterThanOrEqual(secondTime);
    });
  });

  describe('updatePasskeyCounter', () => {
    it('should update passkey counter', () => {
      const input = createTestPasskeyInput();
      const created = createPasskey(db, input);

      updatePasskeyCounter(db, created.id, 5);

      const passkey = getPasskeyById(db, created.id);
      expect(passkey?.counter).toBe(5);
    });
  });

  describe('updatePasskeyLastUsed', () => {
    it('should update lastUsedAt timestamp', () => {
      const input = createTestPasskeyInput();
      const created = createPasskey(db, input);
      expect(created.lastUsedAt).toBeNull();

      updatePasskeyLastUsed(db, created.id);

      const passkey = getPasskeyById(db, created.id);
      expect(passkey?.lastUsedAt).not.toBeNull();
    });
  });

  describe('deletePasskey', () => {
    it('should delete a passkey', () => {
      const input = createTestPasskeyInput();
      const created = createPasskey(db, input);

      deletePasskey(db, created.id);

      const passkey = getPasskeyById(db, created.id);
      expect(passkey).toBeNull();
    });
  });

  describe('deletePasskeysByUserId', () => {
    it('should delete all passkeys for a user', () => {
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-1' }));
      createPasskey(db, createTestPasskeyInput({ credentialId: 'cred-2' }));

      deletePasskeysByUserId(db, testUserId);

      const passkeys = getPasskeysByUserId(db, testUserId);
      expect(passkeys).toEqual([]);
    });
  });
});
