import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { Passkey, CreatePasskeyInput } from '@core/types/passkey';
import { DatabaseError } from '@core/utils/errors';
import {
  passkeyRowSchema,
  authenticatorTransportsSchema,
  type PasskeyRow,
} from '@core/database/schemas';

/**
 * Parse and validate transports JSON from database
 */
const parseTransports = (transportsJson: string | null): Passkey['transports'] => {
  if (!transportsJson) {
    return null;
  }
  const parsed: unknown = JSON.parse(transportsJson);
  const result = authenticatorTransportsSchema.safeParse(parsed);
  if (!result.success) {
    return null;
  }
  return result.data;
};

/**
 * Convert database row to Passkey type
 */
const rowToPasskey = (row: PasskeyRow): Passkey => ({
  id: row.id,
  userId: row.userId,
  credentialId: row.credentialId,
  publicKey: row.publicKey,
  counter: row.counter,
  deviceType: row.deviceType,
  backedUp: row.backedUp === 1,
  transports: parseTransports(row.transports),
  createdAt: row.createdAt,
  lastUsedAt: row.lastUsedAt,
});

/**
 * Create a passkey
 */
export const createPasskey = (
  db: DatabaseSync,
  input: CreatePasskeyInput,
): Passkey => {
  try {
    const id = randomUUID();
    const transportsJson = input.transports
      ? JSON.stringify(input.transports)
      : null;

    const stmt = db.prepare(`
      INSERT INTO passkeys (id, userId, credentialId, publicKey, counter, deviceType, backedUp, transports)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      input.userId,
      input.credentialId,
      input.publicKey,
      input.counter,
      input.deviceType,
      input.backedUp ? 1 : 0,
      transportsJson,
    );

    const passkey = getPasskeyById(db, id);
    if (!passkey) {
      throw new DatabaseError('Failed to retrieve created passkey');
    }
    return passkey;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('Failed to create passkey');
  }
};

/**
 * Get passkey by ID
 */
export const getPasskeyById = (
  db: DatabaseSync,
  id: string,
): Passkey | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM passkeys WHERE id = ?
    `);
    const row = stmt.get(id);
    if (!row) {
      return null;
    }
    const parsedRow = passkeyRowSchema.parse(row);
    return rowToPasskey(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get passkey by ID');
  }
};

/**
 * Get passkey by credential ID
 */
export const getPasskeyByCredentialId = (
  db: DatabaseSync,
  credentialId: string,
): Passkey | null => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM passkeys WHERE credentialId = ?
    `);
    const row = stmt.get(credentialId);
    if (!row) {
      return null;
    }
    const parsedRow = passkeyRowSchema.parse(row);
    return rowToPasskey(parsedRow);
  } catch {
    throw new DatabaseError('Failed to get passkey by credential ID');
  }
};

/**
 * Get passkeys by user ID
 */
export const getPasskeysByUserId = (
  db: DatabaseSync,
  userId: string,
): Passkey[] => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM passkeys WHERE userId = ? ORDER BY createdAt DESC
    `);
    const rows = stmt.all(userId);
    return rows.map((row) => {
      const parsedRow = passkeyRowSchema.parse(row);
      return rowToPasskey(parsedRow);
    });
  } catch {
    throw new DatabaseError('Failed to get passkeys by user ID');
  }
};

/**
 * Update passkey counter
 */
export const updatePasskeyCounter = (
  db: DatabaseSync,
  id: string,
  counter: number,
): void => {
  try {
    const stmt = db.prepare(`
      UPDATE passkeys SET counter = ? WHERE id = ?
    `);
    stmt.run(counter, id);
  } catch {
    throw new DatabaseError('Failed to update passkey counter');
  }
};

/**
 * Update passkey last used timestamp
 */
export const updatePasskeyLastUsed = (db: DatabaseSync, id: string): void => {
  try {
    const stmt = db.prepare(`
      UPDATE passkeys SET lastUsedAt = datetime('now') WHERE id = ?
    `);
    stmt.run(id);
  } catch {
    throw new DatabaseError('Failed to update passkey last used');
  }
};

/**
 * Delete passkey by ID
 */
export const deletePasskey = (db: DatabaseSync, id: string): void => {
  try {
    const stmt = db.prepare(`
      DELETE FROM passkeys WHERE id = ?
    `);
    stmt.run(id);
  } catch {
    throw new DatabaseError('Failed to delete passkey');
  }
};

/**
 * Delete all passkeys by user ID
 */
export const deletePasskeysByUserId = (
  db: DatabaseSync,
  userId: string,
): void => {
  try {
    const stmt = db.prepare(`
      DELETE FROM passkeys WHERE userId = ?
    `);
    stmt.run(userId);
  } catch {
    throw new DatabaseError('Failed to delete passkeys by user ID');
  }
};
