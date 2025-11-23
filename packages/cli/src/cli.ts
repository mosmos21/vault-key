#!/usr/bin/env node
import { Command } from 'commander';
import { config } from 'dotenv';
import {
  createInitCommand,
  createUserCommand,
  createSecretCommand,
  createTokenCommand,
} from './commands';

// 環境変数を読み込み
config();

const program = new Command();

program
  .name('vaultkey')
  .description('VaultKey CLI - 機密情報管理の CLI ツール');

// コマンド追加
program.addCommand(createInitCommand());
program.addCommand(createUserCommand());
program.addCommand(createSecretCommand());
program.addCommand(createTokenCommand());

// コマンド実行
program.parse(process.argv);
