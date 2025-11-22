# 5. API 設計

## 5.1 ライブラリ API

### 5.1.1 VaultKeyClient クラス

```typescript
import { VaultKeyClient } from 'vaultkey';

// クライアントの初期化
const client = new VaultKeyClient({
  databaseUrl: 'sqlite://vaultkey.db', // または PostgreSQL URL
  masterKey: process.env.VAULTKEY_MASTER_KEY, // オプション (環境変数から自動読み込み)
});
```

### 5.1.2 機密情報管理 API

#### getSecret()

機密情報を取得します。

```typescript
const secret = await client.getSecret({
  key: 'apiKeyOpenai',
  token: 'abc123...',
});

// 返り値:
// {
//   key: 'apiKeyOpenai',
//   value: 'sk-1234567890abcdef',
//   metadata: {
//     createdAt: '2025-01-15T10:00:00Z',
//     updatedAt: '2025-01-15T10:00:00Z',
//     createdBy: 'alice',
//     updatedBy: 'alice',
//     lastAccessedAt: '2025-01-22T15:30:00Z',
//     expiresAt: null, // 有効期限なし
//   },
// }
```

**パラメータ**:
- `key` (string, 必須): 機密情報のキー
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<Secret>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない
- `ExpiredError`: 機密情報の有効期限が切れている

#### storeSecret()

機密情報を保存します。

```typescript
await client.storeSecret({
  key: 'apiKeyOpenai',
  value: 'sk-1234567890abcdef',
  token: 'abc123...',
  expiresAt: new Date('2025-12-31T23:59:59Z'), // オプション
});
```

**パラメータ**:
- `key` (string, 必須): 機密情報のキー
- `value` (string, 必須): 機密情報の値
- `token` (string, 必須): アクセストークン
- `expiresAt` (Date, オプション): 有効期限

**返り値**: `Promise<void>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `ConflictError`: 同じキーが既に存在する
- `ValidationError`: パラメータが不正

#### updateSecret()

機密情報を更新します。

```typescript
await client.updateSecret({
  key: 'apiKeyOpenai',
  value: 'sk-newkey',
  token: 'abc123...',
  expiresAt: new Date('2026-01-31T23:59:59Z'), // オプション
});
```

**パラメータ**:
- `key` (string, 必須): 機密情報のキー
- `value` (string, 必須): 新しい値
- `token` (string, 必須): アクセストークン
- `expiresAt` (Date, オプション): 新しい有効期限

**返り値**: `Promise<void>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない
- `ValidationError`: パラメータが不正

#### deleteSecret()

機密情報を削除します。

```typescript
await client.deleteSecret({
  key: 'apiKeyOpenai',
  token: 'abc123...',
});
```

**パラメータ**:
- `key` (string, 必須): 機密情報のキー
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<void>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない

#### listSecrets()

キー一覧を取得します。

```typescript
const keys = await client.listSecrets({
  token: 'abc123...',
  pattern: 'apiKey*', // オプション
});

// 返り値: ['apiKeyOpenai', 'apiKeyAnthropic']
```

**パラメータ**:
- `token` (string, 必須): アクセストークン
- `pattern` (string, オプション): パターンマッチ (ワイルドカード `*` を使用可能)

**返り値**: `Promise<string[]>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

### 5.1.3 有効期限管理 API (Phase 2)

#### listExpiringSecrets()

有効期限切れ間近の機密情報一覧を取得します。

```typescript
const expiringSecrets = await client.listExpiringSecrets({
  token: 'abc123...',
  daysUntilExpiry: 7, // 7 日以内に有効期限が切れる機密情報
});

// 返り値:
// [
//   { key: 'apiKeyOpenai', expiresAt: '2025-01-29T23:59:59Z' },
//   { key: 'dbPassword', expiresAt: '2025-01-30T23:59:59Z' },
// ]
```

**パラメータ**:
- `token` (string, 必須): アクセストークン
- `daysUntilExpiry` (number, デフォルト: 7): 何日以内に有効期限が切れるか

**返り値**: `Promise<ExpiringSecret[]>`

#### listExpiredSecrets()

有効期限切れの機密情報一覧を取得します。

```typescript
const expiredSecrets = await client.listExpiredSecrets({
  token: 'abc123...',
});

