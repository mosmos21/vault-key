import { DatabaseSync } from 'node:sqlite';
import { DecryptedSecret, ListSecretsOptions } from '@core/types';
import { encrypt, decrypt } from '@core/crypto/encryption';
import {
  createSecret,
  getSecret,
  updateSecret,
  deleteSecret,
  listSecrets,
  updateSecretLastAccessed,
} from '@core/database/repositories/secretRepository';
import { NotFoundError, ValidationError } from '@core/utils/errors';

/**
 * 機密情報を保存する
 */
export const saveSecret = (
  db: DatabaseSync,
  userId: string,
  key: string,
  value: string,
  masterKey: string,
  expiresAt: string | null = null,
): void => {
  if (!key || key.trim() === '') {
    throw new ValidationError('Key is required');
  }

  if (!value || value.trim() === '') {
    throw new ValidationError('Value is required');
  }

  const encryptedValue = encrypt(value, masterKey);
  const encryptedValueBase64 = Buffer.from(encryptedValue, 'utf8').toString(
    'base64',
  );

  const existing = getSecret(db, userId, key);
  if (existing) {
    updateSecret(db, {
      userId,
      key,
      encryptedValue: encryptedValueBase64,
      expiresAt,
      updatedBy: userId,
    });
  } else {
    createSecret(db, {
      userId,
      key,
      encryptedValue: encryptedValueBase64,
      expiresAt,
      createdBy: userId,
    });
  }
};

/**
 * 機密情報を取得する (復号化して返す)
 */
export const retrieveSecret = (
  db: DatabaseSync,
  userId: string,
  key: string,
  masterKey: string,
): DecryptedSecret => {
  const secret = getSecret(db, userId, key);

  if (!secret) {
    throw new NotFoundError(`Secret not found: ${key}`);
  }

  if (secret.expiresAt && new Date(secret.expiresAt) < new Date()) {
    throw new NotFoundError(`Secret expired: ${key}`);
  }

  updateSecretLastAccessed(db, userId, key);

  const encryptedValueString = Buffer.from(
    secret.encryptedValue,
    'base64',
  ).toString('utf8');
  const decryptedValue = decrypt(encryptedValueString, masterKey);

  return {
    key: secret.key,
    value: decryptedValue,
    expiresAt: secret.expiresAt,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  };
};

/**
 * 機密情報を削除する
 */
export const removeSecret = (
  db: DatabaseSync,
  userId: string,
  key: string,
): void => {
  const secret = getSecret(db, userId, key);

  if (!secret) {
    throw new NotFoundError(`Secret not found: ${key}`);
  }

  deleteSecret(db, userId, key);
};

/**
 * 機密情報の一覧を取得する (値は含まない)
 */
export const listAllSecrets = (
  db: DatabaseSync,
  userId: string,
  options: ListSecretsOptions = {},
): Array<{
  key: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}> => {
  const secrets = listSecrets(db, userId, options);

  return secrets.map((secret) => ({
    key: secret.key,
    expiresAt: secret.expiresAt,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }));
};
