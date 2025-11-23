import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import {
  formatSuccess,
  formatError,
  formatTokenTable,
  tokenStorage,
} from '../utils';

type CommandOptions = {
  dbPath?: string;
  token?: string;
  masterKey?: string;
  masterKeyFile?: string;
};

/**
 * token コマンドを作成する
 */
export const createTokenCommand = (): Command => {
  const command = new Command('token');

  command.description('トークン管理');

  // revoke サブコマンド
  command
    .command('revoke <token>')
    .description('トークンを無効化する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (targetToken: string, options: CommandOptions) => {
      try {
        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        await client.revokeToken(targetToken);
        client.close();

        console.log(formatSuccess('トークンを無効化しました'));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          formatError(`トークンの無効化に失敗しました: ${message}`),
        );
        process.exit(1);
      }
    });

  // list サブコマンド
  command
    .command('list')
    .description('トークン一覧を取得する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--token <token>', 'アクセストークン')
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

        const tokens = client.listTokens(token);
        client.close();

        console.log(formatTokenTable(tokens));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          formatError(`トークン一覧の取得に失敗しました: ${message}`),
        );
        process.exit(1);
      }
    });

  return command;
};
