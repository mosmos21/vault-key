import crypto from 'node:crypto';
import { CryptoError } from '../utils/errors';

const deriveKey = (masterKey: string): Buffer => {
  return Buffer.from(masterKey, 'hex');
};

export const encrypt = (value: string, masterKey: string): string => {
  try {
    const key = deriveKey(masterKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    const ivStr = iv.toString('base64');
    const authTagStr = authTag.toString('base64');

    return `${ivStr}:${authTagStr}:${encrypted}`;
  } catch (error) {
    throw new CryptoError(
      `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const decrypt = (encryptedValue: string, masterKey: string): string => {
  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new CryptoError('Invalid encrypted value format');
    }

    const ivBase64 = parts[0];
    const authTagBase64 = parts[1];
    const encryptedBase64 = parts[2];

    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new CryptoError('Invalid encrypted value format');
    }

    const key = deriveKey(masterKey);
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new CryptoError(
      `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const generateMasterKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
