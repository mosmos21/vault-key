import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execa } from 'execa';
import { createConnection, closeConnection, createUser } from '@core/database';
import { issueToken } from '@core/auth/tokenManager';
import type { DatabaseSync } from 'node:sqlite';

const TEST_DB_DIR = join(tmpdir(), 'vaultkey-cli-test');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test.db');
const CLI_PATH = join(__dirname, '../src/cli.ts');
// テスト用の固定マスターキー (32 バイト)
const TEST_MASTER_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const runCLI = (args: string[], options?: { input?: string }) => {
  return execa('pnpm', ['exec', 'tsx', CLI_PATH, ...args], {
    ...options,
    env: {
      VAULTKEY_MASTER_KEY: TEST_MASTER_KEY,
    },
    extendEnv: true,
  });
};

/**
 * テスト用にユーザーとトークンを直接データベースに作成するヘルパー
 */
const setupTestUserAndToken = (
  db: DatabaseSync,
  userId: string,
): { token: string } => {
  createUser(db, { userId });
  const result = issueToken(db, userId, 3600, 5);
  return { token: result.token };
};

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DB_DIR)) {
      mkdirSync(TEST_DB_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true });
    }
  });

  describe('init コマンド', () => {
    it('データベースを初期化できる', async () => {
      const { stdout } = await runCLI(['init', '--db-path', TEST_DB_PATH]);

      expect(stdout).toContain('データベースを初期化しました');
      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });
  });

  describe('user コマンド', () => {
    beforeEach(async () => {
      await runCLI(['init', '--db-path', TEST_DB_PATH]);
    });

    // Passkey 認証はブラウザ操作が必要なため、自動テストはスキップ
    it.skip('ユーザー登録ができる (要ブラウザ操作)', async () => {
      // 注意: Passkey 登録はブラウザでの WebAuthn 操作が必要
    });

    it.skip('ログインしてトークンを取得できる (要ブラウザ操作)', async () => {
      // 注意: Passkey 認証はブラウザでの WebAuthn 操作が必要
    });
  });

  describe('secret コマンド', () => {
    let token: string;
    let db: DatabaseSync;

    beforeEach(async () => {
      await runCLI(['init', '--db-path', TEST_DB_PATH]);

      // 直接データベースにアクセスしてユーザーとトークンを作成
      db = createConnection(TEST_DB_PATH);
      const result = setupTestUserAndToken(db, 'test-user');
      token = result.token;
      closeConnection(db);
    });

    it('機密情報を保存できる', async () => {
      const { stdout } = await runCLI(
        [
          'secret',
          'set',
          'test-key',
          '--db-path',
          TEST_DB_PATH,
          '--token',
          token,
        ],
        {
          input: 'test-value\n',
        },
      );

      expect(stdout).toContain('機密情報 "test-key" を保存しました');
    });

    it('機密情報を取得できる', async () => {
      await runCLI(
        [
          'secret',
          'set',
          'test-key',
          '--db-path',
          TEST_DB_PATH,
          '--token',
          token,
        ],
        {
          input: 'test-value\n',
        },
      );

      const { stdout } = await runCLI([
        'secret',
        'get',
        'test-key',
        '--db-path',
        TEST_DB_PATH,
        '--token',
        token,
      ]);

      // dotenv のメッセージが含まれる可能性があるため、最後の行のみをチェック
      const lines = stdout.trim().split('\n');
      expect(lines[lines.length - 1]).toBe('test-value');
    });

    it('機密情報を更新できる', async () => {
      await runCLI(
        [
          'secret',
          'set',
          'test-key',
          '--db-path',
          TEST_DB_PATH,
          '--token',
          token,
        ],
        {
          input: 'test-value\n',
        },
      );

      const { stdout } = await runCLI(
        [
          'secret',
          'update',
          'test-key',
          '--db-path',
          TEST_DB_PATH,
          '--token',
          token,
        ],
        {
          input: 'updated-value\n',
        },
      );

      expect(stdout).toContain('機密情報 "test-key" を更新しました');

      const { stdout: getValue } = await runCLI([
        'secret',
        'get',
        'test-key',
        '--db-path',
        TEST_DB_PATH,
        '--token',
        token,
      ]);
      const lines = getValue.trim().split('\n');
      expect(lines[lines.length - 1]).toBe('updated-value');
    });

    it('機密情報を削除できる', async () => {
      await runCLI(
        [
          'secret',
          'set',
          'test-key',
          '--db-path',
          TEST_DB_PATH,
          '--token',
          token,
        ],
        {
          input: 'test-value\n',
        },
      );

      const { stdout } = await runCLI([
        'secret',
        'delete',
        'test-key',
        '--db-path',
        TEST_DB_PATH,
        '--token',
        token,
      ]);

      expect(stdout).toContain('機密情報 "test-key" を削除しました');
    });

    it('機密情報一覧を取得できる', async () => {
      await runCLI(
        ['secret', 'set', 'key1', '--db-path', TEST_DB_PATH, '--token', token],
        {
          input: 'value1\n',
        },
      );
      await runCLI(
        ['secret', 'set', 'key2', '--db-path', TEST_DB_PATH, '--token', token],
        {
          input: 'value2\n',
        },
      );

      const { stdout } = await runCLI([
        'secret',
        'list',
        '--db-path',
        TEST_DB_PATH,
        '--token',
        token,
      ]);

      expect(stdout).toContain('key1');
      expect(stdout).toContain('key2');
    });
  });

  describe('token コマンド', () => {
    let token: string;
    let db: DatabaseSync;

    beforeEach(async () => {
      await runCLI(['init', '--db-path', TEST_DB_PATH]);

      // 直接データベースにアクセスしてユーザーとトークンを作成
      db = createConnection(TEST_DB_PATH);
      const result = setupTestUserAndToken(db, 'test-user');
      token = result.token;
      closeConnection(db);
    });

    it('トークン一覧を取得できる', async () => {
      const { stdout } = await runCLI([
        'token',
        'list',
        '--db-path',
        TEST_DB_PATH,
        '--token',
        token,
      ]);

      expect(stdout).toContain('Token Hash');
      expect(stdout).toContain('test-user');
    });

    it('トークンを無効化できる', async () => {
      const { stdout } = await runCLI([
        'token',
        'revoke',
        token,
        '--db-path',
        TEST_DB_PATH,
      ]);

      expect(stdout).toContain('トークンを無効化しました');
    });
  });
});
