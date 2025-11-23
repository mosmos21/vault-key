import { z } from 'zod';

/**
 * データベースから取得される行の Zod スキーマ定義
 * SQLite から取得されるデータの型を安全に検証・変換する
 */

/**
 * users テーブルの行スキーマ
 */
export const userRowSchema = z.object({
  userId: z.string(),
  credentialId: z.string(),
  publicKey: z.string(),
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

export type UserRow = z.infer<typeof userRowSchema>;

/**
 * secrets テーブルの行スキーマ
 * BLOB は Uint8Array として取得される
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
 * tokens テーブルの行スキーマ
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
 * COUNT クエリの結果スキーマ
 */
export const countRowSchema = z.object({
  count: z.number(),
});

export type CountRow = z.infer<typeof countRowSchema>;

/**
 * lastAccessedAt を返すクエリの結果スキーマ
 */
export const lastAccessedAtRowSchema = z.object({
  lastAccessedAt: z.string().nullable(),
});

export type LastAccessedAtRow = z.infer<typeof lastAccessedAtRowSchema>;

/**
 * lastLogin を返すクエリの結果スキーマ
 */
export const lastLoginRowSchema = z.object({
  lastLogin: z.string().nullable(),
});

export type LastLoginRow = z.infer<typeof lastLoginRowSchema>;

/**
 * lastUsedAt を返すクエリの結果スキーマ
 */
export const lastUsedAtRowSchema = z.object({
  lastUsedAt: z.string().nullable(),
});

export type LastUsedAtRow = z.infer<typeof lastUsedAtRowSchema>;

/**
 * ログレベルのスキーマ
 */
export const logLevelSchema = z.enum([
  'DEBUG',
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
]);

export type LogLevel = z.infer<typeof logLevelSchema>;
