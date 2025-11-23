import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadMasterKey,
  saveMasterKeyToFile,
  checkFilePermissions,
  DEFAULT_MASTER_KEY_FILE,
} from '@core/utils/masterKeyLoader';
import { ValidationError } from '@core/utils/errors';
import { TEST_MASTER_KEY } from '../fixtures/testData';

describe('masterKeyLoader', () => {
  const originalEnv = process.env;
  const testDir = path.join(os.tmpdir(), 'vaultkey-test-masterkey');
  const testMasterKeyFile = path.join(testDir, 'test-master.key');

  beforeEach(() => {
    process.env = { ...originalEnv };
    // テスト用ディレクトリを作成
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // デフォルトの master key ファイルが存在する場合は削除
    if (fs.existsSync(DEFAULT_MASTER_KEY_FILE)) {
      fs.unlinkSync(DEFAULT_MASTER_KEY_FILE);
    }
    // console.log と console.warn をモック化
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    // テストファイルをクリーンアップ
    if (fs.existsSync(testMasterKeyFile)) {
      fs.unlinkSync(testMasterKeyFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
    // デフォルトの master key ファイルをクリーンアップ
    if (fs.existsSync(DEFAULT_MASTER_KEY_FILE)) {
      fs.unlinkSync(DEFAULT_MASTER_KEY_FILE);
    }
    vi.restoreAllMocks();
  });

  describe('saveMasterKeyToFile', () => {
    test('saves master key to file with correct permissions', () => {
      saveMasterKeyToFile(TEST_MASTER_KEY, testMasterKeyFile);

      expect(fs.existsSync(testMasterKeyFile)).toBe(true);

      const content = fs.readFileSync(testMasterKeyFile, 'utf-8');
      expect(content).toBe(TEST_MASTER_KEY);

      const stats = fs.statSync(testMasterKeyFile);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    test('creates directory if it does not exist', () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'master.key');

      saveMasterKeyToFile(TEST_MASTER_KEY, nestedFile);

      expect(fs.existsSync(nestedFile)).toBe(true);

      const content = fs.readFileSync(nestedFile, 'utf-8');
      expect(content).toBe(TEST_MASTER_KEY);

      fs.unlinkSync(nestedFile);
      fs.rmdirSync(path.join(testDir, 'nested', 'dir'));
      fs.rmdirSync(path.join(testDir, 'nested'));
    });

    test('throws error for invalid master key format', () => {
      expect(() => {
        saveMasterKeyToFile('invalid-key', testMasterKeyFile);
      }).toThrow(ValidationError);
    });
  });

  describe('checkFilePermissions', () => {
    test('returns true for correct permissions (600)', () => {
      fs.writeFileSync(testMasterKeyFile, TEST_MASTER_KEY, { mode: 0o600 });

      const result = checkFilePermissions(testMasterKeyFile);

      expect(result).toBe(true);
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('returns false and warns for incorrect permissions', () => {
      fs.writeFileSync(testMasterKeyFile, TEST_MASTER_KEY, { mode: 0o644 });

      const result = checkFilePermissions(testMasterKeyFile);

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Master key file'),
      );
    });

    test('returns false and warns if file does not exist', () => {
      const result = checkFilePermissions('/nonexistent/file');

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Failed to check file permissions'),
      );
    });
  });

  describe('loadMasterKey', () => {
    test('loads master key from CLI option --master-key', () => {
      const result = loadMasterKey({ masterKey: TEST_MASTER_KEY });

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('option');
      expect(result.filePath).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        'Master key loaded from CLI option --master-key',
      );
    });

    test('loads master key from CLI option --master-key-file', () => {
      fs.writeFileSync(testMasterKeyFile, TEST_MASTER_KEY, { mode: 0o600 });

      const result = loadMasterKey({ masterKeyFile: testMasterKeyFile });

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('option-file');
      expect(result.filePath).toBe(testMasterKeyFile);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Master key loaded from file specified by CLI option',
        ),
      );
    });

    test('loads master key from environment variable VAULTKEY_ENCRYPTION_KEY', () => {
      process.env.VAULTKEY_ENCRYPTION_KEY = TEST_MASTER_KEY;

      const result = loadMasterKey();

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('env-direct');
      expect(result.filePath).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        'Master key loaded from environment variable VAULTKEY_ENCRYPTION_KEY',
      );
    });

    test('loads master key from environment variable VAULTKEY_MASTER_KEY', () => {
      process.env.VAULTKEY_MASTER_KEY = TEST_MASTER_KEY;

      const result = loadMasterKey();

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('env-direct');
      expect(result.filePath).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        'Master key loaded from environment variable VAULTKEY_MASTER_KEY',
      );
    });

    test('prefers VAULTKEY_ENCRYPTION_KEY over VAULTKEY_MASTER_KEY', () => {
      const alternativeKey =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      process.env.VAULTKEY_ENCRYPTION_KEY = TEST_MASTER_KEY;
      process.env.VAULTKEY_MASTER_KEY = alternativeKey;

      const result = loadMasterKey();

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('env-direct');
      expect(console.log).toHaveBeenCalledWith(
        'Master key loaded from environment variable VAULTKEY_ENCRYPTION_KEY',
      );
    });

    test('loads master key from environment variable VAULTKEY_MASTER_KEY_FILE', () => {
      fs.writeFileSync(testMasterKeyFile, TEST_MASTER_KEY, { mode: 0o600 });
      process.env.VAULTKEY_MASTER_KEY_FILE = testMasterKeyFile;

      const result = loadMasterKey();

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('env-file');
      expect(result.filePath).toBe(testMasterKeyFile);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Master key loaded from file specified by environment variable',
        ),
      );
    });

    test('loads master key from default file', () => {
      fs.writeFileSync(DEFAULT_MASTER_KEY_FILE, TEST_MASTER_KEY, {
        mode: 0o600,
      });

      const result = loadMasterKey();

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('default-file');
      expect(result.filePath).toBe(DEFAULT_MASTER_KEY_FILE);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Master key loaded from default file'),
      );
    });

    test('generates and saves master key if no other source is available', () => {
      const result = loadMasterKey();

      expect(result.masterKey).toHaveLength(64);
      expect(result.masterKey).toMatch(/^[a-f0-9]+$/);
      expect(result.source).toBe('generated');
      expect(result.filePath).toBe(DEFAULT_MASTER_KEY_FILE);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Master key generated and saved to default file',
        ),
      );

      expect(fs.existsSync(DEFAULT_MASTER_KEY_FILE)).toBe(true);
      const stats = fs.statSync(DEFAULT_MASTER_KEY_FILE);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    test('throws error for invalid master key from CLI option', () => {
      expect(() => {
        loadMasterKey({ masterKey: 'invalid-key' });
      }).toThrow(ValidationError);
    });

    test('throws error for invalid master key in file', () => {
      fs.writeFileSync(testMasterKeyFile, 'invalid-key', { mode: 0o600 });

      expect(() => {
        loadMasterKey({ masterKeyFile: testMasterKeyFile });
      }).toThrow(ValidationError);
    });

    test('throws error if master key file does not exist', () => {
      expect(() => {
        loadMasterKey({ masterKeyFile: '/nonexistent/file' });
      }).toThrow(ValidationError);
    });

    test('CLI option --master-key has highest priority', () => {
      const alternativeKey =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      fs.writeFileSync(testMasterKeyFile, alternativeKey, { mode: 0o600 });
      process.env.VAULTKEY_ENCRYPTION_KEY = alternativeKey;

      const result = loadMasterKey({ masterKey: TEST_MASTER_KEY });

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('option');
    });

    test('CLI option --master-key-file has priority over environment variables', () => {
      const alternativeKey =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      fs.writeFileSync(testMasterKeyFile, TEST_MASTER_KEY, { mode: 0o600 });
      process.env.VAULTKEY_ENCRYPTION_KEY = alternativeKey;

      const result = loadMasterKey({ masterKeyFile: testMasterKeyFile });

      expect(result.masterKey).toBe(TEST_MASTER_KEY);
      expect(result.source).toBe('option-file');
    });
  });
});
