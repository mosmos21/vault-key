# 環境変数とマスターキー管理

VaultKey の環境変数とマスターキーの管理方法について説明します。

## 目次

- [環境変数一覧](#環境変数一覧)
- [マスターキーの管理](#マスターキーの管理)
- [データベースパスの設定](#データベースパスの設定)
- [トークンの管理](#トークンの管理)
- [ログレベルの設定](#ログレベルの設定)
- [テスト実行時の環境設定](#テスト実行時の環境設定)

## 環境変数一覧

VaultKey で使用できる環境変数の一覧です。

> コマンドの使用方法については [CLI リファレンス](./CLI_REFERENCE.md) を参照してください。

| 環境変数 | 説明 | デフォルト値 | 必須 |
|---------|------|-------------|-----|
| `VAULTKEY_MASTER_KEY` | マスターキー (64 文字の 16 進数文字列) | 自動生成 | ❌ |
| `VAULTKEY_MASTER_KEY_FILE` | マスターキーファイルのパス | `~/.vaultkey/master.key` | ❌ |
| `VAULTKEY_DB_PATH` | データベースファイルのパス | `~/.vaultkey/vaultkey.db` | ❌ |
| `VAULTKEY_TOKEN` | アクセストークン | - | ❌ |
| `VAULTKEY_LOG_LEVEL` | ログレベル | `INFO` | ❌ |
| `VAULTKEY_TOKEN_TTL` | トークンの有効期限 (秒) | `2592000` (30 日) | ❌ |
| `VAULTKEY_MAX_TOKENS_PER_USER` | 1 ユーザーあたりの最大トークン数 | `5` | ❌ |
| `VAULTKEY_AUTH_PORT` | 認証サーバーのポート番号 (将来の WebAuthn 用) | `5432` | ❌ |

## マスターキーの管理

マスターキーは、機密情報を暗号化・復号化するための鍵です。64 文字の 16 進数文字列 (256 ビット) である必要があります。

### マスターキーの生成

マスターキーは以下の方法で生成できます:

```bash
# Node.js を使用して生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL を使用して生成
openssl rand -hex 32
```

**生成例**:
```
0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### マスターキーの読み込み優先順位

マスターキーは以下の優先順位で読み込まれます:

1. **CLI オプション `--master-key`** (直接指定)
   ```bash
   vaultkey secret list --master-key "0123456789abcdef..."
   ```

2. **CLI オプション `--master-key-file`** (ファイル指定)
   ```bash
   vaultkey secret list --master-key-file ./my-master.key
   ```

3. **環境変数 `VAULTKEY_MASTER_KEY_FILE`** (ファイル指定)
   ```bash
   export VAULTKEY_MASTER_KEY_FILE="./my-master.key"
   vaultkey secret list
   ```

4. **デフォルトファイル** `~/.vaultkey/master.key`
   - マスターキーが指定されていない場合、このファイルから自動的に読み込まれます

5. **環境変数 `VAULTKEY_MASTER_KEY`** (直接指定)
   ```bash
   export VAULTKEY_MASTER_KEY="0123456789abcdef..."
   vaultkey secret list
   ```

6. **自動生成**
   - マスターキーが見つからない場合、自動的に生成されてデフォルトファイルに保存されます

### マスターキーの保存方法

#### 方法 1: デフォルトファイルを使用 (推奨)

初回実行時に自動生成されたマスターキーがデフォルトファイルに保存されます:

```bash
# 初回実行時に自動生成
vaultkey init
# マスターキーが ~/.vaultkey/master.key に保存されました

# 以降は自動的に読み込まれる
vaultkey secret list
```

#### 方法 2: 環境変数で設定

`.bashrc` や `.zshrc` に追加:

```bash
# ~/.bashrc または ~/.zshrc に追加
export VAULTKEY_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

#### 方法 3: カスタムファイルを使用

マスターキーを別のファイルに保存し、ファイルパスを指定:

```bash
# マスターキーをファイルに保存
echo "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" > ~/.vaultkey/production.key
chmod 600 ~/.vaultkey/production.key

# ファイルパスを指定して使用
vaultkey secret list --master-key-file ~/.vaultkey/production.key
```

#### 方法 4: .env ファイルを使用 (開発環境)

プロジェクトルートに `.env` ファイルを作成:

```bash
# .env ファイル
VAULTKEY_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
VAULTKEY_DB_PATH=./dev.db
VAULTKEY_LOG_LEVEL=DEBUG
```

**注意**: `.env` ファイルは `.gitignore` に追加してください。

### マスターキーのセキュリティベストプラクティス

1. **マスターキーを Git にコミットしない**
   - `.gitignore` に `master.key` と `.env` を追加
   - マスターキーファイルのパーミッションを `600` に設定 (`chmod 600 ~/.vaultkey/master.key`)

2. **本番環境では環境変数を使用**
   - ファイルシステムにマスターキーを保存しない
   - 環境変数で直接指定するか、シークレット管理サービスを使用

3. **マスターキーのバックアップ**
   - マスターキーを失うと、暗号化された機密情報を復号化できなくなります
   - 安全な場所にバックアップを保存してください

4. **マスターキーの定期的なローテーション**
   - セキュリティを強化するため、定期的にマスターキーを変更することを推奨します
   - マスターキーを変更する場合は、既存の機密情報を新しいキーで再暗号化する必要があります

## データベースパスの設定

データベースファイルのパスを変更できます。

### デフォルトパス

```
~/.vaultkey/vaultkey.db
```

### カスタムパスの指定

#### 方法 1: CLI オプション

```bash
vaultkey init --db-path ./my-vault.db
vaultkey secret list --db-path ./my-vault.db
```

#### 方法 2: 環境変数

```bash
export VAULTKEY_DB_PATH="./my-vault.db"
vaultkey secret list
```

#### 方法 3: .env ファイル

```bash
# .env ファイル
VAULTKEY_DB_PATH=./my-vault.db
```

### 複数のデータベースを使用

プロジェクトごとに異なるデータベースを使用できます:

```bash
# プロジェクト A
cd ~/projects/project-a
export VAULTKEY_DB_PATH="$PWD/.vaultkey/vault.db"
vaultkey secret list

# プロジェクト B
cd ~/projects/project-b
export VAULTKEY_DB_PATH="$PWD/.vaultkey/vault.db"
vaultkey secret list
```

## トークンの管理

### トークンの保存場所

`vaultkey user login` で発行されたトークンは、デフォルトで以下の場所に保存されます:

```
~/.vaultkey/token
```

### トークンの読み込み優先順位

1. **CLI オプション `--token`**
   ```bash
   vaultkey secret list --token "abc123..."
   ```

2. **トークンファイル** `~/.vaultkey/token`
   - `vaultkey user login` で自動的に保存されます
   - 以降のコマンドで自動的に読み込まれます

3. **環境変数 `VAULTKEY_TOKEN`**
   ```bash
   export VAULTKEY_TOKEN="abc123..."
   vaultkey secret list
   ```

### トークンの手動設定

トークンファイルを手動で編集することもできます:

```bash
echo "your-token-here" > ~/.vaultkey/token
chmod 600 ~/.vaultkey/token
```

### トークンの削除

```bash
# ログアウト (トークンファイルを削除)
vaultkey user logout

# または手動で削除
rm ~/.vaultkey/token
```

**注意**: トークンファイルを削除しても、トークン自体はデータベースに残ります。トークンを完全に無効化するには `vaultkey token revoke <token>` を使用してください。

## ログレベルの設定

ログレベルを設定して、出力される情報の詳細度を制御できます。

### ログレベル一覧

| レベル | 説明 | 用途 |
|--------|------|------|
| `DEBUG` | デバッグ情報 | 開発時のトラブルシューティング |
| `INFO` | 正常系の処理 | 通常の運用 (デフォルト) |
| `WARNING` | 軽微な問題 | 注意が必要な状況 |
| `ERROR` | エラー | エラーが発生した場合 |
| `CRITICAL` | システム障害 | 深刻な問題 |

### ログレベルの設定方法

#### 環境変数

```bash
export VAULTKEY_LOG_LEVEL=DEBUG
vaultkey secret list
```

#### .env ファイル

```bash
# .env ファイル
VAULTKEY_LOG_LEVEL=DEBUG
```

### ログ出力の例

```bash
# DEBUG レベル
export VAULTKEY_LOG_LEVEL=DEBUG
vaultkey secret list
# [DEBUG] Loading master key from ~/.vaultkey/master.key
# [DEBUG] Connecting to database: ~/.vaultkey/vaultkey.db
# [DEBUG] Verifying token...
# [INFO] Token verified successfully
# [DEBUG] Listing secrets for user: alice
# api_key
# db_password

# ERROR レベル (エラーのみ表示)
export VAULTKEY_LOG_LEVEL=ERROR
vaultkey secret list
# api_key
# db_password
```

## テスト実行時の環境設定

テストを実行する際の環境変数の設定方法です。

### テスト用のマスターキーを設定

テスト実行時は、固定のマスターキーを使用することを推奨します:

```bash
# テスト用マスターキーを環境変数で設定
export VAULTKEY_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# テスト実行
pnpm test
```

### テスト実行のベストプラクティス

テストは実際のホームディレクトリに影響を与えないように設定されています:

```bash
# テスト実行 (自動的にテスト用の一時ディレクトリを使用)
pnpm test

# カバレッジ付きでテスト実行
pnpm test:coverage

# 特定のテストファイルのみ実行
pnpm test packages/core/__tests__/config.test.ts
```

### CI/CD 環境での設定

GitHub Actions などの CI/CD 環境では、シークレットとして環境変数を設定します:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - run: pnpm install
      - run: pnpm test
        env:
          VAULTKEY_MASTER_KEY: ${{ secrets.VAULTKEY_MASTER_KEY }}
```

## .env.example ファイル

プロジェクトルートに `.env.example` ファイルを作成して、環境変数のテンプレートを提供できます:

```bash
# .env.example

# マスターキー (64 文字の 16 進数文字列)
# 生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
VAULTKEY_MASTER_KEY=your-master-key-here

# データベースファイルのパス (デフォルト: ~/.vaultkey/vaultkey.db)
VAULTKEY_DB_PATH=~/.vaultkey/vaultkey.db

# ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
VAULTKEY_LOG_LEVEL=INFO

# トークンの有効期限 (秒単位、デフォルト: 2592000 = 30 日)
VAULTKEY_TOKEN_TTL=2592000

# 1 ユーザーあたりの最大トークン数 (デフォルト: 5)
VAULTKEY_MAX_TOKENS_PER_USER=5

# 認証サーバーのポート番号 (将来の WebAuthn 用、デフォルト: 5432)
VAULTKEY_AUTH_PORT=5432
```

使用方法:

```bash
# テンプレートをコピー
cp .env.example .env

# .env を編集してマスターキーなどを設定
vim .env

# .env を .gitignore に追加 (既に追加済み)
echo ".env" >> .gitignore
```

## 関連ドキュメント

- [CLI リファレンス](./CLI_REFERENCE.md) - コマンドの使用方法
- [トラブルシューティング](./TROUBLESHOOTING.md) - よくある問題と解決方法
- [API 設計](./design/05-api.md) - ライブラリ API と CLI 設計
- [開発ガイドライン](./design/07-development.md) - 開発者向けガイド
