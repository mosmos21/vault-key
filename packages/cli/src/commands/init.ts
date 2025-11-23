import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import { formatSuccess, formatError } from '../utils';

type CommandOptions = {
  dbPath?: string;
  masterKey?: string;
  masterKeyFile?: string;
};

/**
 * init コマンドを作成する
 */
export const createInitCommand = (): Command => {
  const command = new Command('init');

  command
    .description('データベースを初期化する')
    .option('--db-path <path>', 'データベースファイルのパス')
    .option('--master-key <key>', 'マスターキー (64 文字の 16 進数文字列)')
    .option('--master-key-file <path>', 'マスターキーファイルのパス')
    .action(async (options: CommandOptions) => {
      try {
        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        client.close();

        console.log(formatSuccess('データベースを初期化しました'));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          formatError(`データベースの初期化に失敗しました: ${message}`),
        );
        process.exit(1);
      }
    });

  return command;
};