// 返り値:
// [
//   { key: 'oldApiKey', expiresAt: '2025-01-01T00:00:00Z' },
// ]
```

**パラメータ**:
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<ExpiredSecret[]>`

#### deleteExpiredSecrets()

有効期限切れの機密情報を削除します。

```typescript
const deletedCount = await client.deleteExpiredSecrets({
  token: 'abc123...',
});

// 返り値: 削除された件数 (例: 3)
```

**パラメータ**:
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<number>` (削除された件数)

### 5.1.4 ユーザー管理 API

#### registerUser()

Passkey を使って新規ユーザーを登録します。

```typescript
await client.registerUser({
  userId: 'alice',
  authServerPort: 5432, // オプション (デフォルト: 5432 または VAULTKEY_AUTH_PORT)
  autoOpenBrowser: true, // オプション (デフォルト: true)
});
```

**パラメータ**:
- `userId` (string, 必須): ユーザー ID
- `authServerPort` (number, オプション): 認証サーバーのポート番号 (デフォルト: 5432)
- `autoOpenBrowser` (boolean, オプション): ブラウザを自動起動するか (デフォルト: true)

**返り値**: `Promise<void>`

**エラー**:
- `ConflictError`: ユーザー ID が既に存在する
- `ValidationError`: パラメータが不正

**注意**:
- この関数は認証サーバーを起動し、Passkey を作成します
- `autoOpenBrowser: false` の場合、登録 URL を返却するので手動でブラウザを開く必要があります

### 5.1.5 トークン管理 API

#### issueToken()

Passkey 認証を経由してトークンを発行します。

```typescript
const { token, userId } = await client.issueToken({
  // 認証サーバーを起動し、Passkey 認証を実行
  authServerPort: 5432, // オプション (デフォルト: 5432 または VAULTKEY_AUTH_PORT)
  autoOpenBrowser: true, // オプション (デフォルト: true)
  expiresIn: 3600, // オプション (デフォルト: 3600秒 = 1時間)
});

// 返り値:
// {
//   token: 'abc123...',
//   userId: 'alice',
//   expiresAt: '2025-01-22T11:00:00Z',
// }
```

**パラメータ**:
- `authServerPort` (number, オプション): 認証サーバーのポート番号 (デフォルト: 5432)
- `autoOpenBrowser` (boolean, オプション): ブラウザを自動起動するか (デフォルト: true)
- `expiresIn` (number, オプション): トークンの有効期限（秒） (デフォルト: 3600)

**返り値**: `Promise<{ token: string; userId: string; expiresAt: string }>`

**エラー**:
- `AuthenticationError`: Passkey 認証に失敗
- `NotFoundError`: ユーザーが見つからない

**注意**:
- この関数は認証サーバーを起動し、Passkey 認証を実行します
- ユーザー ID は Passkey の credential_id から自動的に特定されます
- `autoOpenBrowser: false` の場合、認証 URL を返却するので手動でブラウザを開く必要があります

#### revokeToken()

トークンを無効化します。

```typescript
await client.revokeToken({
  token: 'abc123...',
});
```

**パラメータ**:
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<void>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

#### listTokens()

トークン一覧を取得します。

```typescript
const tokens = await client.listTokens({
  token: 'abc123...',
});

// 返り値:
// [
//   {
//     hash: 'a1b2c3...',
//     createdAt: '2025-01-22T10:00:00Z',
//     expiresAt: '2025-01-22T11:00:00Z',
//     lastUsedAt: '2025-01-22T10:30:00Z',
//   },
// ]
```

**パラメータ**:
- `token` (string, 必須): アクセストークン

**返り値**: `Promise<TokenInfo[]>`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

### 5.1.6 型定義

```typescript
// types/secret.ts
export type Secret = {
  key: string;
  value: string;
  metadata: SecretMetadata;
};

export type SecretMetadata = {
  createdAt: string; // ISO 8601 形式
  updatedAt: string; // ISO 8601 形式
  createdBy: string; // ユーザー ID
  updatedBy?: string; // 最終更新者のユーザー ID
  lastAccessedAt?: string; // 最終アクセス日時 (ISO 8601 形式)
  expiresAt?: string | null; // 有効期限 (ISO 8601 形式、null の場合は無期限)
};

export type ExpiringSecret = {
  key: string;
  expiresAt: string; // ISO 8601 形式
};

