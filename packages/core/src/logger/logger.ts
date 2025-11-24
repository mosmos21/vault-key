import fs from 'node:fs';
import type { LogLevel } from '@core/database/schemas';
import type { LoggerConfig, LogMetadata } from './types';
import { formatLogMessage, ensureDirectoryExists } from './utils';

/**
 * ログレベルの優先度を数値で表現
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
};

/**
 * Logger を作成
 */
export const createLogger = (config: LoggerConfig) => {
  let fileDescriptor: number | null = null;

  // ファイル出力が有効な場合、ファイルを開く
  if (config.fileEnabled) {
    try {
      ensureDirectoryExists(config.filePath);
      fileDescriptor = fs.openSync(config.filePath, 'a');
    } catch (error) {
      console.error(
        `Failed to open log file: ${config.filePath}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * ログを出力
   */
  const log = (level: LogLevel, message: string, metadata?: LogMetadata) => {
    // ログレベルによるフィルタリング
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[config.logLevel]) {
      return;
    }

    const formattedMessage = formatLogMessage(level, message, metadata);

    // コンソール出力
    if (config.consoleEnabled) {
      if (level === 'ERROR' || level === 'CRITICAL') {
        console.error(formattedMessage);
      } else if (level === 'WARNING') {
        console.warn(formattedMessage);
      } else {
        // eslint-disable-next-line no-console
        console.log(formattedMessage);
      }
    }

    // ファイル出力
    if (config.fileEnabled && fileDescriptor !== null) {
      try {
        fs.writeSync(fileDescriptor, `${formattedMessage}\n`);
      } catch (error) {
        console.error(
          'Failed to write to log file:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  };

  return {
    debug: (message: string, metadata?: LogMetadata) =>
      log('DEBUG', message, metadata),
    info: (message: string, metadata?: LogMetadata) =>
      log('INFO', message, metadata),
    warning: (message: string, metadata?: LogMetadata) =>
      log('WARNING', message, metadata),
    error: (message: string, metadata?: LogMetadata) =>
      log('ERROR', message, metadata),
    critical: (message: string, metadata?: LogMetadata) =>
      log('CRITICAL', message, metadata),
    shutdown: () => {
      if (fileDescriptor !== null) {
        try {
          fs.closeSync(fileDescriptor);
          fileDescriptor = null;
        } catch (error) {
          console.error(
            'Failed to close log file:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    },
  };
};

export type Logger = ReturnType<typeof createLogger>;
