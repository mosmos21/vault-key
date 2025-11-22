# VaultKey 開発ロードマップ

このドキュメントは VaultKey の開発スコープを @mosmos/vaultkey-core と @mosmos/vaultkey-cli のバージョンごとに整理したものです。

## バージョニング方針

- **セマンティックバージョニング (SemVer)** を採用
- core と cli は基本的に同じバージョン番号でリリース
- 破壊的変更がある場合はメジャーバージョンを上げる
- 機能追加はマイナーバージョンを上げる
- バグ修正はパッチバージョンを上げる

---

## v0.1.0: MVP (最小限の機能)

**リリース目標**: 基本的な機密情報管理機能の提供

### @mosmos/vaultkey-core v0.1.0

**主要機能**:
- ✅ 機密情報の暗号化保存・取得 (FR-1.1, FR-1.2)
- ✅ 機密情報の更新・削除 (FR-1.3, FR-1.4)
- ✅ キー一覧取得 (FR-1.5)
- ✅ 基本的なトークン管理 (発行・検証・無効化) (FR-3.1, FR-3.2, FR-3.3)
- ✅ ユーザー分離 (各ユーザーは自分の機密情報のみアクセス可能)
- ✅ ライブラリインターフェース (FR-5.1)
  - `getSecret(key, token)`
  - `storeSecret(key, value, token)`
  - `updateSecret(key, value, token)`
  - `deleteSecret(key, token)`
  - `listSecrets(token, pattern?)`
  - `revokeToken(token)`
  - `listTokens(token)`
- ✅ エラーハンドリング (FR-5.2)

**データベース**:
- SQLite (better-sqlite3)
- 基本スキーマ: `users`, `secrets`, `tokens`

**セキュリティ**:
- AES-256-GCM による暗号化
- トークンのハッシュ化保存
- 環境変数でマスターキー管理

**テスト**:
- ユニットテスト (カバレッジ 80% 以上)
- 統合テスト (E2E、SQLite インメモリ)

**ドキュメント**:
- README (インストール・基本的な使い方)
- API リファレンス

**除外項目** (v0.2.0 以降で実装):
- Passkey 認証 (ダミーの認証機構で代替)
- 監査ログ
- 有効期限管理
- トークン数制限
- PostgreSQL サポート

---

### @mosmos/vaultkey-cli v0.1.0

**主要機能**:
- ✅ 基本的な CLI コマンド (FR-6.1)
  - `vaultkey init`: データベース初期化
  - `vaultkey user register`: ユーザー登録 (ダミー認証)
  - `vaultkey user login`: ユーザー認証・トークン発行 (ダミー認証)
  - `vaultkey secret get <key>`: 機密情報取得
  - `vaultkey secret set <key>`: 機密情報保存 (値は対話的に入力)
  - `vaultkey secret update <key>`: 機密情報更新 (値は対話的に入力)
  - `vaultkey secret delete <key>`: 機密情報削除
  - `vaultkey secret list [--pattern <pattern>]`: キー一覧取得
  - `vaultkey token revoke <token>`: トークン無効化
  - `vaultkey token list`: トークン一覧取得
- ✅ トークン管理 (FR-6.2)
  - 環境変数 (`VAULTKEY_TOKEN`) からトークン読み込み
  - `--token` オプションでトークン指定
- ✅ 対話的入力 (FR-6.4)
  - `secret set` / `secret update` で値をマスク表示で入力

**CLI ライブラリ**:
- commander (コマンド定義)
- chalk (色付け出力)
- prompts (対話的入力)

**除外項目** (v0.2.0 以降で実装):
- Passkey 認証フロー
- 出力フォーマット選択 (JSON/YAML)
- 確認ダイアログ (`--force` オプション)
- 監査ログ検索コマンド
- 有効期限管理コマンド

---

## v0.2.0: 認証強化

**リリース目標**: Passkey 認証の実装、セキュリティ機能の強化

### @mosmos/vaultkey-core v0.2.0

**主要機能**:
- ✅ Passkey 認証の実装 (FR-2.1, FR-2.2)
  - WebAuthn による登録・認証フロー
  - @simplewebauthn/server を使用
