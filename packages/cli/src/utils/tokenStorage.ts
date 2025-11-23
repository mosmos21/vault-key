import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VAULTKEY_DIR = join(homedir(), '.vaultkey');
const TOKEN_FILE = join(VAULTKEY_DIR, 'token');

/**
 * トークンストレージ
 */
export const tokenStorage = {
  /**
   * トークンを保存する
   */
  save: (token: string): void => {
    if (!existsSync(VAULTKEY_DIR)) {
      mkdirSync(VAULTKEY_DIR, { recursive: true });
    }
    writeFileSync(TOKEN_FILE, token, 'utf-8');
  },

  /**
   * トークンを読み込む
   */
  load: (): string | null => {
    if (!existsSync(TOKEN_FILE)) {
      return null;
    }
    return readFileSync(TOKEN_FILE, 'utf-8').trim();
  },

  /**
   * トークンを削除する
   */
  remove: (): void => {
    if (existsSync(TOKEN_FILE)) {
      unlinkSync(TOKEN_FILE);
    }
  },

  /**
   * トークンを取得する (優先順位: --token > トークンファイル > 環境変数)
   */
  get: (tokenOption?: string): string | null => {
    if (tokenOption) {
      return tokenOption;
    }

    const fileToken = tokenStorage.load();
    if (fileToken) {
      return fileToken;
    }

    const envToken = process.env.VAULTKEY_TOKEN;
    if (envToken) {
      return envToken;
    }

    return null;
  },
};
