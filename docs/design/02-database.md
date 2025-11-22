# 2. データベース設計

## 2.1 テーブル定義

### 2.1.1 secrets (機密情報)

```sql
CREATE TABLE secrets (
    userId TEXT NOT NULL,                 -- ユーザー ID (外部参照)
    key TEXT NOT NULL,                    -- 機密情報のキー
    encryptedValue BLOB NOT NULL,         -- 暗号化された値
    createdAt TEXT NOT NULL,              -- ISO 8601 形式
    updatedAt TEXT NOT NULL,              -- ISO 8601 形式
    createdBy TEXT NOT NULL,              -- 作成者のユーザー ID
    updatedBy TEXT,                       -- 最終更新者のユーザー ID
    lastAccessedAt TEXT,                  -- 最終アクセス日時 (ISO 8601 形式)
    expiresAt TEXT,                       -- 有効期限 (ISO 8601 形式、NULL の場合は無期限)
    metadata TEXT,                        -- JSON 形式で追加情報を保存 (将来の拡張用)
    PRIMARY KEY (userId, key),            -- 複合主キー (ユーザーごとにキー名前空間を分離)
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userId),
    FOREIGN KEY (updatedBy) REFERENCES users(userId)
);

-- インデックス
CREATE INDEX idx_secrets_userId ON secrets(userId);
CREATE INDEX idx_secrets_updatedAt ON secrets(updatedAt);
CREATE INDEX idx_secrets_expiresAt ON secrets(expiresAt);
CREATE INDEX idx_secrets_lastAccessedAt ON secrets(lastAccessedAt);
```

### 2.1.2 users (ユーザー)

```sql
CREATE TABLE users (
    userId TEXT PRIMARY KEY,
    credentialId TEXT NOT NULL UNIQUE,    -- WebAuthn Credential ID
    publicKey TEXT NOT NULL,              -- 公開鍵 (Base64 エンコード)
    createdAt TEXT NOT NULL,              -- ISO 8601 形式
    lastLogin TEXT,                       -- 最終ログイン日時
    CHECK (length(userId) > 0)
);

-- インデックス
CREATE INDEX idx_users_credentialId ON users(credentialId);
```

### 2.1.3 tokens (アクセストークン)

```sql
CREATE TABLE tokens (
    tokenHash TEXT PRIMARY KEY,           -- SHA-256 ハッシュ
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,              -- ISO 8601 形式
    createdAt TEXT NOT NULL,              -- ISO 8601 形式
    isRevoked INTEGER DEFAULT 0,          -- 0: 有効, 1: 無効
    revokedAt TEXT,                       -- 無効化日時 (ISO 8601 形式)
    lastUsedAt TEXT,                      -- 最終使用日時 (ISO 8601 形式)
    FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
    CHECK (isRevoked IN (0, 1))
);

-- インデックス
CREATE INDEX idx_tokens_userId ON tokens(userId);
CREATE INDEX idx_tokens_expiresAt ON tokens(expiresAt);
CREATE INDEX idx_tokens_isRevoked ON tokens(isRevoked);
CREATE INDEX idx_tokens_createdAt ON tokens(createdAt);
```

### 2.1.4 audit_logs (監査ログ)

```sql
CREATE TABLE auditLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,                 -- 'get', 'store', 'update', 'delete', 'list', 'login', 'logout', 'register'
    resourceKey TEXT,                     -- 対象のキー (機密情報操作の場合)
    timestamp TEXT NOT NULL,              -- ISO 8601 形式
    success INTEGER NOT NULL,             -- 0: 失敗, 1: 成功
    errorMessage TEXT,                    -- エラーメッセージ (失敗時のみ)
    FOREIGN KEY (userId) REFERENCES users(userId),
    CHECK (action IN ('get', 'store', 'update', 'delete', 'list', 'login', 'logout', 'register', 'listExpiring', 'listExpired', 'cleanupExpired')),
    CHECK (success IN (0, 1))
);

-- インデックス
CREATE INDEX idx_auditLogs_userId ON auditLogs(userId);
CREATE INDEX idx_auditLogs_timestamp ON auditLogs(timestamp);
CREATE INDEX idx_auditLogs_action ON auditLogs(action);
CREATE INDEX idx_auditLogs_resourceKey ON auditLogs(resourceKey);
```

## 2.2 ER 図

