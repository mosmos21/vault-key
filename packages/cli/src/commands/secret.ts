import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import prompts from 'prompts';
import {
  formatSuccess,
  formatError,
  formatSecretList,
  tokenStorage,
} from '../utils';

type CommandOptions = {
  dbPath?: string;
  token?: string;
  masterKey?: string;
  masterKeyFile?: string;
  pattern?: string;
};

/**
 * secret コマンドを作成する
 */
export const createSecretCommand = (): Command => {
  const command = new Command('secret');

  command.description('機密情報管理');

  // get サブコマンド
  command
    .command('get <key>')
    .description('機密情報を取得する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (key: string, options: CommandOptions) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        const secret = await client.getSecret(key, token);
        client.close();

        console.log(secret.value);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`機密情報の取得に失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // set サブコマンド
  command
    .command('set <key>')
    .description('機密情報を保存する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (key: string, options: CommandOptions) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const response = await prompts({
          type: 'password',
          name: 'value',
          message: '機密情報の値を入力してください:',
          validate: (value) => (value.length > 0 ? true : '値は必須です'),
        });

        if (!response.value) {
          console.error(formatError('機密情報の保存がキャンセルされました'));
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        await client.storeSecret(key, response.value, token);
        client.close();

        console.log(formatSuccess(`機密情報 "${key}" を保存しました`));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`機密情報の保存に失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // update サブコマンド
  command
    .command('update <key>')
    .description('機密情報を更新する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (key: string, options: CommandOptions) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const response = await prompts({
          type: 'password',
          name: 'value',
          message: '新しい機密情報の値を入力してください:',
          validate: (value) => (value.length > 0 ? true : '値は必須です'),
        });

        if (!response.value) {
          console.error(formatError('機密情報の更新がキャンセルされました'));
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        await client.updateSecret(key, response.value, token);
        client.close();

        console.log(formatSuccess(`機密情報 "${key}" を更新しました`));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`機密情報の更新に失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // delete サブコマンド
  command
    .command('delete <key>')
    .description('機密情報を削除する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (key: string, options: CommandOptions) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        await client.deleteSecret(key, token);
        client.close();

        console.log(formatSuccess(`機密情報 "${key}" を削除しました`));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`機密情報の削除に失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // list サブコマンド
  command
    .command('list')
    .description('機密情報のキー一覧を取得する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
    .option('--pattern <pattern>', 'キー名のフィルターパターン')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (options: CommandOptions) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        const secrets = client.listSecrets(token, options.pattern);
        client.close();

        const keys = secrets.map((s) => s.key);
        console.log(formatSecretList(keys));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          formatError(`機密情報一覧の取得に失敗しました: ${message}`),
        );
        process.exit(1);
      }
    });

  return command;
};
