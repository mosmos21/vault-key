import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import prompts from 'prompts';
import { formatSuccess, formatError, tokenStorage } from '../utils';

type CommandOptions = {
  dbPath?: string;
  masterKey?: string;
  masterKeyFile?: string;
};

/**
 * user コマンドを作成する
 */
export const createUserCommand = (): Command => {
  const command = new Command('user');

  command.description('ユーザー管理');

  // register サブコマンド
  command
    .command('register')
    .description('ユーザーを登録する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (options: CommandOptions) => {
      try {
        const response = await prompts({
          type: 'text',
          name: 'userId',
          message: 'ユーザー ID を入力してください:',
          validate: (value) =>
            value.trim().length > 0 ? true : 'ユーザー ID は必須です',
        });

        if (!response.userId) {
          console.error(formatError('ユーザー登録がキャンセルされました'));
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        await client.registerUser(response.userId.trim());
        client.close();

        console.log(
          formatSuccess(`ユーザー "${response.userId.trim()}" を登録しました`),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`ユーザー登録に失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // login サブコマンド
  command
    .command('login')
    .description('ログインしてトークンを発行する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (options: CommandOptions) => {
      try {
        const response = await prompts({
          type: 'text',
          name: 'userId',
          message: 'ユーザー ID を入力してください:',
          validate: (value) =>
            value.trim().length > 0 ? true : 'ユーザー ID は必須です',
        });

        if (!response.userId) {
          console.error(formatError('ログインがキャンセルされました'));
          process.exit(1);
        }

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        const result = client.issueToken(response.userId.trim());
        const token = result.token;
        client.close();

        // トークンをファイルに保存
        tokenStorage.save(token);

        console.log(formatSuccess('ログインしました'));
        console.log(`トークン: ${token}`);
        console.log(`トークンは ~/.vaultkey/token に保存されました`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`ログインに失敗しました: ${message}`));
        process.exit(1);
      }
    });

  // logout サブコマンド
  command
    .command('logout')
    .description('ログアウトしてトークンファイルを削除する')
    .action(() => {
      try {
        tokenStorage.remove();
        console.log(formatSuccess('ログアウトしました'));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`ログアウトに失敗しました: ${message}`));
        process.exit(1);
      }
    });

  return command;
};
