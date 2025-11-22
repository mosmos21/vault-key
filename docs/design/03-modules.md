# 3. モジュール設計

## 3.1 ディレクトリ構成

```
src/
├── index.ts               # パッケージエントリポイント
├── client.ts              # VaultKeyClient (公開 API)
├── cli.ts                 # CLI エントリポイント
├── config.ts              # 設定管理
├── types/                 # 型定義
│   ├── index.ts
│   ├── user.ts
│   ├── secret.ts
│   ├── token.ts
│   └── audit.ts
├── crypto/                # 暗号化モジュール
│   ├── index.ts
│   ├── encryption.ts      # AES-256-GCM 暗号化
│   └── token-hash.ts      # トークンハッシュ化 (SHA-256)
├── auth/                  # 認証モジュール
│   ├── index.ts
│   ├── passkey.ts         # WebAuthn Passkey 処理
│   ├── token-manager.ts   # トークン発行・検証
│   └── auth-server.ts     # 認証サーバー (Phase 2)
├── secrets/               # 機密情報管理
│   ├── index.ts
│   └── secrets-service.ts
├── audit/                 # 監査ログ
│   ├── index.ts
│   └── audit-service.ts
├── database/              # データベースアクセス
│   ├── index.ts
│   ├── connection.ts
│   ├── migrations/
│   │   └── 001-initial-schema.sql
│   └── repositories/
│       ├── index.ts
│       ├── user-repository.ts
│       ├── secret-repository.ts
│       ├── token-repository.ts
│       └── audit-repository.ts
└── utils/                 # ユーティリティ
    ├── index.ts
    ├── errors.ts          # カスタムエラー
    ├── validators.ts      # バリデーション
    └── prompt.ts          # 対話的入力 (Phase 3)

tests/
├── client.test.ts
├── crypto.test.ts
├── auth.test.ts
├── secrets.test.ts
├── token-manager.test.ts
├── cli.test.ts
└── fixtures/
    └── test-data.ts

docs/
├── requirements/          # 要件定義書
└── design/                # 設計書
```

## 3.2 主要モジュールの責務

### 3.2.1 client モジュール

**責務**: 公開 API の提供

**主要クラス/関数**:

```typescript
export class VaultKeyClient {
  // 機密情報管理
  getSecret(key: string, token: string): Promise<Secret>;
  storeSecret(key: string, value: string, token: string, expiresAt?: Date): Promise<void>;
  updateSecret(key: string, value: string, token: string, expiresAt?: Date): Promise<void>;
  deleteSecret(key: string, token: string): Promise<void>;
  listSecrets(token: string, pattern?: string): Promise<string[]>;

  // 有効期限管理 (Phase 2)
  listExpiringSecrets(token: string, daysUntilExpiry: number): Promise<ExpiringSecret[]>;
  listExpiredSecrets(token: string): Promise<ExpiredSecret[]>;
  deleteExpiredSecrets(token: string): Promise<number>;

  // トークン管理
  revokeToken(token: string): Promise<void>;
  listTokens(token: string): Promise<TokenInfo[]>;
}
```

### 3.2.2 cli モジュール

**責務**: CLI インターフェースの提供

**主要コマンド**:
- `init`: データベース初期化
- `user register`: ユーザー登録
- `user login`: ユーザー認証・トークン発行
- `secret set/get/update/delete/list`: 機密情報管理
- `secret list-expiring/list-expired/cleanup-expired`: 有効期限管理
- `token revoke/list`: トークン管理
- `audit search`: 監査ログ検索

### 3.2.3 crypto モジュール

**責務**: データの暗号化・復号化、ハッシュ化

**主要関数**:
- `encrypt()`: AES-256-GCM で暗号化
- `decrypt()`: AES-256-GCM で復号化
- `hashToken()`: SHA-256 でトークンをハッシュ化
- `generateToken()`: セキュアなランダムトークン生成

### 3.2.4 auth モジュール

**責務**: ユーザー認証、トークン管理

**主要クラス**:
- `PasskeyService`: WebAuthn (Passkey) の登録・認証処理
- `TokenManager`: トークン発行・検証・無効化、トークン数制限
- `AuthServer`: 認証サーバーの起動・停止、ブラウザ連携

### 3.2.5 secrets モジュール

**責務**: 機密情報の CRUD 操作

**主要クラス**: `SecretsService`
- 機密情報の取得・保存・更新・削除
- 有効期限チェック
- 最終アクセス日時の更新

### 3.2.6 audit モジュール

**責務**: 監査ログの記録

**主要クラス**: `AuditService`
- 監査ログの記録
- 監査ログの検索 (Phase 3)

### 3.2.7 database モジュール

**責務**: データベースアクセスの抽象化

**主要クラス**:
- `DatabaseConnection`: DB 接続管理、マイグレーション実行
- `UserRepository`: users テーブルへのアクセス
- `SecretRepository`: secrets テーブルへのアクセス
- `TokenRepository`: tokens テーブルへのアクセス
- `AuditRepository`: audit_logs テーブルへのアクセス

### 3.2.8 utils モジュール

**責務**: エラークラス、バリデーション、対話的入力

**主要クラス/関数**:
- エラークラス: `VaultKeyError`, `AuthenticationError`, `NotFoundError`, `ValidationError`, `ConflictError`, `ExpiredError`
- `validateKey()`: キー名のバリデーション
- `validateToken()`: トークンのバリデーション
- `promptPassword()`: 対話的パスワード入力 (Phase 3)
- `promptConfirm()`: 確認ダイアログ (Phase 3)

## 3.3 モジュール間の依存関係

```
client
  ├── auth (TokenManager)
  ├── secrets (SecretsService)
  └── audit (AuditService)

cli
  ├── client (VaultKeyClient)
  ├── auth (AuthServer) [Phase 2]
  └── utils (prompt) [Phase 3]

secrets
  ├── database (SecretRepository)
  ├── crypto (encrypt, decrypt)
  └── audit (AuditService)

auth
  ├── database (UserRepository, TokenRepository)
  ├── crypto (hashToken, generateToken)
  └── passkey (PasskeyService)

audit
  └── database (AuditRepository)

database
  └── connection (DatabaseConnection)
```

## 3.4 レイヤー分離の原則

1. **ライブラリ API レイヤー** (`client.ts`)
   - 公開 API のみを提供
   - ビジネスロジックレイヤーに処理を委譲

2. **ビジネスロジックレイヤー** (`auth/`, `secrets/`, `audit/`)
   - ドメインロジックを実装
   - データアクセスレイヤーに依存

3. **データアクセスレイヤー** (`database/repositories/`)
   - データベースアクセスを抽象化
   - SQL クエリを隠蔽

4. **インフラストラクチャレイヤー** (`crypto/`, `database/connection.ts`)
   - 暗号化、データベース接続などの低レベル処理
