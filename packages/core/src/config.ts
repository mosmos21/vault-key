import path from 'node:path';
import os from 'node:os';
import type { VaultKeyConfig } from '@core/types';
import { ValidationError } from '@core/utils/errors';
import { logLevelSchema } from '@core/database/schemas';
import {
  loadMasterKey,
  type LoadMasterKeyOptions,
} from '@core/utils/masterKeyLoader';
import { DEFAULT_LOG_FILE_PATH } from '@core/logger/config';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  dbPath: path.join(os.homedir(), '.vaultkey', 'vaultkey.db'),
  authPort: 5432,
  logLevel: 'INFO' as const,
  tokenTtl: 30 * 24 * 60 * 60,
  maxTokensPerUser: 5,
  logFileEnabled: true,
  logFilePath: DEFAULT_LOG_FILE_PATH,
  logConsoleEnabled: true,
};

/**
 * Load configuration from environment variables and options
 *
 * @param options - Master key loading options
 * @returns VaultKey configuration
 */
export const loadConfig = (options?: LoadMasterKeyOptions): VaultKeyConfig => {
  const { masterKey } = loadMasterKey(options);

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

  // ログファイル設定
  const logFileEnabled =
    process.env.VAULTKEY_LOG_FILE_ENABLED?.toLowerCase() !== 'false';
  const logConsoleEnabled =
    process.env.VAULTKEY_LOG_CONSOLE_ENABLED?.toLowerCase() !== 'false';
  const logFilePath =
    process.env.VAULTKEY_LOG_FILE_PATH ?? DEFAULT_CONFIG.logFilePath;

  return {
    dbPath,
    masterKey,
    authPort,
    logLevel,
    tokenTtl,
    maxTokensPerUser,
    logFileEnabled,
    logFilePath,
    logConsoleEnabled,
  };
};
