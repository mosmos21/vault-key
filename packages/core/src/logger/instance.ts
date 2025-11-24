import { createLogger } from './logger';
import { loadLoggerConfig } from './config';
import { logLevelSchema } from '@core/database/schemas';

// 環境変数から VAULTKEY_LOG_LEVEL を取得
let logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' = 'INFO';
if (process.env.VAULTKEY_LOG_LEVEL) {
  const parsedLogLevel = logLevelSchema.safeParse(
    process.env.VAULTKEY_LOG_LEVEL,
  );
  if (parsedLogLevel.success) {
    logLevel = parsedLogLevel.data;
  }
}

// グローバルロガーインスタンスを作成
const loggerConfig = loadLoggerConfig(logLevel);
export const logger = createLogger(loggerConfig);
