-- VaultKey initial schema
-- All column names use camelCase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  userId TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastLoginAt TEXT,
  CHECK (length(userId) > 0)
);

-- Passkeys table
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  credentialId TEXT NOT NULL UNIQUE,
  publicKey TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  deviceType TEXT NOT NULL,
  backedUp INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastUsedAt TEXT,
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
  CHECK (deviceType IN ('singleDevice', 'multiDevice')),
  CHECK (backedUp IN (0, 1))
);

-- Secrets table
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

-- Tokens table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passkeys_userId ON passkeys(userId);
CREATE INDEX IF NOT EXISTS idx_passkeys_credentialId ON passkeys(credentialId);
CREATE INDEX IF NOT EXISTS idx_secrets_userId ON secrets(userId);
CREATE INDEX IF NOT EXISTS idx_secrets_expiresAt ON secrets(expiresAt);
CREATE INDEX IF NOT EXISTS idx_tokens_userId ON tokens(userId);
CREATE INDEX IF NOT EXISTS idx_tokens_expiresAt ON tokens(expiresAt);
CREATE INDEX IF NOT EXISTS idx_tokens_isRevoked ON tokens(isRevoked);
