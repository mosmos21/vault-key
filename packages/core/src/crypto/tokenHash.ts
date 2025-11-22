import crypto from 'node:crypto';

/**
 * Hash token with SHA-256
 *
 * @param token - Token (hex string, 64 characters)
 * @returns Token hash (hex string)
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
};

/**
 * Generate token
 *
 * @returns Token (hex string, 64 characters)
 */
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
