# @mosmos_21/vault-key-core

VaultKey のコアライブラリです。機密情報の暗号化保存、ユーザー認証、トークン管理などの機能を提供します。

## インストール

```bash
npm install @mosmos_21/vault-key-core
```

## 使い方

### 基本的な使用例

```typescript
import { VaultKeyClient } from '@mosmos_21/vault-key-core';

// クライアントの初期化
const client = new VaultKeyClient({
  dbPath: './vaultkey.db',
  masterKey: process.env.VAULTKEY_MASTER_KEY, // オプション (環境変数から自動読み込み)
});

// ユーザー登録 (v0.1.0 はダミー認証)
client.registerUser('alice');

// トークン発行
const { token } = client.issueToken('alice');

// 機密情報を保存
client.storeSecret('apiKeyOpenai', 'sk-1234567890abcdef', token);

// 機密情報を取得
const secret = client.getSecret('apiKeyOpenai', token);
console.log(secret.value); // sk-1234567890abcdef

// 機密情報を更新
client.updateSecret('apiKeyOpenai', 'sk-newkey', token);

// 機密情報を削除
client.deleteSecret('apiKeyOpenai', token);

// キー一覧を取得
const secrets = client.listSecrets(token);
console.log(secrets); // [{ key: 'apiKeyOpenai', expiresAt: null, createdAt: '...', updatedAt: '...' }]

// トークンを無効化
client.revokeToken(token);

// データベース接続を閉じる
client.close();
```

### 有効期限付き機密情報

```typescript
// 有効期限を指定して保存
const expiresAt = new Date('2025-12-31T23:59:59Z').toISOString();
client.storeSecret('temporaryKey', 'value', token, expiresAt);

// 有効期限切れの機密情報は取得できない
// NotFoundError がスローされる
```

### パターンマッチでキー一覧を取得

```typescript
client.storeSecret('apiKeyOpenai', 'value1', token);
client.storeSecret('apiKeyAnthropic', 'value2', token);
client.storeSecret('dbPassword', 'value3', token);

// ワイルドカード * を使ってパターンマッチ
const apiKeys = client.listSecrets(token, 'apiKey*');
console.log(apiKeys); // apiKeyOpenai, apiKeyAnthropic
```

### トークン管理

```typescript
// トークンを発行 (デフォルトの有効期限: 30 日)
const { token } = client.issueToken('alice');

// カスタム有効期限でトークンを発行 (7200 秒 = 2 時間)
const { token: shortLivedToken } = client.issueToken('alice', 7200);

// トークン一覧を取得
const tokens = client.listTokens(token);
console.log(tokens); // [{ tokenHash: 'a1b2c3...', createdAt: '...', expiresAt: '...', userId: 'alice' }]

// トークンを無効化
client.revokeToken(token);
```

## API リファレンス

### VaultKeyClient

#### `constructor(config?: Partial<VaultKeyConfig>)`

クライアントを初期化します。

**パラメータ**:
- `config.dbPath` (string, オプション): データベースファイルのパス (デフォルト: `~/.vaultkey/vaultkey.db`)
- `config.masterKey` (string, オプション): マスターキー (省略時は環境変数 `VAULTKEY_MASTER_KEY` から読み込み)
- `config.authPort` (number, オプション): 認証サーバーのポート番号 (デフォルト: 5432)
- `config.logLevel` (string, オプション): ログレベル (デフォルト: 'INFO')
- `config.tokenTtl` (number, オプション): トークンの有効期限 (秒) (デフォルト: 2592000 = 30 日)
- `config.maxTokensPerUser` (number, オプション): ユーザーあたりの最大トークン数 (デフォルト: 5)

#### `registerUser(userId: string): void`

ユーザーを登録します (v0.1.0 はダミー認証)。

**パラメータ**:
- `userId` (string): ユーザー ID

#### `issueToken(userId: string, expiresIn?: number): { token: string; tokenHash: string; expiresAt: string }`

トークンを発行します (v0.1.0 はダミー認証)。

**パラメータ**:
- `userId` (string): ユーザー ID
- `expiresIn` (number, オプション): トークンの有効期限 (秒)

