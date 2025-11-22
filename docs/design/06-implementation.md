# 6. 実装技術スタック

## 6.1 言語・ランタイム

- **TypeScript 5+**
- **Node.js 18+**

## 6.2 主要ライブラリ

### 6.2.1 依存関係

```json
{
  "dependencies": {
    "@simplewebauthn/server": "^9.0.0",
    "@simplewebauthn/types": "^9.0.0",
    "better-sqlite3": "^9.0.0",
    "pg": "^8.11.0",
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "dotenv": "^16.3.0",
    "zod": "^3.22.0",
    "prompts": "^2.4.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/pg": "^8.10.0",
    "@types/node": "^20.0.0",
    "@types/prompts": "^2.4.9",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "prettier": "^3.1.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.18.0",
    "@typescript-eslint/eslint-plugin": "^6.18.0"
  }
}
```

### 6.2.2 主要ライブラリの説明

#### @simplewebauthn/server
- **用途**: WebAuthn (Passkey) 認証の実装
- **機能**: 登録・認証フローの生成と検証

#### better-sqlite3
- **用途**: SQLite データベースクライアント
- **機能**: 同期 API、高速、型安全

#### pg
- **用途**: PostgreSQL データベースクライアント (Phase 4)
- **機能**: 非同期 API、トランザクション、コネクションプール

#### commander
- **用途**: CLI フレームワーク
- **機能**: コマンド定義、オプション解析、ヘルプ生成

#### chalk
- **用途**: CLI の色付け出力
- **機能**: テキストの装飾、エラーメッセージの強調

#### dotenv
- **用途**: 環境変数の読み込み
- **機能**: `.env` ファイルから環境変数を読み込み

#### zod
- **用途**: バリデーション
- **機能**: TypeScript ファーストのスキーマ検証

#### prompts
- **用途**: 対話的入力 (Phase 3)
- **機能**: パスワード入力、確認ダイアログ

## 6.3 データベース

### 6.3.1 開発環境: SQLite (better-sqlite3)

**特徴**:
- ファイルベースのデータベース
- 同期 API
- 軽量、高速
- トランザクション対応

### 6.3.2 本番環境: PostgreSQL (pg)

**特徴**:
- サーバーベースのデータベース
- 非同期 API
- スケーラブル
- トランザクション、コネクションプール対応

## 6.4 パッケージ設定

### 6.4.1 package.json

```json
{
  "name": "vaultkey",
  "version": "0.1.0",
  "description": "Secure secret management library with Passkey authentication",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "vaultkey": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx watch src/cli.ts",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.ts\"",
    "lint": "eslint src --ext .ts",
    "prepublishOnly": "npm run build"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "secrets",
    "vault",
    "passkey",
    "webauthn",
    "security",
    "cli"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/username/vaultkey.git"
  },
  "license": "MIT"
}
```

### 6.4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 6.4.3 tsup.config.ts

**主要設定**:
- エントリポイント: `src/index.ts`, `src/cli.ts`
- フォーマット: ESM
- 型定義ファイル (`.d.ts`) 生成
- ソースマップ生成
- Tree shaking 有効化

### 6.4.4 vitest.config.ts

**主要設定**:
- テスト環境: Node.js
- グローバル変数の有効化
- カバレッジプロバイダー: v8
- カバレッジレポート形式: text, json, html
- 除外ディレクトリ: node_modules, dist, tests

### 6.4.5 .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ]
  }
}
```

### 6.4.6 .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## 6.5 ビルド設定

### 6.5.1 ビルドコマンド

```bash
# 開発ビルド (watch モード)
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npm run typecheck
```

### 6.5.2 ビルド出力

```
dist/
├── index.js           # ライブラリエントリポイント
├── index.d.ts         # 型定義
├── cli.js             # CLI エントリポイント
├── cli.d.ts           # 型定義
├── index.js.map       # ソースマップ
└── cli.js.map         # ソースマップ
```

## 6.6 環境変数

### 6.6.1 必須環境変数

```bash
# 暗号化マスターキー (32 バイトの hex 文字列)
VAULTKEY_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 6.6.2 オプション環境変数

```bash
# データベース接続先 (デフォルト: sqlite://vaultkey.db)
DATABASE_URL=sqlite://vaultkey.db
# または PostgreSQL
# DATABASE_URL=postgresql://user:pass@host/db

# ログレベル (デフォルト: INFO)
LOG_LEVEL=INFO

# Node.js 環境 (デフォルト: development)
NODE_ENV=development

# トークン有効期限 (秒単位、デフォルト: 3600)
TOKEN_EXPIRATION=3600

# トークン数制限 (デフォルト: 5)
MAX_TOKENS_PER_USER=5
```

### 6.6.3 .env.example

```bash
# VaultKey 環境変数設定例

# 暗号化マスターキー (32 バイトの hex 文字列)
# 生成方法: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
VAULTKEY_MASTER_KEY=your-master-key-here

# データベース接続先
DATABASE_URL=sqlite://vaultkey.db

# ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Node.js 環境
NODE_ENV=development

# トークン有効期限 (秒単位)
TOKEN_EXPIRATION=3600

# トークン数制限
MAX_TOKENS_PER_USER=5
```

## 6.7 配布方法

### 6.7.1 npm での公開 (Phase 4)

```bash
# npm へのログイン
npm login

# バージョンの更新
npm version patch  # または minor, major

# ビルド
npm run build

# npm への公開
npm publish

# 公開済みパッケージの確認
npm view vaultkey
```

### 6.7.2 インストール方法

```bash
# npm からインストール
npm install -g vaultkey

# または yarn
yarn global add vaultkey

# または pnpm
pnpm add -g vaultkey
```

### 6.7.3 開発版のインストール

```bash
# リポジトリをクローン
git clone https://github.com/username/vaultkey.git
cd vaultkey

# 依存関係をインストール
npm install

# ビルド
npm run build

# グローバルにリンク
npm link

# CLI を使用
vaultkey --help
```

## 6.8 CI/CD 設定 (Phase 4)

### 6.8.1 GitHub Actions ワークフロー

**実行トリガー**:
- main ブランチへの push
- Pull Request

**実行内容**:
- 依存関係のインストール
- 型チェック (`npm run typecheck`)
- Lint チェック (`npm run lint`)
- テスト実行とカバレッジ計測 (`npm run test:coverage`)
- カバレッジレポートのアップロード (Codecov)

## 6.9 ドキュメント生成 (Phase 4)

### 6.9.1 TypeDoc による API ドキュメント生成

TypeDoc を使用して API ドキュメントを自動生成:
- ソース: `src/index.ts`
- 出力先: `docs/api/`

### 6.9.2 README.md

以下の内容を含む:
- プロジェクト概要
- 主要機能 (Passkey 認証、AES-256-GCM 暗号化など)
- インストール方法
- CLI の使用例
- ライブラリ API の使用例
- ライセンス情報
