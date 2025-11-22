# 6. 実装技術スタック

## 6.1 言語・ランタイム

- **TypeScript 5+**
- **Node.js 24+**

## 6.2 主要ライブラリ

### 6.2.1 本番依存ライブラリ (dependencies)

- **@simplewebauthn/server**: WebAuthn (Passkey) 認証の実装 (登録・認証フローの生成と検証)
- **node:sqlite**: Node.js 組み込み SQLite データベースモジュール (同期 API、軽量、追加パッケージ不要)
- **pg**: PostgreSQL データベースクライアント (非同期 API、トランザクション、コネクションプール)
- **commander**: CLI フレームワーク (コマンド定義、オプション解析、ヘルプ生成)
- **chalk**: CLI の色付け出力 (テキストの装飾、エラーメッセージの強調)
- **dotenv**: 環境変数の読み込み (`.env` ファイルから環境変数を読み込み)
- **zod**: バリデーション (TypeScript ファーストのスキーマ検証)
- **prompts**: 対話的入力 (パスワード入力、確認ダイアログ) ※Phase 3

### 6.2.2 開発依存ライブラリ (devDependencies)

- **vitest**: テストフレームワーク
- **tsx**: TypeScript 実行環境 (開発用)
- **tsup**: ビルドツール (型定義ファイル生成、Tree shaking)

## 6.3 データベース

### 6.3.1 開発環境: SQLite (node:sqlite)

**特徴**:
- ファイルベースのデータベース
- Node.js 組み込みモジュール (追加パッケージ不要)
- 同期 API
- 軽量、高速
- トランザクション対応

### 6.3.2 本番環境: PostgreSQL (pg)

**特徴**:
- サーバーベースのデータベース
- 非同期 API
- スケーラブル
- トランザクション、コネクションプール対応

## 6.4 パッケージ構成

### 6.4.1 モノレポ構成

```
packages/
├── core/                    # @mosmos_21/vault-key-core (ライブラリ)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── cli/                     # @mosmos_21/vault-key-cli (CLI)
    ├── src/
    ├── package.json
    └── tsconfig.json
```

### 6.4.2 core パッケージ (主要項目)

- **name**: `@mosmos_21/vault-key-core`
- **version**: `0.1.0`
- **type**: `module` (ESM を使用)
- **main**: `./dist/index.js` (ライブラリエントリポイント)
- **types**: `./dist/index.d.ts` (型定義ファイル)
- **engines**: `{ "node": ">=18.0.0" }` (Node.js 18 以上)
- **files**: `["dist", "README.md", "LICENSE"]` (npm 公開時に含めるファイル)
- **dependencies**: WebAuthn、DB、暗号化関連ライブラリ

### 6.4.3 cli パッケージ (主要項目)

- **name**: `@mosmos_21/vault-key-cli`
- **version**: `0.1.0`
- **type**: `module` (ESM を使用)
- **bin**: `{ "vaultkey": "./dist/cli.js" }` (CLI コマンド)
- **engines**: `{ "node": ">=18.0.0" }` (Node.js 18 以上)
- **files**: `["dist", "README.md", "LICENSE"]` (npm 公開時に含めるファイル)
- **dependencies**: `@mosmos_21/vault-key-core`、commander、chalk など CLI 関連ライブラリ

## 6.5 環境変数

| 変数名 | 必須 | デフォルト値 | 説明 |
|--------|------|-------------|------|
| `VAULTKEY_MASTER_KEY` | ✓ | - | 暗号化マスターキー (32 バイトの hex 文字列) |
| `VAULTKEY_DATABASE_URL` | | `sqlite://vaultkey.db` | データベース接続先 (SQLite: `sqlite://vaultkey.db`、PostgreSQL: `postgresql://user:pass@host/db`) |
| `VAULTKEY_AUTH_PORT` | | `5432` | 認証サーバーのポート番号 |
| `VAULTKEY_TOKEN` | | - | アクセストークン (CLI で使用) |
| `VAULTKEY_LOG_LEVEL` | | `INFO` | ログレベル (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) |
| `VAULTKEY_TOKEN_EXPIRATION` | | `3600` | トークン有効期限 (秒単位) |
| `VAULTKEY_MAX_TOKENS_PER_USER` | | `5` | ユーザーあたりの最大トークン数 |

### 6.5.1 .env.example

```bash
# VaultKey 環境変数設定例

# 暗号化マスターキー (32 バイトの hex 文字列) ※必須
# 生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
VAULTKEY_MASTER_KEY=your-master-key-here

# データベース接続先 (デフォルト: sqlite://vaultkey.db)
VAULTKEY_DATABASE_URL=sqlite://vaultkey.db

# 認証サーバーのポート番号 (デフォルト: 5432)
VAULTKEY_AUTH_PORT=5432

# アクセストークン (CLI で使用)
# VAULTKEY_TOKEN=abc123...

# ログレベル (デフォルト: INFO)
VAULTKEY_LOG_LEVEL=INFO

# トークン有効期限 (秒単位、デフォルト: 3600)
VAULTKEY_TOKEN_EXPIRATION=3600

# ユーザーあたりの最大トークン数 (デフォルト: 5)
VAULTKEY_MAX_TOKENS_PER_USER=5
```
