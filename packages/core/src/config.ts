import path from 'node:path';
import os from 'node:os';
import type { VaultKeyConfig } from './types';
import { generateMasterKey } from './crypto';
import { ValidationError } from './utils/errors';
import { validateMasterKey } from './utils/validators';
import { logLevelSchema } from './database/schemas';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  dbPath: path.join(os.homedir(), '.vaultkey', 'vaultkey.db'),
  authPort: 5432,
  logLevel: 'INFO' as const,
  tokenTtl: 30 * 24 * 60 * 60,
  maxTokensPerUser: 5,
};

/**
 * Load configuration from environment variables
 *
 * @param masterKey - Master key (if omitted, read from environment variables)
 * @returns VaultKey configuration
 */
export const loadConfig = (masterKey?: string): VaultKeyConfig => {
  const resolvedMasterKey =
    masterKey ?? process.env.VAULTKEY_MASTER_KEY ?? generateMasterKey();

  try {
    validateMasterKey(resolvedMasterKey);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        `Master key format is invalid: ${error.message}`,
      );
    }
    throw error;
  }

  const dbPath = process.env.VAULTKEY_DB_PATH ?? DEFAULT_CONFIG.dbPath;
  const authPort = process.env.VAULTKEY_AUTH_PORT
    ? Number.parseInt(process.env.VAULTKEY_AUTH_PORT, 10)
    : DEFAULT_CONFIG.authPort;

  // 環境変数から LOG_LEVEL を取得し、Zod で検証
  let logLevel: VaultKeyConfig['logLevel'] = DEFAULT_CONFIG.logLevel;
  if (process.env.LOG_LEVEL) {
    const parsedLogLevel = logLevelSchema.safeParse(process.env.LOG_LEVEL);
    if (parsedLogLevel.success) {
      logLevel = parsedLogLevel.data;
    }
    // 不正な値の場合はデフォルト値を使用 (エラーを投げない)
  }

  const tokenTtl = process.env.VAULTKEY_TOKEN_TTL
    ? Number.parseInt(process.env.VAULTKEY_TOKEN_TTL, 10)
    : DEFAULT_CONFIG.tokenTtl;
  const maxTokensPerUser = process.env.VAULTKEY_MAX_TOKENS_PER_USER
    ? Number.parseInt(process.env.VAULTKEY_MAX_TOKENS_PER_USER, 10)
    : DEFAULT_CONFIG.maxTokensPerUser;

  if (Number.isNaN(authPort)) {
    throw new ValidationError('VAULTKEY_AUTH_PORT must be a number');
  }

  if (Number.isNaN(tokenTtl)) {
    throw new ValidationError('VAULTKEY_TOKEN_TTL must be a number');
  }

  if (Number.isNaN(maxTokensPerUser)) {
    throw new ValidationError('VAULTKEY_MAX_TOKENS_PER_USER must be a number');
  }

  return {
    dbPath,
    masterKey: resolvedMasterKey,
    authPort,
    logLevel,
    tokenTtl,
    maxTokensPerUser,
  };
};
