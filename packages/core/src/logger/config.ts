import os from 'node:os';
import path from 'node:path';
import type { LogLevel } from '@core/database/schemas';
import type { LoggerConfig } from './types';

/**
 * デフォルトのログファイルパス
 */
export const DEFAULT_LOG_FILE_PATH = path.join(
  os.homedir(),
  '.vaultkey',
  'logs',
  'vaultkey.log',
);

/**
 * 環境変数からロガー設定を読み込む
 */
export const loadLoggerConfig = (logLevel: LogLevel): LoggerConfig => {
  const fileEnabled =
    process.env.VAULTKEY_LOG_FILE_ENABLED?.toLowerCase() !== 'false';
  const consoleEnabled =
    process.env.VAULTKEY_LOG_CONSOLE_ENABLED?.toLowerCase() !== 'false';
  const filePath = process.env.VAULTKEY_LOG_FILE_PATH ?? DEFAULT_LOG_FILE_PATH;

  return {
    logLevel,
    consoleEnabled,
    fileEnabled,
    filePath,
  };
};
