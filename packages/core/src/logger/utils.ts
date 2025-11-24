import fs from 'node:fs';
import path from 'node:path';
import type { LogLevel } from '@core/database/schemas';
import type { LogMetadata } from './types';

/**
 * ログメッセージをフォーマット
 */
export const formatLogMessage = (
  level: LogLevel,
  message: string,
  metadata?: LogMetadata,
): string => {
  const timestamp = new Date().toISOString();
  const metadataStr = metadata ? ` ${formatMetadata(metadata)}` : '';
  return `[${timestamp}] [${level}] ${message}${metadataStr}`;
};

/**
 * メタデータを文字列に変換
 */
export const formatMetadata = (metadata: LogMetadata): string => {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
};

/**
 * ディレクトリが存在しない場合は作成
 */
export const ensureDirectoryExists = (filePath: string): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
