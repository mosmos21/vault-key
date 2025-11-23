import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import {
  formatSuccess,
  formatError,
  formatTokenTable,
  tokenStorage,
} from '../utils';

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
    .action(async (targetToken: string, options: { dbPath?: string }) => {
      try {
        const client = new VaultKeyClient(
          options.dbPath ? { dbPath: options.dbPath } : undefined,
        );

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
    .action(async (options: { dbPath?: string; token?: string }) => {
      try {
        const token = tokenStorage.get(options.token);
        if (!token) {
          console.error(
            formatError('トークンが見つかりません。先にログインしてください'),
          );
          process.exit(1);
        }

        const client = new VaultKeyClient(
          options.dbPath ? { dbPath: options.dbPath } : undefined,
        );

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
