-- VaultKey 初期スキーマ
-- すべてのカラム名は camelCase を使用

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  userId TEXT PRIMARY KEY,
  credentialId TEXT NOT NULL UNIQUE,
  publicKey TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastLogin TEXT
);

-- 機密情報テーブル
CREATE TABLE IF NOT EXISTS secrets (
  userId TEXT NOT NULL,
  key TEXT NOT NULL,
  encryptedValue BLOB NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT NOT NULL,
  updatedBy TEXT,
  lastAccessedAt TEXT,
  expiresAt TEXT,
  metadata TEXT,
  PRIMARY KEY (userId, key),
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- トークンテーブル
CREATE TABLE IF NOT EXISTS tokens (
  tokenHash TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  isRevoked INTEGER NOT NULL DEFAULT 0,
  revokedAt TEXT,
  lastUsedAt TEXT,
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_secrets_userId ON secrets(userId);
CREATE INDEX IF NOT EXISTS idx_secrets_expiresAt ON secrets(expiresAt);
CREATE INDEX IF NOT EXISTS idx_tokens_userId ON tokens(userId);
CREATE INDEX IF NOT EXISTS idx_tokens_expiresAt ON tokens(expiresAt);
CREATE INDEX IF NOT EXISTS idx_tokens_isRevoked ON tokens(isRevoked);
