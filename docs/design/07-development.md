# 7. 開発ガイドライン

## 7.1 コーディング規約

### 7.1.1 TypeScript スタイル

**TypeScript 5+ strict モードを使用**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 7.1.2 命名規則

| 種類 | 規則 | 例 |
|------|------|-----|
| クラス・型 | PascalCase | `SecretsManager`, `VaultKeyClient`, `Secret` |
| 関数・変数 | camelCase | `getSecret`, `userId`, `tokenHash` |
| 定数 | UPPER_SNAKE_CASE | `MAX_TOKEN_AGE`, `DEFAULT_EXPIRATION` |
| ファイル名 | kebab-case | `secret-repository.ts`, `token-manager.ts` |
| プライベート | アンダースコア接頭辞 | `_validateToken`, `_decryptValue` |

### 7.1.3 型定義

**`interface` は使わず、`type` を使用**:

```typescript
// Good
export type Secret = {
  key: string;
  value: string;
  metadata: SecretMetadata;
};

// Bad
export interface Secret {
  key: string;
  value: string;
  metadata: SecretMetadata;
}
```

**関数の返り値の型は明示しない (型推論に任せる)**:

```typescript
// Good
export const getSecret = async (key: string, token: string) => {
  // ...
  return { key, value, metadata };
};

export type GetSecretReturn = ReturnType<typeof getSecret>;

// Bad
export const getSecret = async (key: string, token: string): Promise<Secret> => {
  // ...
};
```

### 7.1.4 関数定義

**`function` は使わず、`const` を使用**:

```typescript
// Good
export const createClient = (config: Config) => {
  // ...
};

// Bad
export function createClient(config: Config) {
  // ...
}
```

**`export default` は使わず、named export を使用**:

```typescript
// Good
export const VaultKeyClient = class {
  // ...
};

// Bad
export default class VaultKeyClient {
  // ...
}
```

### 7.1.5 エラーハンドリング

**すべてのエラーを適切にキャッチして処理**:

```typescript
// Good
export const getSecret = async (key: string, token: string) => {
  try {
    const userId = await tokenManager.verifyToken(token);
    const secret = await secretRepository.findByUserAndKey(userId, key);

    if (!secret) {
      throw new NotFoundError('機密情報が見つかりません');
    }

    return decrypt(secret.encryptedValue);
  } catch (error) {
    if (error instanceof VaultKeyError) {
      throw error;
    }
    throw new VaultKeyError(`機密情報の取得に失敗しました: ${error.message}`);
  }
};
```

### 7.1.6 コメント

**「なぜそれが必要か」を説明する場合のみ記述**:

```typescript
// Good: なぜが説明されている
// トークン数制限を超えた場合、最も古いトークンを無効化する
// これにより、ユーザーが無制限にトークンを発行することを防ぐ
await this._enforceTokenLimit(userId);

// Bad: 何をしているかだけを説明
// トークン数制限をチェック
await this._enforceTokenLimit(userId);
```

### 7.1.7 フォーマット

**Prettier でコードをフォーマット**:

```bash
npm run format
```

**ESLint でコードをチェック**:

```bash
npm run lint
```

## 7.2 テスト戦略

### 7.2.1 ユニットテスト

**すべてのビジネスロジックをカバー (カバレッジ 80% 以上)**:

```typescript
// tests/secrets-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SecretsService } from '../src/secrets/secrets-service';
import { NotFoundError, ExpiredError } from '../src/utils/errors';

describe('SecretsService', () => {
  let service: SecretsService;

  beforeEach(() => {
    service = new SecretsService({
      databaseUrl: ':memory:',
      masterKey: 'test-key',
    });
  });

  it('should store and get secret', async () => {
    await service.storeSecret('user1', 'testKey', 'testValue');
    const secret = await service.getSecret('user1', 'testKey');

    expect(secret.value).toBe('testValue');
  });

  it('should throw NotFoundError when key does not exist', async () => {
    await expect(
      service.getSecret('user1', 'nonexistent')
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ExpiredError when secret is expired', async () => {
    const expiresAt = new Date(Date.now() - 1000); // 1 秒前
    await service.storeSecret('user1', 'testKey', 'testValue', expiresAt);

    await expect(
      service.getSecret('user1', 'testKey')
    ).rejects.toThrow(ExpiredError);
  });
});
```

