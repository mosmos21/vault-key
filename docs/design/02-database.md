# 2. データベース設計

## 2.1 テーブル定義

### 2.1.1 secrets (機密情報)

```sql
CREATE TABLE secrets (
    user_id TEXT NOT NULL,                -- ユーザー ID (外部参照)
    key TEXT NOT NULL,                    -- 機密情報のキー
    encrypted_value BLOB NOT NULL,        -- 暗号化された値
    created_at TEXT NOT NULL,             -- ISO 8601 形式
    updated_at TEXT NOT NULL,             -- ISO 8601 形式
    created_by TEXT NOT NULL,             -- 作成者のユーザー ID
    updated_by TEXT,                      -- 最終更新者のユーザー ID
    last_accessed_at TEXT,                -- 最終アクセス日時 (ISO 8601 形式)
    expires_at TEXT,                      -- 有効期限 (ISO 8601 形式、NULL の場合は無期限)
    metadata TEXT,                        -- JSON 形式で追加情報を保存 (将来の拡張用)
    PRIMARY KEY (user_id, key),           -- 複合主キー (ユーザーごとにキー名前空間を分離)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- インデックス
CREATE INDEX idx_secrets_user_id ON secrets(user_id);
CREATE INDEX idx_secrets_updated_at ON secrets(updated_at);
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);
CREATE INDEX idx_secrets_last_accessed_at ON secrets(last_accessed_at);
```

### 2.1.2 users (ユーザー)

```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    credential_id TEXT NOT NULL UNIQUE,   -- WebAuthn Credential ID
    public_key TEXT NOT NULL,             -- 公開鍵 (Base64 エンコード)
    created_at TEXT NOT NULL,             -- ISO 8601 形式
    last_login TEXT,                      -- 最終ログイン日時
    CHECK (length(user_id) > 0),
    CHECK (length(username) > 0)
);

-- インデックス
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_credential_id ON users(credential_id);
```

### 2.1.3 tokens (アクセストークン)

```sql
CREATE TABLE tokens (
    token_hash TEXT PRIMARY KEY,          -- SHA-256 ハッシュ
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,             -- ISO 8601 形式
    created_at TEXT NOT NULL,             -- ISO 8601 形式
    is_revoked INTEGER DEFAULT 0,         -- 0: 有効, 1: 無効
    revoked_at TEXT,                      -- 無効化日時 (ISO 8601 形式)
    last_used_at TEXT,                    -- 最終使用日時 (ISO 8601 形式)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (is_revoked IN (0, 1))
);

-- インデックス
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);
CREATE INDEX idx_tokens_is_revoked ON tokens(is_revoked);
CREATE INDEX idx_tokens_created_at ON tokens(created_at);
```

### 2.1.4 audit_logs (監査ログ)

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,                 -- 'get', 'store', 'update', 'delete', 'list', 'login', 'register'
    resource_key TEXT,                    -- 対象のキー (機密情報操作の場合)
    timestamp TEXT NOT NULL,              -- ISO 8601 形式
    success INTEGER NOT NULL,             -- 0: 失敗, 1: 成功
    error_message TEXT,                   -- エラーメッセージ (失敗時のみ)
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    CHECK (action IN ('get', 'store', 'update', 'delete', 'list', 'login', 'register', 'list_expiring', 'list_expired', 'cleanup_expired')),
    CHECK (success IN (0, 1))
);

-- インデックス
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_key ON audit_logs(resource_key);
```

## 2.2 ER 図

```
users
  ├── user_id (PK)
  ├── username (UNIQUE)
  ├── credential_id (UNIQUE)
  ├── public_key
  └── ...

secrets                     tokens                  audit_logs
  ├── user_id (FK, PK) ───┐  ├── token_hash (PK)     ├── id (PK)
  ├── key (PK)            │  ├── user_id (FK) ───┐   ├── user_id (FK) ───┐
  ├── encrypted_value     │  ├── expires_at      │   ├── action         │
  ├── created_by (FK) ────┤  └── ...             │   └── ...            │
  ├── updated_by (FK) ────┤                      │                      │
  ├── expires_at          │                      │                      │
  ├── last_accessed_at    │                      │                      │
  └── ...                 │                      │                      │
                          │                      │                      │
                          └──────────────────────┴──────────────────────┘
                                      users.user_id
```

## 2.3 データの分離とアクセス制御

### 2.3.1 ユーザーごとの名前空間分離

`secrets` テーブルの複合主キー `(user_id, key)` により、以下が保証される:

- 同じキー名を複数のユーザーが使用可能
- ユーザー A の `api_key` とユーザー B の `api_key` は別の機密情報として管理される
- データベースレベルで名前空間が分離される

### 2.3.2 外部キー制約によるデータ整合性

- `secrets.user_id` → `users.user_id` (CASCADE DELETE)
  - ユーザー削除時、そのユーザーの機密情報もすべて削除される
- `tokens.user_id` → `users.user_id` (CASCADE DELETE)
  - ユーザー削除時、そのユーザーのトークンもすべて削除される
- `audit_logs.user_id` → `users.user_id`
  - ユーザー削除時、監査ログは保持される (履歴として重要)

### 2.3.3 トークン数制限のクエリ

```sql
-- ユーザーの有効なトークン数を取得
SELECT COUNT(*) FROM tokens
WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now');

-- 最も古いトークンを取得 (トークン数制限を超えた場合に無効化)
SELECT token_hash FROM tokens
WHERE user_id = ? AND is_revoked = 0
ORDER BY created_at ASC
LIMIT 1;
```

## 2.4 有効期限管理のクエリ

### 2.4.1 有効期限切れ間近の機密情報を取得

```sql
-- 7 日以内に有効期限が切れる機密情報を取得
SELECT user_id, key, expires_at FROM secrets
WHERE user_id = ?
  AND expires_at IS NOT NULL
  AND expires_at > datetime('now')
  AND expires_at <= datetime('now', '+7 days')
ORDER BY expires_at ASC;
```

### 2.4.2 有効期限切れの機密情報を取得

```sql
-- 有効期限切れの機密情報を取得
SELECT user_id, key, expires_at FROM secrets
WHERE user_id = ?
  AND expires_at IS NOT NULL
  AND expires_at <= datetime('now')
ORDER BY expires_at ASC;
```

### 2.4.3 有効期限切れの機密情報を削除

```sql
-- 有効期限切れの機密情報を削除
DELETE FROM secrets
WHERE user_id = ?
  AND expires_at IS NOT NULL
  AND expires_at <= datetime('now');
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

- `secrets(user_id)`: ユーザーの機密情報一覧取得で使用
- `secrets(expires_at)`: 有効期限管理クエリで使用
- `tokens(user_id, created_at)`: トークン数制限のクエリで使用
- `audit_logs(user_id, timestamp)`: 監査ログ検索で使用

### 2.7.2 クエリ最適化

- 複合主キー `(user_id, key)` により、キー検索が高速化
- `expires_at IS NOT NULL` による NULL チェックを追加して、有効期限なしの機密情報をスキャン対象から除外