- ✅ ユーザー管理機能
  - `users` テーブルに Passkey 認証情報を追加
- ✅ 監査ログの記録 (FR-4.1)
  - すべてのアクセスログを記録
  - ログテーブル: `audit_logs`
- ✅ トークン数制限の実装 (FR-3.1)
  - 1 ユーザーあたり最大 5 個 (設定可能)
  - 制限超過時、最古のトークンを自動無効化
- ✅ 有効期限管理機能 (FR-1.6)
  - `secrets` テーブルに `expires_at` カラム追加
  - 有効期限切れ機密情報へのアクセス拒否
  - ライブラリ API に有効期限関連メソッドを追加:
    - `storeSecret(key, value, token, expiresAt?)`
    - `updateSecret(key, value, token, expiresAt?)`
    - `listExpiringSecrets(token, daysUntilExpiry)`
    - `listExpiredSecrets(token)`
    - `deleteExpiredSecrets(token)`

**データベース**:
- SQLite (継続)
- スキーマ拡張: `audit_logs` テーブル追加、`secrets` テーブルに `expires_at` カラム追加

**テスト**:
- Passkey 認証フローのテスト
- 監査ログ記録のテスト
- トークン数制限のテスト
- 有効期限管理のテスト

**ドキュメント**:
- Passkey 認証の設定方法
- 監査ログの利用方法
- 有効期限管理の使い方

---

### @mosmos/vaultkey-cli v0.2.0

**主要機能**:
- ✅ Passkey 認証フローの実装 (FR-2.2)
  - **デフォルト**: ブラウザ自動起動方式
    - CLI がブラウザを自動的に開く
    - ブラウザで Passkey 認証を実行
    - 認証成功後、ブラウザを閉じて CLI に戻る
  - **WSL などの環境**: 手動コピー方式
    - CLI が認証 URL を表示
    - ユーザーが手動でブラウザを開いて URL にアクセス
    - Passkey 認証後、ブラウザにトークンが表示される
    - ユーザーがトークンをコピーして CLI に貼り付け
- ✅ 有効期限管理コマンド (FR-1.6, FR-6.1)
  - `vaultkey secret set <key> [--expires-in <duration>]`
  - `vaultkey secret update <key> [--expires-in <duration>]`
  - `vaultkey secret list-expiring [--days <days>]`
  - `vaultkey secret list-expired`
  - `vaultkey secret cleanup-expired [--force]`

**除外項目** (v0.3.0 以降で実装):
- 出力フォーマット選択 (JSON/YAML)
- 確認ダイアログ (`--force` オプション)
- 監査ログ検索コマンド

---

## v0.3.0: CLI 拡張

**リリース目標**: CLI の使いやすさ向上、監査ログ検索機能の追加

### @mosmos/vaultkey-core v0.3.0

**主要機能**:
- ✅ 監査ログ検索機能 (FR-4.2)
  - ライブラリ API に監査ログ検索メソッドを追加:
    - `searchAuditLogs(token, filters)`
  - 検索条件: ユーザー ID、日時範囲、アクション種別、リソースキー

**テスト**:
- 監査ログ検索のテスト

**ドキュメント**:
- 監査ログ検索の使い方

---

### @mosmos/vaultkey-cli v0.3.0

**主要機能**:
- ✅ 出力フォーマット選択 (FR-6.3)
  - `--format json`: JSON 形式
  - `--format yaml`: YAML 形式
  - デフォルト: テーブル形式
- ✅ 確認ダイアログ (FR-6.5)
  - `secret delete` / `secret cleanup-expired` で確認ダイアログを表示
  - `--force` オプションで確認をスキップ
- ✅ 監査ログ検索コマンド (FR-6.1)
  - `vaultkey audit search [--user <user>] [--from <date>] [--to <date>] [--action <action>] [--key <key>]`

**CLI ライブラリ**:
- js-yaml (YAML 出力)

**テスト**:
- CLI の出力フォーマットテスト
- 確認ダイアログのテスト
- 監査ログ検索コマンドのテスト

**ドキュメント**:
- CLI の高度な機能の使い方

---

