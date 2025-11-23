import { DatabaseSync } from 'node:sqlite';
import { GenerateTokenResult } from '@core/types';
import { generateToken, hashToken } from '@core/crypto/tokenHash';
import {
  createToken,
  getToken,
  revokeToken,
  countUserTokens,
  deleteOldestToken,
  updateTokenLastUsed,
} from '@core/database/repositories/tokenRepository';
import { AuthenticationError } from '@core/utils/errors';

/**
 * アクセストークンを発行する
 * 既存トークン数が上限に達している場合、最も古いトークンを削除する
 */
export const issueToken = (
  db: DatabaseSync,
  userId: string,
  tokenTtl: number,
  maxTokensPerUser: number,
): GenerateTokenResult => {
  const token = generateToken();
  const tokenHash = hashToken(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokenTtl * 1000).toISOString();

  const currentCount = countUserTokens(db, userId);
  if (currentCount >= maxTokensPerUser) {
    deleteOldestToken(db, userId);
  }

  createToken(db, { tokenHash, userId, expiresAt });

  return { token, tokenHash, expiresAt };
};

/**
 * トークンを検証する
 * 有効なトークンの場合はユーザー ID を返し、最終使用日時を更新する
 * 無効なトークンの場合は AuthenticationError をスローする
 */
export const verifyToken = (db: DatabaseSync, token: string): string => {
  const tokenHash = hashToken(token);
  const tokenData = getToken(db, tokenHash);

  if (!tokenData) {
    throw new AuthenticationError('Invalid token');
  }

  updateTokenLastUsed(db, tokenHash);

  return tokenData.userId;
};

/**
 * トークンを無効化する
 */
export const invalidateToken = (db: DatabaseSync, token: string): void => {
  const tokenHash = hashToken(token);
  revokeToken(db, tokenHash);
};