### 7.2.2 統合テスト

**データベースを含む E2E テスト (テスト用 SQLite を使用)**:

```typescript
// tests/client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { VaultKeyClient } from '../src/client';

describe('VaultKeyClient (integration)', () => {
  let client: VaultKeyClient;
  let adminToken: string;

  beforeEach(async () => {
    client = new VaultKeyClient({ databaseUrl: ':memory:' });
    await client.initialize();

    // テスト用のユーザーとトークンを作成
    adminToken = await setupTestUser(client, 'admin');
  });

  it('should store and get secret', async () => {
    await client.storeSecret({
      key: 'testKey',
      value: 'testValue',
      token: adminToken,
    });

    const secret = await client.getSecret({ key: 'testKey', token: adminToken });
    expect(secret.value).toBe('testValue');
  });
});
```

### 7.2.3 CLI テスト

**Commander コマンドのテスト**:

```typescript
// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';

describe('CLI', () => {
  it('should initialize database', async () => {
    const { stdout, exitCode } = await execa('node', ['dist/cli.js', 'init']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('データベースを初期化しました');
  });

  it('should show help', async () => {
    const { stdout, exitCode } = await execa('node', ['dist/cli.js', '--help']);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Usage:');
  });
});
```

### 7.2.4 モック

**外部依存をモック化**:

```typescript
// tests/token-manager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TokenManager } from '../src/auth/token-manager';

describe('TokenManager', () => {
  it('should issue token', async () => {
    const mockRepository = {
      create: vi.fn(),
      findByHash: vi.fn(),
      countValidByUserId: vi.fn().mockResolvedValue(0),
    };

    const tokenManager = new TokenManager(mockRepository);
    const { token } = await tokenManager.issueToken('user1', 3600);

    expect(token).toBeDefined();
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

### 7.2.5 テスト実行

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test crypto.test.ts

# カバレッジ付きでテストを実行
npm run test:coverage

# UI モードでテストを実行
npm run test:ui

# Watch モードでテストを実行
npm test -- --watch
```

## 7.3 ログ設計

### 7.3.1 ログレベル

| レベル | 用途 | 例 |
|--------|------|-----|
| DEBUG | デバッグ情報 (開発環境のみ) | トークンハッシュ、クエリ内容 |
| INFO | 正常系の処理 | トークン発行、機密情報取得 |
| WARNING | 軽微な問題 | トークン数制限超過 |
| ERROR | エラー | 認証失敗、キー未検出 |
| CRITICAL | システム障害 | DB 接続失敗 |

### 7.3.2 ログ形式

**構造化ログ (JSON 形式)**:

```typescript
const logger = {
  log: (level: string, message: string, context?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
      })
    );
  },
};

// 使用例
logger.log('INFO', '機密情報を取得しました', {
  userId: 'user123',
  key: 'apiKeyOpenai',
  action: 'getSecret',
});

// 出力:
// {
//   "timestamp": "2025-01-22T10:00:00.000Z",
//   "level": "INFO",
//   "message": "機密情報を取得しました",
//   "context": {
//     "userId": "user123",
//     "key": "apiKeyOpenai",
//     "action": "getSecret"
//   }
// }
```

### 7.3.3 機密情報の取り扱い

**絶対に記録しない**:
- 機密情報の値
- トークン (平文)
- パスワード
- 暗号化キー

**記録可能**:
- ユーザー ID、キー名、アクション種別、タイムスタンプ
- エラーメッセージ (機密情報を含まない)

### 7.3.4 ログ実装例

```typescript
// utils/logger.ts
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'INFO') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
      })
    );
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('WARNING', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('ERROR', message, context);
  }

  critical(message: string, context?: Record<string, unknown>) {
    this.log('CRITICAL', message, context);
  }
}

// 使用例
const logger = new Logger(process.env.LOG_LEVEL as LogLevel);

logger.info('機密情報を取得しました', {
  userId: 'user123',
  key: 'apiKeyOpenai',
  action: 'getSecret',
});
```