## v0.4.0: 本番対応準備

**リリース目標**: PostgreSQL サポート、セキュリティ監査、ドキュメント整備

### @mosmos/vaultkey-core v0.4.0

**主要機能**:
- ✅ PostgreSQL サポート (Phase 4)
  - pg クライアントを使用
  - データベース接続先を環境変数で切り替え (`VAULTKEY_DATABASE_URL`)
  - SQLite と PostgreSQL の両方をサポート
- ✅ セキュリティ監査
  - コードレビュー
  - 脆弱性スキャン
  - セキュリティテスト
- ✅ パフォーマンス最適化
  - データベースクエリの最適化
  - インデックスの追加

**テスト**:
- PostgreSQL を使用した統合テスト
- セキュリティテスト

**ドキュメント**:
- PostgreSQL セットアップガイド
- セキュリティベストプラクティス
- パフォーマンスチューニングガイド

---

### @mosmos/vaultkey-cli v0.4.0

**主要機能**:
- ✅ PostgreSQL サポート
  - データベース接続先を環境変数で切り替え
- ✅ エラーメッセージの改善
  - より詳細でわかりやすいエラーメッセージ

**テスト**:
- PostgreSQL を使用した CLI テスト

**ドキュメント**:
- CLI のトラブルシューティングガイド

---

## v1.0.0: 正式リリース

**リリース目標**: 安定版の提供、本番環境での使用を推奨

### @mosmos/vaultkey-core v1.0.0

**主要機能**:
- ✅ すべての機能の安定化
- ✅ 包括的なテスト (カバレッジ 100%)
- ✅ セキュリティ監査の完了
- ✅ ドキュメントの完成

**品質保証**:
- ユニットテスト、統合テスト、E2E テストの完全カバー
- セキュリティ監査レポート
- パフォーマンステスト

**ドキュメント**:
- 完全な API リファレンス
- 詳細なチュートリアル
- アーキテクチャドキュメント
- セキュリティガイド

---

### @mosmos/vaultkey-cli v1.0.0

**主要機能**:
- ✅ すべての CLI 機能の安定化
- ✅ 包括的なテスト
- ✅ ドキュメントの完成

**品質保証**:
- CLI テストの完全カバー
- ユーザビリティテスト

**ドキュメント**:
- 完全な CLI リファレンス
- 詳細な使い方ガイド
- FAQ

---

## 将来の拡張候補 (v1.1.0 以降)

以下は v1.0.0 リリース後に検討する機能です:

### 認証・権限管理
- リフレッシュトークン機能
- トークンのスコープ設定
- 複数 Passkey のサポート (1 ユーザーに複数の Passkey を登録)
- ロールベースのアクセス制御 (RBAC)

### 機密情報管理
- 機密情報のバージョン管理
- 機密情報の共有機能 (特定のユーザー間で機密情報を共有)
- 機密情報のタグ付け・カテゴリ管理

### 監査・ログ
- 監査ログの自動削除・アーカイブ機能
- 監査ログの容量制限機能
- アラート機能 (異常なアクセスパターンの検出)

### CLI 拡張
- シェル補完 (bash, zsh, fish)
- エイリアス機能
- 一括操作コマンド

### インテグレーション
- CI/CD パイプラインとの統合
- クラウドサービスとの統合 (AWS Secrets Manager、Azure Key Vault など)
- プラグインシステム

---

## マイルストーン

| バージョン | リリース目標時期 | 主要機能 |
|-----------|---------------|---------|
| v0.1.0 | - | MVP (基本的な機密情報管理、ダミー認証) |
| v0.2.0 | - | Passkey 認証、監査ログ、有効期限管理 |
| v0.3.0 | - | CLI 拡張 (出力フォーマット、確認ダイアログ、監査ログ検索) |
| v0.4.0 | - | PostgreSQL サポート、セキュリティ監査 |
| v1.0.0 | - | 正式リリース、本番環境対応 |

---

## 参考資料

- [要件定義: 開発フェーズ](./requirements/06-development-phases.md)
- [要件定義: 機能要件](./requirements/03-functional-requirements.md)
- [設計: 実装計画](./design/06-implementation.md)
