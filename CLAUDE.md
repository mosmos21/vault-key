# VaultKey プロジェクトガイド

このファイルは Claude Code が VaultKey プロジェクトで作業する際のガイドラインです。

## プロジェクト概要

VaultKey は機密情報を安全に管理するための TypeScript ライブラリおよび CLI ツールです。WebAuthn Passkey による認証、暗号化された機密情報の保存、監査ログなどの機能を提供します。

## プロジェクト構造

このプロジェクトは monorepo 構成で、以下のパッケージで構成されています:

- `packages/core`: VaultKey のコアライブラリ (`@mosmos_21/vault-key-core`)
- `packages/cli`: CLI ツール (`@mosmos_21/vault-key-cli`)

パッケージ管理には pnpm workspace を使用しています。

## ドキュメント構造

- [docs/requirements/](./docs/requirements/): 要件定義書
- [docs/design/](./docs/design/): 設計書

主要なドキュメント:
- [要件定義: 概要](./docs/requirements/01-overview.md)
- [要件定義: 機能要件](./docs/requirements/03-functional-requirements.md)
- [設計: アーキテクチャ](./docs/design/01-architecture.md)
- [設計: データベース](./docs/design/02-database.md)
- [設計: モジュール設計](./docs/design/03-modules.md)
- [設計: セキュリティ](./docs/design/04-security.md)
- [設計: API 仕様](./docs/design/05-api.md)
- [設計: 実装計画](./docs/design/06-implementation.md)
- [設計: 開発ガイドライン](./docs/design/07-development.md)

## コーディング規約

### 命名規則

| 種類 | 規則 | 例 |
|------|------|-----|
| クラス・型 | PascalCase | `SecretsManager`, `VaultKeyClient`, `Secret` |
| 関数・変数 | camelCase | `getSecret`, `userId`, `tokenHash` |
| 定数 | UPPER_SNAKE_CASE | `MAX_TOKEN_AGE`, `DEFAULT_EXPIRATION` |
| ファイル名 | lowerCamelCase | `secretRepository.ts`, `tokenManager.ts` |
| プライベート | アンダースコア接頭辞 | `_validateToken`, `_decryptValue` |

### TypeScript 実装ガイドライン

- `interface` は使わず、型を定義するときは `type` を使う (特別な理由がある場合を除く)
- `class`, `function` は使わず、関数定義には `const` を使う (特別な理由がある場合を除く)
- 基本的に `default export` は使わず `named export` を使う
- 返り値の型は基本的に明記不要 (必要な場合は `ReturnType<typeof funcName>` で型定義)
- **型アサーション (`as`) は使わない**: ランタイム型検証を行うため Zod などのスキーマ検証ライブラリを使用する
  - データベースから取得されるデータは Zod スキーマで検証する
  - 外部 API からのレスポンスも Zod スキーマで検証する
  - `as any`、`as unknown`、`as Type` などのすべての型アサーションを避ける
  - やむを得ず使用する場合は、その理由をコメントで明記する

### エラーハンドリング

- すべてのエラーを適切にキャッチして処理
- カスタムエラークラス (`VaultKeyError` など) を使用
- エラーメッセージに機密情報を含めない

## ログ設計

### ログレベル

| レベル | 用途 |
|--------|------|
| DEBUG | デバッグ情報 (開発環境のみ) |
| INFO | 正常系の処理 |
| WARNING | 軽微な問題 |
| ERROR | エラー |
| CRITICAL | システム障害 |

### 機密情報の取り扱い

**絶対に記録しない**:
- 機密情報の値
- トークン (平文)
- パスワード
- 暗号化キー

**記録可能**:
- ユーザー ID、キー名、アクション種別、タイムスタンプ
- エラーメッセージ (機密情報を含まない)

## テスト戦略

### テストファイルの命名規則

**重要**: 実装ファイル `foo.ts` に対応するテストファイルは必ず `foo.test.ts` とする

