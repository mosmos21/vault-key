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

**主要関数**:

```typescript
// CLI エントリポイント
export const main = async (): Promise<void> => {
  // Commander でコマンドを定義
};

// データベース初期化
const initCommand = async (): Promise<void> => {
  // データベースとテーブルを作成
};

// ユーザー管理コマンド
const userRegisterCommand = async (username: string): Promise<void> => {
  // Passkey 認証サーバーを起動
  // ブラウザで登録フローを実行
};

const userLoginCommand = async (username: string, options: { manual?: boolean }): Promise<void> => {
  // Passkey 認証サーバーを起動
  // デフォルト: ブラウザ自動起動
  // --manual: 手動コピー方式
};

// 機密情報管理コマンド
const secretSetCommand = async (key: string, options: { expiresIn?: string }): Promise<void> => {
  // 対話的に値を入力 (Phase 3)
  // VaultKeyClient.storeSecret() を呼び出し
};

const secretGetCommand = async (key: string, options: { format?: string }): Promise<void> => {
  // VaultKeyClient.getSecret() を呼び出し
  // フォーマット変換 (JSON/YAML/テーブル)
};

const secretDeleteCommand = async (key: string, options: { force?: boolean }): Promise<void> => {
  // 確認ダイアログ (Phase 3)
  // VaultKeyClient.deleteSecret() を呼び出し
};

// 有効期限管理コマンド (Phase 2)
const secretListExpiringCommand = async (options: { days?: number }): Promise<void> => {
  // VaultKeyClient.listExpiringSecrets() を呼び出し
};

const secretCleanupExpiredCommand = async (options: { force?: boolean }): Promise<void> => {
  // 確認ダイアログ (Phase 3)
  // VaultKeyClient.deleteExpiredSecrets() を呼び出し
};
```

### 3.2.3 crypto モジュール

**責務**: データの暗号化・復号化、ハッシュ化

**主要クラス/関数**:

```typescript
// encryption.ts
export const encrypt = (plaintext: string, masterKey: Buffer): EncryptedData => {
  // AES-256-GCM で暗号化
  // IV (Initialization Vector) を生成
  // 暗号化データ + IV + Auth Tag を返却
};

export const decrypt = (encryptedData: EncryptedData, masterKey: Buffer): string => {
  // AES-256-GCM で復号化
  // Auth Tag を検証
  // 平文を返却
};

// token-hash.ts
export const hashToken = (token: string): string => {
  // SHA-256 でハッシュ化
  // Hex 文字列で返却
};

export const generateToken = (): string => {
  // crypto.randomBytes(32) でランダムトークンを生成
  // Base64 URL-safe エンコード
};
```

### 3.2.4 auth モジュール

**責務**: ユーザー認証、トークン管理

**主要クラス/関数**:

```typescript
// passkey.ts
export class PasskeyService {
  // Passkey 登録開始
  generateRegistrationOptions(userId: string, username: string): Promise<PublicKeyCredentialCreationOptions>;

  // Passkey 登録完了
  verifyRegistrationResponse(response: RegistrationResponseJSON, challenge: string): Promise<VerifiedRegistration>;

  // Passkey 認証開始
  generateAuthenticationOptions(userId: string): Promise<PublicKeyCredentialRequestOptions>;

  // Passkey 認証完了
  verifyAuthenticationResponse(response: AuthenticationResponseJSON, challenge: string, publicKey: Buffer): Promise<VerifiedAuthentication>;
}

// token-manager.ts
export class TokenManager {
  // トークン発行
  issueToken(userId: string, expiresIn: number): Promise<{ token: string; tokenHash: string }>;

  // トークン検証
  verifyToken(token: string): Promise<string>; // ユーザー ID を返す

  // トークン無効化
  revokeToken(token: string): Promise<void>;

  // ユーザーのトークン一覧取得
  listUserTokens(userId: string): Promise<TokenInfo[]>;

  // トークン数制限チェックと古いトークンの無効化
  private enforceTokenLimit(userId: string): Promise<void>;
}

// auth-server.ts (Phase 2)
export class AuthServer {
  // 認証サーバーを起動
  start(): Promise<void>;

  // 認証サーバーを停止
  stop(): Promise<void>;

  // ブラウザを自動起動
  openBrowser(url: string): Promise<void>;
}
```

### 3.2.5 secrets モジュール

**責務**: 機密情報の CRUD 操作

**主要クラス/関数**:

```typescript
// secrets-service.ts
export class SecretsService {
  // 機密情報取得
  async getSecret(userId: string, key: string): Promise<Secret> {
    // ユーザー ID とキーで検索
    // 有効期限チェック
    // 復号化
    // 最終アクセス日時を更新
  }

  // 機密情報保存
  async storeSecret(userId: string, key: string, value: string, expiresAt?: Date): Promise<void> {
    // 暗号化
    // DB に保存
  }

  // 機密情報更新
  async updateSecret(userId: string, key: string, value: string, expiresAt?: Date): Promise<void> {
    // 存在確認
    // 暗号化
    // DB 更新
    // updated_by, updated_at を更新
  }

  // 機密情報削除
  async deleteSecret(userId: string, key: string): Promise<void> {
    // 存在確認
    // DB から削除
  }

  // キー一覧取得
  async listSecrets(userId: string, pattern?: string): Promise<string[]> {
    // ユーザーの機密情報一覧を取得
    // パターンマッチでフィルタリング
  }

  // 有効期限切れ間近の機密情報一覧 (Phase 2)
  async listExpiringSecrets(userId: string, daysUntilExpiry: number): Promise<ExpiringSecret[]> {
    // expires_at が daysUntilExpiry 日以内の機密情報を取得
  }

  // 有効期限切れの機密情報一覧 (Phase 2)
  async listExpiredSecrets(userId: string): Promise<ExpiredSecret[]> {
    // expires_at が現在時刻より前の機密情報を取得
  }

  // 有効期限切れの機密情報削除 (Phase 2)
  async deleteExpiredSecrets(userId: string): Promise<number> {
    // 有効期限切れの機密情報を削除
    // 削除件数を返す
  }
}
```

