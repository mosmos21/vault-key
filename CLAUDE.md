# VaultKey プロジェクトガイド

このファイルは Claude Code が VaultKey プロジェクトで作業する際のガイドラインです。

## プロジェクト概要

VaultKey は機密情報を安全に管理するための TypeScript ライブラリおよび CLI ツールです。WebAuthn Passkey による認証、暗号化された機密情報の保存、監査ログなどの機能を提供します。

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
- [設計: API仕様](./docs/design/05-api.md)
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

- `interface` は使わず、型を定義するときは `type` を使う
- `class`, `function` は使わず、関数定義には `const` を使う (特別な理由がある場合を除く)
- 基本的に `default export` は使わず `named export` を使う
- 返り値の型は基本的に明記不要 (必要な場合は `ReturnType<typeof funcName>` で型定義)

### React Hook 実装ガイドライン (該当する場合)

- `useHook` という名前は禁止 (具体的な目的がわかる命名にする)
- hook ファイル名には `hook.ts` を使わず、実装している hook 名に合わせる

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
- キーの名前空間はユーザーごとに分離される (`secrets` テーブルの複合主キー: `user_id`, `key`)

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

- 開発環境: SQLite
- 本番環境: PostgreSQL
- マイグレーションは Knex.js を使用

### CLI 実装

- 対話的入力にはパスワードプロンプトを使用 (値をマスク表示)
- 危険な操作には確認ダイアログを表示 (`--force` で確認スキップ可能)
- 出力フォーマットは JSON/YAML/テーブル形式をサポート

## 環境変数

- `LOG_LEVEL`: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `VAULTKEY_AUTH_PORT`: 認証サーバーのポート (デフォルト: 5432)

## コミットメッセージ

- 日本語で記述
- 全角文字と半角文字の間にスペースを入れる (周囲の既存文章とのバランスに考慮)
- RuboCop 違反修正など、主目的でない変更はコミットメッセージに含めない

## その他

- テキストファイルの末尾には POSIX 準拠で改行文字を入れる
- 文字コードは UTF-8 で記載
- メソッド・関数の責務は常に最小の責務を持つように実装
- コードのコメントとして何を実装したかは書かない (なぜそれが必要かを説明する必要がある場合のみコメントを書く)
