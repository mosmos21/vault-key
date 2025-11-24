# VaultKey CLI リファレンス

VaultKey CLI (`vaultkey`) のコマンドリファレンスです。

## 目次

- [グローバルオプション](#グローバルオプション)
- [データベース初期化](#データベース初期化)
- [ユーザー管理](#ユーザー管理)
- [機密情報管理](#機密情報管理)
- [トークン管理](#トークン管理)
- [環境変数](#環境変数)

## グローバルオプション

すべてのコマンドで使用可能なオプション:

| オプション | 説明 | デフォルト値 |
|-----------|------|-------------|
| `--db-path <path>` | データベースファイルのパス | `~/.vaultkey/vaultkey.db` |
| `--master-key <key>` | マスターキー (64 文字の 16 進数文字列) | 環境変数または `~/.vaultkey/master.key` から読み込み |
| `--master-key-file <path>` | マスターキーファイルのパス | `~/.vaultkey/master.key` |

## データベース初期化

### `vaultkey init`

VaultKey のデータベースを初期化します。

**使用例**:

```bash
# デフォルトパス (~/.vaultkey/vaultkey.db) にデータベースを作成
vaultkey init

# カスタムパスにデータベースを作成
vaultkey init --db-path ./custom.db
```

**注意事項**:
- 初回実行時にマスターキーが存在しない場合、自動的に生成されて `~/.vaultkey/master.key` に保存されます
- データベースファイルが既に存在する場合は、既存のデータベースをそのまま使用します

## ユーザー管理

### `vaultkey user register`

新しいユーザーを登録します。

**使用例**:

```bash
vaultkey user register
# ユーザー ID を入力してください: alice
# ユーザー "alice" を登録しました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- 現在は Passkey 認証の代わりにダミー認証を使用しています
- ユーザー ID は対話的プロンプトで入力します

### `vaultkey user login`

ユーザー認証を行い、アクセストークンを発行します。

**使用例**:

```bash
vaultkey user login
# ユーザー ID を入力してください: alice
# ログインしました
# トークン: abc123...
# トークンは ~/.vaultkey/token に保存されました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**動作**:
- 認証成功後、トークンが `~/.vaultkey/token` に自動保存されます
- 以降の `secret` コマンドや `token` コマンドでこのトークンが自動的に使用されます

### `vaultkey user logout`

ログアウトしてトークンファイルを削除します。

**使用例**:

```bash
vaultkey user logout
# ログアウトしました
```

**注意事項**:
- `~/.vaultkey/token` ファイルを削除します
- トークン自体はデータベースに残ります (無効化されません)
- トークンを完全に無効化するには `vaultkey token revoke <token>` を使用してください

## 機密情報管理

### `vaultkey secret get <key>`

機密情報を取得します。

**使用例**:

```bash
# 機密情報を取得
vaultkey secret get api_key
# sk-1234567890abcdef

# 異なるトークンを使用
vaultkey secret get api_key --token xyz789...
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン (省略時は `~/.vaultkey/token` から読み込み)
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**エラー**:
- トークンが見つからない場合: 先に `vaultkey user login` を実行してください
- キーが存在しない場合: 指定されたキーは見つかりません
- トークンが無効な場合: トークンの有効期限が切れているか、無効化されています

### `vaultkey secret set <key>`

機密情報を保存します。

**使用例**:

```bash
vaultkey secret set api_key
# 機密情報の値を入力してください: ******** (マスク表示)
# 機密情報 "api_key" を保存しました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- 値は対話的プロンプトで入力します (マスク表示)
- 同じキーが既に存在する場合はエラーになります (更新する場合は `update` を使用)

### `vaultkey secret update <key>`

既存の機密情報を更新します。

**使用例**:

```bash
vaultkey secret update api_key
# 新しい機密情報の値を入力してください: ********
# 機密情報 "api_key" を更新しました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- キーが存在しない場合はエラーになります (新規作成する場合は `set` を使用)

### `vaultkey secret delete <key>`

機密情報を削除します。

**使用例**:

```bash
vaultkey secret delete api_key
# 機密情報 "api_key" を削除しました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- 削除は即座に実行されます (確認ダイアログはありません)
- 削除されたデータは復元できません

### `vaultkey secret list`

機密情報のキー一覧を取得します。

**使用例**:

```bash
# すべてのキーを表示
vaultkey secret list
# api_key
# db_password
# github_token

# パターンマッチでフィルタリング
vaultkey secret list --pattern "api*"
# api_key
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン
- `--pattern <pattern>`: キー名のフィルターパターン (ワイルドカード `*` 使用可能)
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- 値は表示されません (キー名のみ)
- 自分が作成した機密情報のみが表示されます

## トークン管理

### `vaultkey token revoke <token>`

トークンを無効化します。

**使用例**:

```bash
vaultkey token revoke abc123...
# トークンを無効化しました
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- 無効化されたトークンは二度と使用できません
- `~/.vaultkey/token` ファイルは削除されません (手動で削除するか `vaultkey user logout` を使用)

### `vaultkey token list`

自分のトークン一覧を取得します。

**使用例**:

```bash
vaultkey token list
# Hash: a1b2c3d4e5f6g7h8
# Created: 2025-01-22 10:00:00
# Expires: 2025-02-21 10:00:00
# Last Used: 2025-01-22 10:30:00
#
# Hash: i9j0k1l2m3n4o5p6
# Created: 2025-01-21 09:00:00
# Expires: 2025-02-20 09:00:00
# Last Used: 2025-01-21 09:15:00
```

**オプション**:
- `--db-path <path>`: データベースファイルのパス
- `--token <token>`: アクセストークン
- `--master-key <key>`: マスターキー
- `--master-key-file <path>`: マスターキーファイルのパス

**注意事項**:
- トークンの最初の 16 文字のハッシュが表示されます (完全なトークンは表示されません)
- 自分のトークンのみが表示されます

## 環境変数

CLI コマンドで使用できる環境変数:

| 環境変数 | 説明 | デフォルト値 |
|---------|------|-------------|
| `VAULTKEY_MASTER_KEY` | マスターキー (64 文字の 16 進数文字列) | - |
| `VAULTKEY_MASTER_KEY_FILE` | マスターキーファイルのパス | `~/.vaultkey/master.key` |
| `VAULTKEY_DB_PATH` | データベースファイルのパス | `~/.vaultkey/vaultkey.db` |
| `VAULTKEY_TOKEN` | アクセストークン | - |
| `VAULTKEY_LOG_LEVEL` | ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL) | `INFO` |
| `VAULTKEY_TOKEN_TTL` | トークンの有効期限 (秒) | `2592000` (30 日) |
| `VAULTKEY_MAX_TOKENS_PER_USER` | 1 ユーザーあたりの最大トークン数 | `5` |

### マスターキーの管理

マスターキーの生成、保存、読み込みの詳細については [環境変数とマスターキー管理](./ENVIRONMENT.md#マスターキーの管理) を参照してください。

### トークンの優先順位

アクセストークンは以下の優先順位で読み込まれます:

1. `--token` オプション
2. トークンファイル `~/.vaultkey/token` (login 時に自動保存)
3. 環境変数 `VAULTKEY_TOKEN`

**使用例**:

```bash
# オプションでトークンを指定
vaultkey secret list --token "abc123..."

# 環境変数でトークンを指定
export VAULTKEY_TOKEN="abc123..."
vaultkey secret list

# トークンファイルから自動読み込み (login 時に保存)
vaultkey user login
vaultkey secret list
```

詳細な環境設定については [環境変数とマスターキー管理](./ENVIRONMENT.md) を参照してください。

## 未実装の機能

以下の機能は設計書に記載されていますが、現在のバージョン (v0.1.2) では未実装です:

### 有効期限管理 (v0.2.0 で実装予定)

```bash
# 有効期限切れ間近の機密情報一覧 (未実装)
vaultkey secret list-expiring [--days <days>]

# 有効期限切れの機密情報一覧 (未実装)
vaultkey secret list-expired

# 有効期限切れの機密情報削除 (未実装)
vaultkey secret cleanup-expired [--force]

# 有効期限を指定した保存 (未実装)
vaultkey secret set <key> --expires-in 30d
```

### Passkey 認証 (v0.2.0 で実装予定)

現在はダミー認証を使用しています。WebAuthn Passkey による認証は将来のバージョンで実装予定です。

### 監査ログ検索 (v0.3.0 で実装予定)

```bash
# 監査ログ検索 (未実装)
vaultkey audit search [--user <user>] [--from <date>] [--to <date>]
```

### 出力フォーマット選択 (v0.3.0 で実装予定)

```bash
# JSON 形式での出力 (未実装)
vaultkey secret get <key> --format json

# YAML 形式での出力 (未実装)
vaultkey secret get <key> --format yaml
```

## 関連ドキュメント

- [環境変数とマスターキー管理](./ENVIRONMENT.md)
- [トラブルシューティング](./TROUBLESHOOTING.md)
- [API 設計](./design/05-api.md)
- [開発ロードマップ](./ROADMAP.md)