## 7.4 デバッグ

### 7.4.1 デバッグツール

**VS Code デバッグ設定 (`.vscode/launch.json`)**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/cli.ts",
      "args": ["secret", "get", "testKey"],
      "runtimeArgs": ["--loader", "tsx"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["--run"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 7.4.2 デバッグ用環境変数

```bash
# デバッグログを有効化
export LOG_LEVEL=DEBUG

# デバッグモードで CLI を実行
vaultkey --log-level debug secret get apiKey
```

## 7.5 バージョン管理

### 7.5.1 Git ワークフロー

**ブランチ戦略**:
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `hotfix/*`: 緊急修正

**コミットメッセージ規約**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**type の種類**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: ビルド・設定

**例**:
```
feat(secrets): 有効期限管理機能を追加

機密情報に有効期限を設定できるようにしました。
- storeSecret() に expiresAt パラメータを追加
- listExpiringSecrets() API を追加
- deleteExpiredSecrets() API を追加

Closes #123
```

### 7.5.2 セマンティックバージョニング

**バージョン番号**: `MAJOR.MINOR.PATCH`

- **MAJOR**: 互換性のない API 変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

**例**:
- `0.1.0`: 初回リリース (Phase 1)
- `0.2.0`: Passkey 認証追加 (Phase 2)
- `0.3.0`: CLI 拡張 (Phase 3)
- `1.0.0`: 本番対応 (Phase 4)

## 7.6 コードレビュー

### 7.6.1 チェックリスト

**セキュリティ**:
- [ ] 機密情報がログに記録されていないか
- [ ] エラーメッセージに機密情報が含まれていないか
- [ ] トークンがハッシュ化されているか
- [ ] 暗号化が正しく実装されているか

**コード品質**:
- [ ] TypeScript の型定義が正しいか
- [ ] エラーハンドリングが適切か
- [ ] テストが十分か
- [ ] コメントが適切か

**パフォーマンス**:
- [ ] 不要なクエリが実行されていないか
- [ ] メモリリークの可能性がないか
- [ ] ファイルやコネクションが適切にクローズされているか

## 7.7 ドキュメント

### 7.7.1 コードドキュメント

**JSDoc でクラスと関数を説明**:

```typescript
/**
 * 機密情報を管理するサービス
 */
export class SecretsService {
  /**
   * 機密情報を取得する
   *
   * @param userId - ユーザー ID
   * @param key - 機密情報のキー
   * @returns 復号化された機密情報
   * @throws {NotFoundError} キーが見つからない場合
   * @throws {ExpiredError} 機密情報の有効期限が切れている場合
   */
  async getSecret(userId: string, key: string): Promise<Secret> {
    // ...
  }
}
```

### 7.7.2 README.md

**プロジェクト概要、インストール方法、使用例を記載**

### 7.7.3 CHANGELOG.md

**バージョンごとの変更内容を記載**:

```markdown
# Changelog

## [0.2.0] - 2025-02-01

### Added
- Passkey (WebAuthn) 認証
- ユーザー管理機能
- 監査ログの記録
- トークン数制限
- 有効期限管理機能

### Changed
- データベーススキーマを更新

### Fixed
- トークン検証時のバグを修正

## [0.1.0] - 2025-01-15

### Added
- 機密情報の暗号化保存・取得
- 基本的なトークン管理
- ライブラリインターフェース
- 基本的な CLI コマンド
```

## 7.8 開発環境のセットアップ

### 7.8.1 必要なツール

- Node.js 18+
- npm または yarn または pnpm
- Git
- VS Code (推奨)

### 7.8.2 セットアップ手順

```bash
# リポジトリをクローン
git clone https://github.com/username/vaultkey.git
cd vaultkey

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .env を編集してマスターキーを設定

# データベースを初期化
npm run build
node dist/cli.js init

# テストを実行
npm test

# 開発サーバーを起動
npm run dev
```