**返り値**: `{ token: string; tokenHash: string; expiresAt: string }`

#### `getSecret(key: string, token: string): DecryptedSecret`

機密情報を取得します。

**パラメータ**:
- `key` (string): 機密情報のキー
- `token` (string): アクセストークン

**返り値**: `{ key: string; value: string; expiresAt: string | null; createdAt: string; updatedAt: string }`

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない、または有効期限切れ

#### `storeSecret(key: string, value: string, token: string, expiresAt?: string): void`

機密情報を保存します。

**パラメータ**:
- `key` (string): 機密情報のキー
- `value` (string): 機密情報の値
- `token` (string): アクセストークン
- `expiresAt` (string, オプション): 有効期限 (ISO 8601 形式)

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `ValidationError`: パラメータが不正

#### `updateSecret(key: string, value: string, token: string, expiresAt?: string): void`

機密情報を更新します。

**パラメータ**:
- `key` (string): 機密情報のキー
- `value` (string): 新しい値
- `token` (string): アクセストークン
- `expiresAt` (string, オプション): 新しい有効期限 (ISO 8601 形式)

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない
- `ValidationError`: パラメータが不正

#### `deleteSecret(key: string, token: string): void`

機密情報を削除します。

**パラメータ**:
- `key` (string): 機密情報のキー
- `token` (string): アクセストークン

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ
- `NotFoundError`: キーが見つからない

#### `listSecrets(token: string, pattern?: string): Array<{ key: string; expiresAt: string | null; createdAt: string; updatedAt: string }>`

キー一覧を取得します。

**パラメータ**:
- `token` (string): アクセストークン
- `pattern` (string, オプション): パターンマッチ (ワイルドカード `*` を使用可能)

**返り値**: 機密情報の配列 (値は含まない)

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

#### `revokeToken(token: string): void`

トークンを無効化します。

**パラメータ**:
- `token` (string): アクセストークン

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

#### `listTokens(token: string): Token[]`

トークン一覧を取得します。

**パラメータ**:
- `token` (string): アクセストークン

**返り値**: トークンの配列

**エラー**:
- `AuthenticationError`: トークンが無効または期限切れ

#### `close(): void`

データベース接続を閉じます。

## エラーハンドリング

VaultKey は以下のカスタムエラークラスを提供します:

```typescript
import {
  VaultKeyError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@mosmos_21/vault-key-core';

try {
  const secret = client.getSecret('nonexistent', token);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('キーが見つかりません:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('認証エラー:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('バリデーションエラー:', error.message);
  }
}
```

### エラークラス一覧

- `VaultKeyError`: 基底エラークラス
- `AuthenticationError`: 認証エラー (トークン無効、期限切れなど)
- `NotFoundError`: リソース未検出エラー
- `ValidationError`: バリデーションエラー
- `DatabaseError`: データベースエラー
- `EncryptionError`: 暗号化/復号化エラー

## ユーザー分離

VaultKey はユーザーごとに機密情報を分離します。各ユーザーは自分が作成した機密情報のみにアクセスできます。

```typescript
// ユーザー alice のトークン
const aliceToken = client.issueToken('alice').token;

// ユーザー bob のトークン
const bobToken = client.issueToken('bob').token;

// alice が機密情報を保存
client.storeSecret('shared-key', 'alice-value', aliceToken);

// bob が同じキーで機密情報を保存 (別の名前空間)
client.storeSecret('shared-key', 'bob-value', bobToken);

// alice は自分の値を取得できる
const aliceSecret = client.getSecret('shared-key', aliceToken);
console.log(aliceSecret.value); // alice-value

// bob は自分の値を取得できる
const bobSecret = client.getSecret('shared-key', bobToken);
console.log(bobSecret.value); // bob-value
```

## セキュリティ

- すべての機密情報は AES-256-GCM で暗号化されて保存されます
- トークンは SHA-256 でハッシュ化されて保存されます (平文は保存されません)
- マスターキーは環境変数で管理することを推奨します
- ログに機密情報は出力されません

## ライセンス

MIT