```
users
  ├── userId (PK)
  ├── credentialId (UNIQUE)
  ├── publicKey
  └── ...

secrets                     tokens                  auditLogs
  ├── userId (FK, PK) ────┐  ├── tokenHash (PK)      ├── id (PK)
  ├── key (PK)            │  ├── userId (FK) ───┐   ├── userId (FK) ───┐
  ├── encryptedValue      │  ├── expiresAt      │   ├── action         │
  ├── createdBy (FK) ─────┤  └── ...            │   └── ...            │
  ├── updatedBy (FK) ─────┤                     │                      │
  ├── expiresAt           │                     │                      │
  ├── lastAccessedAt      │                     │                      │
  └── ...                 │                     │                      │
                          │                     │                      │
                          └─────────────────────┴──────────────────────┘
                                      users.userId
```

## 2.3 データの分離とアクセス制御

### 2.3.1 ユーザーごとの名前空間分離

`secrets` テーブルの複合主キー `(userId, key)` により、以下が保証される:

- 同じキー名を複数のユーザーが使用可能
- ユーザー A の `api_key` とユーザー B の `api_key` は別の機密情報として管理される
- データベースレベルで名前空間が分離される

### 2.3.2 外部キー制約によるデータ整合性

- `secrets.userId` → `users.userId` (CASCADE DELETE)
  - ユーザー削除時、そのユーザーの機密情報もすべて削除される
- `tokens.userId` → `users.userId` (CASCADE DELETE)
  - ユーザー削除時、そのユーザーのトークンもすべて削除される
- `auditLogs.userId` → `users.userId`
  - ユーザー削除時、監査ログは保持される (履歴として重要)

### 2.3.3 トークン数制限のクエリ

```sql
-- ユーザーの有効なトークン数を取得
SELECT COUNT(*) FROM tokens
WHERE userId = ? AND isRevoked = 0 AND expiresAt > datetime('now');

-- 最も古いトークンを取得 (トークン数制限を超えた場合に無効化)
SELECT tokenHash FROM tokens
WHERE userId = ? AND isRevoked = 0
ORDER BY createdAt ASC
LIMIT 1;
```

## 2.4 有効期限管理のクエリ

### 2.4.1 有効期限切れ間近の機密情報を取得

```sql
-- 7 日以内に有効期限が切れる機密情報を取得
SELECT userId, key, expiresAt FROM secrets
WHERE userId = ?
  AND expiresAt IS NOT NULL
  AND expiresAt > datetime('now')
  AND expiresAt <= datetime('now', '+7 days')
ORDER BY expiresAt ASC;
```

### 2.4.2 有効期限切れの機密情報を取得

```sql
-- 有効期限切れの機密情報を取得
SELECT userId, key, expiresAt FROM secrets
WHERE userId = ?
  AND expiresAt IS NOT NULL
  AND expiresAt <= datetime('now')
ORDER BY expiresAt ASC;
```

### 2.4.3 有効期限切れの機密情報を削除

```sql
-- 有効期限切れの機密情報を削除
DELETE FROM secrets
WHERE userId = ?
  AND expiresAt IS NOT NULL
  AND expiresAt <= datetime('now');
```

## 2.5 マイグレーション戦略

### 2.5.1 初期スキーマ (Phase 1)

- `database/migrations/001-initial-schema.sql` にすべてのテーブル定義を含める
- `vaultkey init` コマンドでマイグレーションを実行

### 2.5.2 スキーマ変更 (Phase 2 以降)

- `database/migrations/002-add-expiration.sql` など、変更ごとにマイグレーションファイルを追加
- マイグレーションバージョン管理テーブルを作成して、適用済みマイグレーションを記録

## 2.6 データベースサイズの見積もり

### 2.6.1 1 ユーザーあたりのデータサイズ

- **secrets**: 約 1KB / レコード (暗号化データ + メタデータ)
- **tokens**: 約 200 bytes / レコード (最大 5 個)
- **audit_logs**: 約 300 bytes / レコード

### 2.6.2 100 ユーザー、1000 機密情報の場合

- **secrets**: 1KB × 1000 = 1MB
- **tokens**: 200 bytes × 500 (100 ユーザー × 5 トークン) = 100KB
- **audit_logs**: 300 bytes × 10000 (90 日間の履歴) = 3MB
- **合計**: 約 4MB

SQLite で十分対応可能なサイズです。

## 2.7 パフォーマンス考慮事項

### 2.7.1 インデックス戦略

- `secrets(userId)`: ユーザーの機密情報一覧取得で使用
- `secrets(expiresAt)`: 有効期限管理クエリで使用
- `tokens(userId, createdAt)`: トークン数制限のクエリで使用
- `auditLogs(userId, timestamp)`: 監査ログ検索で使用

### 2.7.2 クエリ最適化

- 複合主キー `(userId, key)` により、キー検索が高速化
- `expiresAt IS NOT NULL` による NULL チェックを追加して、有効期限なしの機密情報をスキャン対象から除外
