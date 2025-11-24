import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createLogger,
  loadLoggerConfig,
  formatLogMessage,
  formatMetadata,
} from '../src/logger';
import type { LoggerConfig } from '../src/logger';

describe('Logger', () => {
  const testLogFile = path.join(os.tmpdir(), 'test-vaultkey.log');
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // console メソッドをスパイ
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // テストログファイルを削除
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    // スパイをリストア
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // テストログファイルを削除
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  describe('formatMetadata', () => {
    it('should format metadata as key=value pairs', () => {
      const metadata = { userId: 'user1', action: 'login' };
      const formatted = formatMetadata(metadata);
      expect(formatted).toBe('userId=user1 action=login');
    });

    it('should handle empty metadata', () => {
      const metadata = {};
      const formatted = formatMetadata(metadata);
      expect(formatted).toBe('');
    });
  });

  describe('formatLogMessage', () => {
    it('should format log message with timestamp and level', () => {
      const message = formatLogMessage('INFO', 'Test message');
      expect(message).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message$/,
      );
    });

    it('should include metadata in formatted message', () => {
      const message = formatLogMessage('INFO', 'Test message', {
        key: 'value',
      });
      expect(message).toMatch(
        /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message key=value$/,
      );
    });
  });

  describe('loadLoggerConfig', () => {
    it('should load default configuration', () => {
      const config = loadLoggerConfig('INFO');
      expect(config.logLevel).toBe('INFO');
      expect(config.consoleEnabled).toBe(true);
      expect(config.fileEnabled).toBe(true);
      expect(config.filePath).toContain('.vaultkey/logs/vaultkey.log');
    });

    it('should respect VAULTKEY_LOG_FILE_ENABLED environment variable', () => {
      process.env.VAULTKEY_LOG_FILE_ENABLED = 'false';
      const config = loadLoggerConfig('INFO');
      expect(config.fileEnabled).toBe(false);
      delete process.env.VAULTKEY_LOG_FILE_ENABLED;
    });

    it('should respect VAULTKEY_LOG_CONSOLE_ENABLED environment variable', () => {
      process.env.VAULTKEY_LOG_CONSOLE_ENABLED = 'false';
      const config = loadLoggerConfig('INFO');
      expect(config.consoleEnabled).toBe(false);
      delete process.env.VAULTKEY_LOG_CONSOLE_ENABLED;
    });
  });

  describe('createLogger', () => {
    it('should log to console when consoleEnabled is true', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: true,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test message'),
      );

      logger.shutdown();
    });

    it('should not log to console when consoleEnabled is false', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: false,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.info('Test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      logger.shutdown();
    });

    it('should log to file when fileEnabled is true', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: false,
        fileEnabled: true,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.info('Test message');
      logger.shutdown();

      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('[INFO] Test message');
    });

    it('should filter logs based on log level', () => {
      const config: LoggerConfig = {
        logLevel: 'WARNING',
        consoleEnabled: true,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warning('Warning message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARNING] Warning message'),
      );

      logger.shutdown();
    });

    it('should include metadata in log messages', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: true,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.info('User action', { userId: 'user123', action: 'login' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId=user123 action=login'),
      );

      logger.shutdown();
    });

    it('should log ERROR to console.error', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: true,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error message'),
      );

      logger.shutdown();
    });

    it('should log WARNING to console.warn', () => {
      const config: LoggerConfig = {
        logLevel: 'INFO',
        consoleEnabled: true,
        fileEnabled: false,
        filePath: testLogFile,
      };
      const logger = createLogger(config);

      logger.warning('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARNING] Warning message'),
      );

      logger.shutdown();
    });
  });
});
