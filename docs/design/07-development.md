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

**基本方針**:
- すべてのエラーを適切にキャッチして処理
- カスタムエラークラス (`VaultKeyError` など) を使用
- エラーの再スローは適切に判断 (カスタムエラーはそのまま、それ以外はラップ)
- エラーメッセージに機密情報を含めない

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

**目標**: すべてのビジネスロジックをカバー (カバレッジ 80% 以上)

**テスト対象**:
- 各サービスクラスのメソッド
- 暗号化・復号化処理
- トークン管理
- バリデーション処理

**テストケース例**:
- 正常系: 機密情報の保存と取得
- 異常系: キーが存在しない場合の `NotFoundError`
- 異常系: 有効期限切れの場合の `ExpiredError`

### 7.2.2 統合テスト

**目標**: データベースを含む E2E テスト

**使用するデータベース**: テスト用 SQLite (`:memory:`)

**テストケース例**:
- VaultKeyClient を使った機密情報の保存・取得
- ユーザー認証フロー
- トークン管理フロー

### 7.2.3 CLI テスト

**使用ライブラリ**: `execa` (コマンド実行)

**テストケース例**:
- `vaultkey init` コマンドの実行
- `vaultkey --help` のヘルプ表示
- 各サブコマンドの実行と出力確認

### 7.2.4 モック

**使用ライブラリ**: Vitest の `vi.fn()`

**モック対象**:
- データベース Repository
- 外部 API クライアント
- ファイルシステム操作

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

各ログエントリは以下のフィールドを含む:
- `timestamp`: ISO 8601 形式のタイムスタンプ
- `level`: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `message`: ログメッセージ
- `context`: コンテキスト情報 (オプション)

**出力例**:
```json
{
  "timestamp": "2025-01-22T10:00:00.000Z",
  "level": "INFO",
  "message": "機密情報を取得しました",
  "context": {
    "userId": "user123",
    "key": "apiKeyOpenai",
    "action": "getSecret"
  }
}
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

### 7.3.4 Logger クラスの設計

**主要機能**:
- ログレベルによるフィルタリング
- 構造化ログの出力 (JSON 形式)
- レベル別のメソッド (`debug`, `info`, `warn`, `error`, `critical`)
- 環境変数 `LOG_LEVEL` によるログレベル設定

## 7.4 デバッグ

### 7.4.1 デバッグツール

**VS Code デバッグ設定**:

`.vscode/launch.json` に以下のデバッグ設定を用意:
- **Debug CLI**: CLI コマンドのデバッグ実行
  - tsx ローダーを使用
  - コマンドライン引数を指定可能
- **Debug Tests**: テストのデバッグ実行
  - Vitest を使用
  - 統合ターミナルで実行

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

クラスと公開関数には JSDoc を記述:
- クラスの概要
- 関数の説明
- パラメータの説明 (`@param`)
- 返り値の説明 (`@returns`)
- スローされるエラー (`@throws`)

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
