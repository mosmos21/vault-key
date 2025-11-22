# VaultKey

VaultKey は、機密情報を安全に管理するための TypeScript ライブラリおよび CLI ツールです。

## 概要

VaultKey は以下の機能を提供します:

- **機密情報の安全な保存**: API キー、パスワード、トークンなどの機密情報を暗号化して保存
- **WebAuthn Passkey 認証**: パスワードレスで安全なユーザー認証
- **ライブラリとCLIの両方を提供**: プログラムから利用できるライブラリと、コマンドラインから操作できる CLI
- **ユーザーごとの完全な分離**: 各ユーザーは自分が作成した機密情報のみにアクセス可能
- **監査ログ**: すべての機密情報へのアクセスを記録

## インストール

### CLI ツール

```bash
npm install -g @mosmos_21/vault-key-cli
```

### ライブラリ

```bash
npm install @mosmos_21/vault-key-core
```

## クイックスタート

### データベースの初期化

```bash
vaultkey init
```

### ユーザー登録

```bash
vaultkey user register <user_id>
```

### ログイン

```bash
vaultkey user login
```

### 機密情報の保存

```bash
vaultkey secret set api_key
Enter value: ********  # 対話的に入力
```

### 機密情報の取得

```bash
vaultkey secret get api_key
```

### 機密情報の一覧表示

```bash
vaultkey secret list
```

## ライブラリとしての利用

```typescript
import { VaultKeyClient } from '@mosmos_21/vault-key-core';

const client = new VaultKeyClient();

// 機密情報の保存
await client.storeSecret('api_key', 'secret-value', token);

// 機密情報の取得
const secret = await client.getSecret('api_key', token);

// 機密情報の削除
await client.deleteSecret('api_key', token);
```

## 技術スタック

VaultKey は以下の技術を使用しています:

- **TypeScript 5+** / **Node.js 24+**
- **node:sqlite**: Node.js 組み込みの SQLite データベースモジュール
  - 追加パッケージ不要 (ネイティブモジュールのビルドが不要)
  - 同期 API でシンプルな実装
  - 軽量で高速
- **AES-256-GCM**: 機密情報の暗号化
- **WebAuthn**: Passkey による認証
- **PostgreSQL**: 本番環境での使用をサポート (オプション)

## 主な機能

### 機密情報管理

- 機密情報の保存・取得・更新・削除
- 有効期限の設定
- 有効期限切れ間近・有効期限切れの機密情報の一覧表示
- 有効期限切れの機密情報の自動削除

### ユーザー認証

- WebAuthn Passkey による認証
- ブラウザ自動起動方式 (デフォルト)
- 手動コピー方式 (WSL などの環境向け)

### トークン管理

- 時間制限付きアクセストークンの発行
- トークンの無効化
- トークン数制限 (デフォルト: 5個/ユーザー)

### 監査ログ

- すべての機密情報へのアクセスを記録
- 誰が、いつ、何を、どのリソースに対して実行したかを追跡

## ドキュメント

詳細なドキュメントは [docs](./docs) ディレクトリを参照してください:

- [要件定義](./docs/requirements/README.md)
- [設計書](./docs/design/README.md)

## 開発

### 環境構築

```bash
npm install
```

### コード品質チェック

```bash
# すべてのチェックを実行 (ESLint, Prettier, TypeScript)
npm run check

# 個別のチェック
npm run check:eslint    # ESLint チェック
npm run check:prettier  # Prettier フォーマットチェック
npm run check:tsc       # TypeScript コンパイルチェック

# 自動修正
npm run fix             # すべての自動修正を実行
npm run fix:eslint      # ESLint の自動修正
npm run fix:prettier    # Prettier の自動フォーマット
```

### テスト実行

```bash
# watch モード
npm test

# 一度だけ実行
npm run test:run

# カバレッジ付きで実行
npm run test:coverage

# UI モード
npm run test:ui
```

### ビルド

```bash
npm run build
```

## ライセンス

MIT