export type ExpiredSecret = {
  key: string;
  expiresAt: string; // ISO 8601 形式
};

// types/token.ts
export type TokenInfo = {
  hash: string; // SHA-256 ハッシュ (最初の 8 文字のみ表示)
  createdAt: string; // ISO 8601 形式
  expiresAt: string; // ISO 8601 形式
  lastUsedAt?: string; // 最終使用日時 (ISO 8601 形式)
};

// types/index.ts
export type VaultKeyClientConfig = {
  databaseUrl: string;
  masterKey?: string; // 省略時は環境変数 VAULTKEY_MASTER_KEY から読み込み
};
```

### 5.1.7 エラークラス

以下のエラークラスを提供:

- `VaultKeyError`: 基底エラークラス
- `AuthenticationError`: 認証エラー (トークン無効、期限切れなど)
- `NotFoundError`: リソース未検出エラー
- `ValidationError`: バリデーションエラー
- `ConflictError`: 競合エラー (同じキーが既に存在するなど)
- `ExpiredError`: 有効期限切れエラー

**使用例**:
```typescript
try {
  const secret = await client.getSecret({ key: 'nonexistent', token });
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('キーが見つかりません:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('認証エラー:', error.message);
  }
}
```

## 5.2 CLI 設計

### 5.2.1 コマンド構成

#### データベース初期化

```bash
vaultkey init

# 出力:
# データベースを初期化しました: vaultkey.db
```

#### ユーザー登録

```bash
vaultkey user register alice

# 出力:
# 認証サーバーを起動しました: http://localhost:5432
# ブラウザを開きます...
# Passkey を作成してください。
# ユーザーを登録しました: alice
```

#### ユーザー認証・トークン発行

```bash
# デフォルト: ブラウザ自動起動
vaultkey user login

# 手動コピー方式
vaultkey user login --manual

# 出力:
# 認証サーバーを起動しました: http://localhost:5432
# ブラウザを開きます...
# Passkey で認証してください。
# トークンを発行しました: abc123...
# トークンを ~/.vaultkey/token に保存しました
```

#### ログアウト

```bash
# 現在のトークンを無効化
vaultkey user logout

# 出力:
# トークンを無効化しました
# ~/.vaultkey/token を削除しました
```

#### 機密情報保存

```bash
# Phase 1: 値を引数で指定
vaultkey secret set apiKeyOpenai "sk-1234567890abcdef"

# Phase 3: 対話的入力
vaultkey secret set apiKeyOpenai
# Enter value: ******** (マスク表示)

# 有効期限を指定 (Phase 2)
vaultkey secret set apiKeyOpenai --expires-in 30d
# Enter value: ********

# 出力:
# 機密情報を保存しました: apiKeyOpenai
```

#### 機密情報取得

```bash
# デフォルト: テーブル形式
vaultkey secret get apiKeyOpenai

# 出力:
# Key: apiKeyOpenai
# Value: sk-1234567890abcdef
# Created: 2025-01-15 10:00:00
# Updated: 2025-01-15 10:00:00
# Expires: 2025-12-31 23:59:59

# JSON 形式
vaultkey secret get apiKeyOpenai --format json

# 出力:
# {
#   "key": "apiKeyOpenai",
#   "value": "sk-1234567890abcdef",
#   "metadata": {
#     "createdAt": "2025-01-15T10:00:00Z",
#     "updatedAt": "2025-01-15T10:00:00Z",
#     "expiresAt": "2025-12-31T23:59:59Z"
#   }
# }
```

#### 機密情報更新

```bash
# Phase 1: 値を引数で指定
vaultkey secret update apiKeyOpenai "sk-newkey"

# Phase 3: 対話的入力
vaultkey secret update apiKeyOpenai
# Enter value: ********

# 出力:
# 機密情報を更新しました: apiKeyOpenai
```

#### 機密情報削除

```bash
# デフォルト: 確認ダイアログあり (Phase 3)
vaultkey secret delete apiKeyOpenai
# Are you sure you want to delete 'apiKeyOpenai'? (y/N): y

# 確認をスキップ
vaultkey secret delete apiKeyOpenai --force

# 出力:
# 機密情報を削除しました: apiKeyOpenai
```

#### キー一覧取得

```bash
# すべてのキーを表示
vaultkey secret list

# 出力:
# apiKeyOpenai
# apiKeyAnthropic
# dbPassword

