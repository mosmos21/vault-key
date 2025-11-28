import { z } from 'zod';

/**
 * Zod schema definitions for database rows.
 * Used to safely validate and transform data from SQLite.
 */

/**
 * users table row schema
 */
export const userRowSchema = z.object({
  userId: z.string(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export type UserRow = z.infer<typeof userRowSchema>;

/**
 * passkeys table row schema
 */
export const passkeyRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  credentialId: z.string(),
  publicKey: z.string(),
  counter: z.number(),
  deviceType: z.enum(['singleDevice', 'multiDevice']),
  backedUp: z.number(),
  transports: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

export type PasskeyRow = z.infer<typeof passkeyRowSchema>;

/**
 * WebAuthn transports schema for parsing JSON from database
 */
export const authenticatorTransportsSchema = z.array(
  z.enum(['usb', 'nfc', 'ble', 'smart-card', 'hybrid', 'internal', 'cable']),
);

export type AuthenticatorTransports = z.infer<
  typeof authenticatorTransportsSchema
>;

/**
 * secrets table row schema
 * BLOB is retrieved as Uint8Array
 */
export const secretRowSchema = z.object({
  userId: z.string(),
  key: z.string(),
  encryptedValue: z.instanceof(Uint8Array),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  updatedBy: z.string().nullable(),
  lastAccessedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  metadata: z.string().nullable(),
});

export type SecretRow = z.infer<typeof secretRowSchema>;

/**
 * tokens table row schema
 */
export const tokenRowSchema = z.object({
  tokenHash: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  isRevoked: z.number(),
  revokedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
});

export type TokenRow = z.infer<typeof tokenRowSchema>;

/**
 * COUNT query result schema
 */
export const countRowSchema = z.object({
  count: z.number(),
});

export type CountRow = z.infer<typeof countRowSchema>;

/**
 * lastAccessedAt query result schema
 */
export const lastAccessedAtRowSchema = z.object({
  lastAccessedAt: z.string().nullable(),
});

export type LastAccessedAtRow = z.infer<typeof lastAccessedAtRowSchema>;

/**
 * lastLoginAt query result schema
 */
export const lastLoginAtRowSchema = z.object({
  lastLoginAt: z.string().nullable(),
});

export type LastLoginAtRow = z.infer<typeof lastLoginAtRowSchema>;

/**
 * lastUsedAt query result schema
 */
export const lastUsedAtRowSchema = z.object({
  lastUsedAt: z.string().nullable(),
});

export type LastUsedAtRow = z.infer<typeof lastUsedAtRowSchema>;

/**
 * Log level schema
 */
export const logLevelSchema = z.enum([
  'DEBUG',
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
]);

export type LogLevel = z.infer<typeof logLevelSchema>;
