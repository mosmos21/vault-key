import { DatabaseSync } from 'node:sqlite';
import type { VaultKeyConfig, DecryptedSecret, Token } from './types';
import { loadConfig } from './config';
import { createConnection, closeConnection } from './database';
import { authenticateDummy } from './auth/dummyAuth';
import { issueToken, verifyToken, invalidateToken } from './auth/tokenManager';
import {
  saveSecret,
  retrieveSecret,
  removeSecret,
  listAllSecrets,
} from './secrets/secretsService';
import { listUserTokens } from './database/repositories/tokenRepository';

/**
 * VaultKey のクライアントクラス
 * 機密情報の管理、ユーザー認証、トークン管理などの API を提供する
 */
export class VaultKeyClient {
  private db: DatabaseSync;
  private config: VaultKeyConfig;

  constructor(config?: Partial<VaultKeyConfig>) {
    this.config = loadConfig(config?.masterKey);

    if (config?.dbPath) {
      this.config.dbPath = config.dbPath;
    }
    if (config?.authPort !== undefined) {
      this.config.authPort = config.authPort;
    }
    if (config?.logLevel) {
      this.config.logLevel = config.logLevel;
    }
    if (config?.tokenTtl !== undefined) {
      this.config.tokenTtl = config.tokenTtl;
    }
    if (config?.maxTokensPerUser !== undefined) {
      this.config.maxTokensPerUser = config.maxTokensPerUser;
    }

    this.db = createConnection(this.config.dbPath);
  }

  /**
   * ユーザーを登録する (ダミー認証)
   * v0.1.0 用の簡易実装
   */
  registerUser(userId: string): void {
    authenticateDummy(this.db, userId);
  }

  /**
   * トークンを発行する (ダミー認証)
   * v0.1.0 用の簡易実装
   */
  issueToken(
    userId: string,
    expiresIn?: number,
  ): { token: string; tokenHash: string; expiresAt: string } {
    const tokenTtl = expiresIn ?? this.config.tokenTtl;
    return issueToken(this.db, userId, tokenTtl, this.config.maxTokensPerUser);
  }

  /**
   * 機密情報を取得する
   */
  getSecret(key: string, token: string): DecryptedSecret {
    const userId = verifyToken(this.db, token);
    return retrieveSecret(this.db, userId, key, this.config.masterKey);
  }

  /**
   * 機密情報を保存する
   */
  storeSecret(
    key: string,
    value: string,
    token: string,
    expiresAt?: string,
  ): void {
    const userId = verifyToken(this.db, token);
    saveSecret(
      this.db,
      userId,
      key,
      value,
      this.config.masterKey,
      expiresAt ?? null,
    );
  }

  /**
   * 機密情報を更新する
   */
  updateSecret(
    key: string,
    value: string,
    token: string,
    expiresAt?: string,
  ): void {
    const userId = verifyToken(this.db, token);
    saveSecret(
      this.db,
      userId,
      key,
      value,
      this.config.masterKey,
      expiresAt ?? null,
    );
  }

  /**
   * 機密情報を削除する
   */
  deleteSecret(key: string, token: string): void {
    const userId = verifyToken(this.db, token);
    removeSecret(this.db, userId, key);
  }

  /**
   * キー一覧を取得する
   */
  listSecrets(
    token: string,
    pattern?: string,
  ): Array<{
    key: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }> {
    const userId = verifyToken(this.db, token);
    const options = pattern ? { pattern } : {};
    return listAllSecrets(this.db, userId, options);
  }

  /**
   * トークンを無効化する
   */
  revokeToken(token: string): void {
    verifyToken(this.db, token);
    invalidateToken(this.db, token);
  }

  /**
   * トークン一覧を取得する
   */
  listTokens(token: string): Token[] {
    const userId = verifyToken(this.db, token);
    return listUserTokens(this.db, userId);
  }

  /**
   * データベース接続を閉じる
   */
  close(): void {
    closeConnection(this.db);
  }
}