# パターンマッチ
vaultkey secret list --pattern "apiKey*"

# 出力:
# apiKeyOpenai
# apiKeyAnthropic
```

#### 有効期限管理 (Phase 2)

```bash
# 有効期限切れ間近の機密情報一覧 (デフォルト: 7 日以内)
vaultkey secret list-expiring

# 出力:
# apiKeyOpenai (expires in 5 days: 2025-01-29)
# dbPassword (expires in 6 days: 2025-01-30)

# 有効期限切れ間近の機密情報一覧 (30 日以内)
vaultkey secret list-expiring --days 30

# 有効期限切れの機密情報一覧
vaultkey secret list-expired

# 出力:
# oldApiKey (expired: 2025-01-01)

# 有効期限切れの機密情報削除 (確認ダイアログあり)
vaultkey secret cleanup-expired
# Are you sure you want to delete 1 expired secret(s)? (y/N): y
# 削除しました: 1 件

# 確認をスキップ
vaultkey secret cleanup-expired --force
```

#### トークン管理

```bash
# トークン無効化
vaultkey token revoke

# 出力:
# トークンを無効化しました

# トークン一覧取得
vaultkey token list

# 出力:
# Hash       Created             Expires             Last Used
# a1b2c3...  2025-01-22 10:00:00 2025-01-22 11:00:00 2025-01-22 10:30:00
# d4e5f6...  2025-01-21 09:00:00 2025-01-21 10:00:00 2025-01-21 09:15:00
```

#### 監査ログ検索 (Phase 3)

```bash
# すべての監査ログを表示
vaultkey audit search

# ユーザーでフィルタリング
vaultkey audit search --user alice

# アクションでフィルタリング
vaultkey audit search --action get

# 日時範囲でフィルタリング
vaultkey audit search --from 2025-01-01 --to 2025-01-31

# 組み合わせ
vaultkey audit search --user alice --action get --from 2025-01-01

# 出力:
# User   Action  Resource         Timestamp            Success
# alice  get     apiKeyOpenai     2025-01-22 10:00:00  Yes
# alice  get     dbPassword       2025-01-22 10:05:00  Yes
```

### 5.2.2 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `VAULTKEY_TOKEN` | アクセストークン | - |
| `VAULTKEY_MASTER_KEY` | マスターキー (暗号化キー) | - |
| `VAULTKEY_AUTH_PORT` | 認証サーバーのポート番号 | 5432 |

```bash
# トークンを環境変数で指定
export VAULTKEY_TOKEN="abc123..."

# マスターキーを環境変数で指定
export VAULTKEY_MASTER_KEY="0123456789abcdef..."

# 認証サーバーのポートを変更
export VAULTKEY_AUTH_PORT=8080
```

### 5.2.3 トークンの扱い

優先順位:
1. `--token` オプション
2. 環境変数 `VAULTKEY_TOKEN`
3. トークンファイル `~/.vaultkey/token`

```bash
# 1. --token オプションで指定
vaultkey secret get apiKey --token "abc123..."

# 2. 環境変数から読み込み
export VAULTKEY_TOKEN="abc123..."
vaultkey secret get apiKey

# 3. トークンファイルから読み込み (login 時に自動保存)
vaultkey user login
vaultkey secret get apiKey
```

### 5.2.4 出力フォーマット

```bash
# デフォルト: テーブル形式 (人間が読みやすい)
vaultkey secret get apiKey

# JSON 形式
vaultkey secret get apiKey --format json

# YAML 形式
vaultkey secret get apiKey --format yaml
```

### 5.2.4 グローバルオプション

```bash
# データベース URL を指定
vaultkey --database sqlite://custom.db secret list

# マスターキーを指定
vaultkey --master-key "0123...abcdef" secret get apiKey

# ログレベルを指定
vaultkey --log-level debug secret get apiKey
```

## 5.3 CLI の実装方針

**使用ライブラリ**: Commander.js

**主要機能**:
- サブコマンド構造 (`user`, `secret`, `token`, `audit`)
- グローバルオプション (`--database`, `--master-key`, `--log-level`)
- 各コマンドのオプション (`--format`, `--pattern`, `--expires-in` など)
- トークンの優先順位処理 (オプション → 環境変数 → ファイル)
- 出力フォーマットの切り替え (テーブル、JSON、YAML)
