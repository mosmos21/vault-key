import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { loadConfig } from '@core/config';
import { ValidationError } from '@core/utils/errors';
import { DEFAULT_MASTER_KEY_FILE } from '@core/utils/masterKeyLoader';
import { TEST_MASTER_KEY } from './fixtures/testData';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // console.log と console.warn をモック化
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    // デフォルトの master key ファイルをクリーンアップ
    if (fs.existsSync(DEFAULT_MASTER_KEY_FILE)) {
      fs.unlinkSync(DEFAULT_MASTER_KEY_FILE);
    }
    vi.restoreAllMocks();
  });

  test('loads config with provided master key', () => {
    const config = loadConfig({ masterKey: TEST_MASTER_KEY });

    expect(config.masterKey).toBe(TEST_MASTER_KEY);
    expect(config.dbPath).toContain('.vaultkey/vaultkey.db');
    expect(config.authPort).toBe(5432);
    expect(config.logLevel).toBe('INFO');
    expect(config.tokenTtl).toBe(30 * 24 * 60 * 60);
    expect(config.maxTokensPerUser).toBe(5);
  });

  test('loads config from environment variables', () => {
    process.env.VAULTKEY_MASTER_KEY = TEST_MASTER_KEY;
    process.env.VAULTKEY_DB_PATH = '/custom/path/db.db';
    process.env.VAULTKEY_AUTH_PORT = '8080';
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.VAULTKEY_TOKEN_TTL = '86400';
    process.env.VAULTKEY_MAX_TOKENS_PER_USER = '10';

    const config = loadConfig();

    expect(config.masterKey).toBe(TEST_MASTER_KEY);
    expect(config.dbPath).toBe('/custom/path/db.db');
    expect(config.authPort).toBe(8080);
    expect(config.logLevel).toBe('DEBUG');
    expect(config.tokenTtl).toBe(86400);
    expect(config.maxTokensPerUser).toBe(10);
  });

  test('generates master key if not provided', () => {
    const config = loadConfig();

    expect(config.masterKey).toHaveLength(64);
    expect(config.masterKey).toMatch(/^[a-f0-9]+$/);
  });

  test('throws ValidationError for invalid master key format', () => {
    expect(() => loadConfig({ masterKey: 'invalid-key' })).toThrow(
      ValidationError,
    );
    expect(() => loadConfig({ masterKey: 'invalid-key' })).toThrow(
      'Invalid master key from CLI option',
    );
  });

  test('throws ValidationError for invalid VAULTKEY_AUTH_PORT', () => {
    process.env.VAULTKEY_AUTH_PORT = 'invalid';

    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      ValidationError,
    );
    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      'VAULTKEY_AUTH_PORT must be a number',
    );
  });

  test('throws ValidationError for invalid VAULTKEY_TOKEN_TTL', () => {
    process.env.VAULTKEY_TOKEN_TTL = 'invalid';

    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      ValidationError,
    );
    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      'VAULTKEY_TOKEN_TTL must be a number',
    );
  });

  test('throws ValidationError for invalid VAULTKEY_MAX_TOKENS_PER_USER', () => {
    process.env.VAULTKEY_MAX_TOKENS_PER_USER = 'invalid';

    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      ValidationError,
    );
    expect(() => loadConfig({ masterKey: TEST_MASTER_KEY })).toThrow(
      'VAULTKEY_MAX_TOKENS_PER_USER must be a number',
    );
  });

  test('uses default values when environment variables are not set', () => {
    delete process.env.VAULTKEY_DB_PATH;
    delete process.env.VAULTKEY_AUTH_PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.VAULTKEY_TOKEN_TTL;
    delete process.env.VAULTKEY_MAX_TOKENS_PER_USER;

    const config = loadConfig({ masterKey: TEST_MASTER_KEY });

    expect(config.dbPath).toContain('.vaultkey/vaultkey.db');
    expect(config.authPort).toBe(5432);
    expect(config.logLevel).toBe('INFO');
    expect(config.tokenTtl).toBe(30 * 24 * 60 * 60);
    expect(config.maxTokensPerUser).toBe(5);
  });

  test('provided master key takes precedence over environment variable', () => {
    process.env.VAULTKEY_MASTER_KEY =
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const config = loadConfig({ masterKey: TEST_MASTER_KEY });

    expect(config.masterKey).toBe(TEST_MASTER_KEY);
  });
});