### 3.2.6 audit モジュール

**責務**: 監査ログの記録

**主要クラス/関数**:

```typescript
// audit-service.ts
export class AuditService {
  // 監査ログ記録
  async log(entry: AuditLogEntry): Promise<void> {
    // audit_logs テーブルに記録
  }

  // 監査ログ検索 (Phase 3)
  async search(userId: string, filters: AuditSearchFilters): Promise<AuditLogEntry[]> {
    // ユーザー ID、日時範囲、アクション種別でフィルタリング
  }
}

export type AuditLogEntry = {
  userId: string;
  action: AuditAction;
  resourceKey?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
};

export type AuditAction =
  | 'get'
  | 'store'
  | 'update'
  | 'delete'
  | 'list'
  | 'login'
  | 'register'
  | 'list_expiring'
  | 'list_expired'
  | 'cleanup_expired';
```

### 3.2.7 database モジュール

**責務**: データベースアクセスの抽象化

**主要クラス/関数**:

```typescript
// connection.ts
export class DatabaseConnection {
  constructor(databaseUrl: string);

  // データベース接続取得
  getConnection(): Database;

  // マイグレーション実行
  async runMigrations(): Promise<void>;

  // 接続クローズ
  close(): void;
}

// repositories/user-repository.ts
export class UserRepository {
  // ユーザー作成
  async create(user: UserData): Promise<void>;

  // ユーザー ID で検索
  async findById(userId: string): Promise<User | null>;

  // ユーザー名で検索
  async findByUsername(username: string): Promise<User | null>;

  // Credential ID で検索
  async findByCredentialId(credentialId: string): Promise<User | null>;
}

// repositories/secret-repository.ts
export class SecretRepository {
  // 機密情報作成
  async create(secret: SecretData): Promise<void>;

  // ユーザー ID とキーで検索
  async findByUserAndKey(userId: string, key: string): Promise<Secret | null>;

  // ユーザー ID で一覧取得
  async findByUserId(userId: string): Promise<Secret[]>;

  // 有効期限切れ間近の機密情報を取得
  async findExpiringByUserId(userId: string, daysUntilExpiry: number): Promise<Secret[]>;

  // 有効期限切れの機密情報を取得
  async findExpiredByUserId(userId: string): Promise<Secret[]>;

  // 有効期限切れの機密情報を削除
  async deleteExpiredByUserId(userId: string): Promise<number>;

  // 機密情報更新
  async update(userId: string, key: string, updates: Partial<SecretData>): Promise<void>;

  // 機密情報削除
  async delete(userId: string, key: string): Promise<void>;
}

// repositories/token-repository.ts
export class TokenRepository {
  // トークン作成
  async create(token: TokenData): Promise<void>;

  // トークンハッシュで検索
  async findByHash(tokenHash: string): Promise<Token | null>;

  // ユーザー ID で有効なトークン一覧を取得
  async findValidByUserId(userId: string): Promise<Token[]>;

  // ユーザー ID で有効なトークン数を取得
  async countValidByUserId(userId: string): Promise<number>;

  // 最も古いトークンを取得
  async findOldestByUserId(userId: string): Promise<Token | null>;

  // トークン無効化
  async revoke(tokenHash: string): Promise<void>;
}

// repositories/audit-repository.ts
export class AuditRepository {
  // 監査ログ記録
  async create(entry: AuditLogEntry): Promise<void>;

  // ユーザー ID で検索
  async findByUserId(userId: string, filters: AuditSearchFilters): Promise<AuditLogEntry[]>;
}
```

### 3.2.8 utils モジュール

**責務**: エラークラス、バリデーション、対話的入力

**主要クラス/関数**:

```typescript
// errors.ts
export class VaultKeyError extends Error {}
export class AuthenticationError extends VaultKeyError {}
export class PermissionError extends VaultKeyError {}
export class NotFoundError extends VaultKeyError {}
export class ValidationError extends VaultKeyError {}
export class ConflictError extends VaultKeyError {}
export class ExpiredError extends VaultKeyError {}

// validators.ts
export const validateKey = (key: string): void => {
  // キー名のバリデーション
};

export const validateToken = (token: string): void => {
  // トークンのバリデーション
};

// prompt.ts (Phase 3)
export const promptPassword = async (message: string): Promise<string> => {
  // 対話的にパスワード入力を受け付ける
  // マスク表示
};

export const promptConfirm = async (message: string): Promise<boolean> => {
  // 確認ダイアログを表示
};
```

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