**ディレクトリ構造**:
```
packages/core/
├── src/
│   ├── database/
│   │   ├── connection.ts
│   │   └── repositories/
│   │       ├── userRepository.ts
│   │       ├── secretRepository.ts
│   │       └── tokenRepository.ts
└── __tests__/
    └── database/
        ├── connection.test.ts
        ├── userRepository.test.ts
        ├── secretRepository.test.ts
        └── tokenRepository.test.ts
```

**基本方針**:
- 1つの実装ファイルに対して1つのテストファイルを作成
- テストファイルは対応する実装ファイルの責務のみをテスト
- 複数のモジュールにまたがる統合テストは別途作成

### ユニットテスト

- 目標: すべてのビジネスロジックをカバー (カバレッジ 100%)
- 各サービスクラスのメソッドをテスト
- 暗号化・復号化処理、トークン管理、バリデーション処理をテスト

### 統合テスト

- データベースを含む E2E テスト
- テスト用 SQLite (`:memory:`) を使用
- VaultKeyClient を使った機密情報の保存・取得フローをテスト

### CLI テスト

- `execa` を使ってコマンド実行をテスト
- 各サブコマンドの実行と出力を確認

## アーキテクチャの重要なポイント

### ユーザー分離

- すべてのユーザーは対等な権限を持つ (管理者・一般ユーザーの区別なし)
- 各ユーザーは自分が作成した機密情報のみにアクセス可能
- キーの名前空間はユーザーごとに分離される (`secrets` テーブルの複合主キー: `userId`, `key`)

### 認証フロー

- WebAuthn Passkey による認証
- 2つの UX パターン:
  - ブラウザ自動起動方式 (デフォルト)
  - 手動コピー方式 (WSL などの環境向け)

### トークン管理

- 1 ユーザーあたりのトークン数制限 (デフォルト: 5個)
- 制限を超える場合、最も古いトークンが自動的に無効化される

### 有効期限管理

- 機密情報に有効期限を設定可能
- 有効期限切れの機密情報へのアクセスは拒否される
- 有効期限切れの機密情報を一覧表示・削除するコマンドを提供

## 実装時の注意事項

### セキュリティ

- すべての機密情報は暗号化して保存
- トークンはハッシュ化して DB に保存 (平文は保存しない)
- ログに機密情報を出力しない
- エラーメッセージに機密情報を含めない

### データベース

- **node:sqlite**: Node.js 24+ 組み込みの SQLite データベースモジュールを使用
  - 追加パッケージ不要 (ネイティブモジュールのビルドが不要)
  - 同期 API でシンプルな実装
  - camelCase の命名規則を使用 (例: `userId`, `createdAt`)
- データベースファイルのデフォルトパス: `~/.vaultkey/vaultkey.db`
- テスト時は `:memory:` データベースを使用

### データベーススキーマの命名規則

- テーブル名: 複数形 (例: `users`, `secrets`, `auditLogs`)
- カラム名: camelCase (例: `userId`, `createdAt`, `tokenHash`)
- 複合主キーの順序: ユーザー固有のリソースは `userId` を先頭に配置

### CLI 実装

- 対話的入力にはパスワードプロンプトを使用 (値をマスク表示)
- 危険な操作には確認ダイアログを表示 (`--force` で確認スキップ可能)
- 出力フォーマットは JSON/YAML/テーブル形式をサポート

## 開発コマンド

### パッケージ管理

```bash
# 依存関係のインストール
pnpm install

# パッケージの追加 (例: core パッケージに追加)
pnpm --filter @mosmos_21/vault-key-core add <package>

# パッケージの削除
pnpm --filter @mosmos_21/vault-key-core remove <package>
```

### ビルド

```bash
# 全パッケージのビルド
pnpm build

# 特定パッケージのビルド
pnpm --filter @mosmos_21/vault-key-core build
```

### テスト

```bash
# 全パッケージのテスト実行
pnpm test

# 特定パッケージのテスト実行
pnpm --filter @mosmos_21/vault-key-core test
```

### コード品質チェック

