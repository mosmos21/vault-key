import type { LogLevel } from '@core/database/schemas';

/**
 * ログメタデータの型
 */
export type LogMetadata = Record<string, unknown>;

/**
 * ロガー設定の型
 */
export type LoggerConfig = {
  logLevel: LogLevel;
  consoleEnabled: boolean;
  fileEnabled: boolean;
  filePath: string;
};
