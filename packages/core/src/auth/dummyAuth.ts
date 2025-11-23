import { DatabaseSync } from 'node:sqlite';
import {
  createUser,
  getUserById,
} from '@core/database/repositories/userRepository';
import { AuthenticationError } from '@core/utils/errors';

/**
 * ダミー認証を実行し、ユーザー ID を返す
 * v0.1.0 用の簡易認証実装
 * ユーザーが存在しない場合は新規作成する
 */
export const authenticateDummy = (db: DatabaseSync, userId: string): string => {
  if (!userId || userId.trim() === '') {
    throw new AuthenticationError('User ID is required');
  }

  const existingUser = getUserById(db, userId);
  if (existingUser) {
    return existingUser.userId;
  }

  createUser(db, {
    userId,
    credentialId: `dummy-${userId}`,
    publicKey: JSON.stringify({ dummy: true }),
  });

  return userId;
};