```bash
# すべてのチェック実行 (ESLint, Prettier, TypeScript)
pnpm check

# 個別のチェック
pnpm check:eslint    # ESLint チェック
pnpm check:prettier  # Prettier フォーマットチェック
pnpm check:tsc       # TypeScript コンパイルチェック

# 自動修正
pnpm fix             # すべての自動修正を実行
pnpm fix:eslint      # ESLint の自動修正
pnpm fix:prettier    # Prettier の自動フォーマット
```

## 環境変数

### Master key 関連

Master key は以下の優先順位で読み込まれます:

1. CLI オプション `--master-key` (直接指定)
2. CLI オプション `--master-key-file` (ファイル指定)
3. 環境変数 `VAULTKEY_ENCRYPTION_KEY` (直接指定)
4. 環境変数 `VAULTKEY_MASTER_KEY` (直接指定、互換性)
5. 環境変数 `VAULTKEY_MASTER_KEY_FILE` (ファイル指定)
6. デフォルトファイル `~/.vaultkey/master.key`
7. 自動生成 (デフォルトファイルに保存)

- `VAULTKEY_ENCRYPTION_KEY`: Master key (64 文字の 16 進数文字列)
- `VAULTKEY_MASTER_KEY`: Master key (64 文字の 16 進数文字列、互換性のため)
- `VAULTKEY_MASTER_KEY_FILE`: Master key ファイルのパス

### その他の環境変数

- `VAULTKEY_LOG_LEVEL`: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `VAULTKEY_AUTH_PORT`: 認証サーバーのポート (デフォルト: 5432)
- `VAULTKEY_DB_PATH`: データベースファイルのパス (デフォルト: `~/.vaultkey/vaultkey.db`)
- `VAULTKEY_TOKEN_TTL`: トークンの有効期限 (秒、デフォルト: 2592000 = 30 日)
- `VAULTKEY_MAX_TOKENS_PER_USER`: 1 ユーザーあたりの最大トークン数 (デフォルト: 5)

## コミットメッセージ

- 日本語で記述
- 全角文字と半角文字の間にスペースを入れる (周囲の既存文章とのバランスに考慮)
- 主目的でない変更はコミットメッセージに含めない

## ファイル作成時の注意事項

### 文字化け防止

**重要**: ファイルを新規作成する際は、以下の手順を厳守すること:

1. **Write ツールを直接使用する**
   - ファイル作成時は Write ツールで直接内容を書き込む
   - touch コマンドで空ファイルを作成してから Write する方法は使わない
   - この方法により、文字エンコーディングの問題を防ぐ

2. **適切な文字エンコーディング**
   - すべてのテキストファイルは UTF-8 で保存する
   - ASCII 範囲内の文字のみを使用する場合でも UTF-8 として扱う
   - コメントに日本語を含める場合は特に注意

3. **ファイル作成後の確認**
   - ファイル作成後、必要に応じて `file` コマンドでエンコーディングを確認
   - "data" や不明なエンコーディングと表示された場合は即座に修正

4. **コメントのガイドライン**
   - JSDoc コメントは英語で記述することを推奨
   - 日本語コメントを使う場合は、文字化けに特に注意

### ファイル作成の正しい例

```typescript
// ✅ 正しい方法: Write ツールで直接作成
Write({
  file_path: '/path/to/file.ts',
  content: `/**
 * User repository
 */
export const createUser = (/* ... */) => {
  // implementation
};
`
});

// ❌ 間違った方法: touch で空ファイルを作ってから Write
// この方法は文字化けの原因になる可能性がある
Bash({ command: 'touch /path/to/file.ts' });
Write({ file_path: '/path/to/file.ts', content: '...' });
```

## その他

- テキストファイルの末尾には POSIX 準拠で改行文字を入れる
- 文字コードは UTF-8 で記載
- メソッド・関数の責務は常に最小の責務を持つように実装
- コードのコメントとして何を実装したかは書かない (なぜそれが必要かを説明する必要がある場合のみコメントを書く)
