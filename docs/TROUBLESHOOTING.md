# トラブルシューティング

VaultKey の使用中に発生する可能性のある問題と解決方法をまとめました。

## 目次

- [インストール・セットアップの問題](#インストールセットアップの問題)
- [認証・トークンの問題](#認証トークンの問題)
- [機密情報の問題](#機密情報の問題)
- [データベースの問題](#データベースの問題)
- [マスターキーの問題](#マスターキーの問題)
- [パフォーマンスの問題](#パフォーマンスの問題)
- [デバッグ方法](#デバッグ方法)

## インストール・セットアップの問題

### Node.js のバージョンが古い

**エラーメッセージ**:
```
Error: VaultKey requires Node.js 24 or higher
```

**原因**: VaultKey は Node.js の組み込み SQLite モジュール (`node:sqlite`) を使用するため、Node.js 24 以上が必要です。

**解決方法**:
```bash
# Node.js のバージョンを確認
node --version

# Node.js 24 以上にアップグレード (nvm を使用)
nvm install 24
nvm use 24

# または nodenv を使用
nodenv install 24.0.0
nodenv global 24.0.0
```

### パッケージのインストールに失敗する

**エラーメッセージ**:
```
Error: Cannot find module '@mosmos_21/vault-key-core'
```

**解決方法**:
```bash
# 依存関係を再インストール
pnpm install

# または npm/yarn を使用している場合
npm install
# or
yarn install
```

### CLI コマンドが見つからない

**エラーメッセージ**:
```
vaultkey: command not found
```

**解決方法**:

グローバルインストールの場合:
```bash
npm install -g @mosmos_21/vault-key-cli
```

ローカルインストールの場合:
```bash
# npx を使用
npx vaultkey init

# または pnpm を使用
pnpm vaultkey init
```

開発環境の場合:
```bash
# ビルド
pnpm build

# CLI を直接実行
node packages/cli/dist/cli.mjs init
```

## 認証・トークンの問題

### トークンが見つからない

**エラーメッセージ**:
```
トークンが見つかりません。先にログインしてください
```

**原因**: `vaultkey user login` を実行していない、またはトークンファイルが削除された。

**解決方法**:
```bash
# ログインしてトークンを発行
vaultkey user login
```

または、トークンを直接指定:
```bash
vaultkey secret list --token "your-token-here"
```

### トークンの有効期限が切れている

**エラーメッセージ**:
```
Token has expired
```

**原因**: トークンの有効期限 (デフォルト: 30 日) が切れた。

**解決方法**:
```bash
# 再度ログインして新しいトークンを発行
vaultkey user login
```

トークンの有効期限を延長するには、環境変数を設定:
```bash
# 60 日に延長 (秒単位)
export VAULTKEY_TOKEN_TTL=5184000
vaultkey user login
```

### トークンが無効化されている

**エラーメッセージ**:
```
Token is invalid or has been revoked
```

**原因**: `vaultkey token revoke` でトークンが無効化された。

**解決方法**:
```bash
# 新しいトークンを発行
vaultkey user login
```

### トークン数の上限に達した

**エラーメッセージ**:
```
Token limit reached. Oldest token has been automatically revoked.
```

**説明**: 1 ユーザーあたりのトークン数が上限 (デフォルト: 5 個) に達したため、最も古いトークンが自動的に無効化されました。

**解決方法**:

特に対応は不要です。新しいトークンが正常に発行されます。上限を変更したい場合:
```bash
# 上限を 10 個に変更
export VAULTKEY_MAX_TOKENS_PER_USER=10
vaultkey user login
```

または、不要なトークンを手動で削除:
```bash
# トークン一覧を表示
vaultkey token list

# 不要なトークンを無効化
vaultkey token revoke <token>
```

## 機密情報の問題

### キーが見つからない

**エラーメッセージ**:
```
Secret not found: api_key
```

**原因**: 指定されたキーが存在しない、または別のユーザーが作成したキー。

**解決方法**:
```bash
# キー一覧を確認
vaultkey secret list

# キーが存在しない場合は新規作成
vaultkey secret set api_key
```

### キーが既に存在する

**エラーメッセージ**:
```
Secret already exists: api_key
```

**原因**: `vaultkey secret set` で既存のキーを上書きしようとした。

**解決方法**:
```bash
# 既存のキーを更新
vaultkey secret update api_key
```

または、既存のキーを削除してから新規作成:
```bash
vaultkey secret delete api_key
vaultkey secret set api_key
```

### 機密情報の有効期限が切れている

**エラーメッセージ**:
```
Secret has expired: api_key
```

**原因**: 機密情報の有効期限が切れている。

**解決方法**:
```bash
# 有効期限切れの機密情報を削除
vaultkey secret delete api_key

# 新しい値を保存
vaultkey secret set api_key
```

**注意**: 有効期限管理の CLI コマンドは v0.2.0 で実装予定です。

### 復号化に失敗する

**エラーメッセージ**:
```
Decryption failed: Invalid master key
```

**原因**: 暗号化時と異なるマスターキーを使用している。

**解決方法**:
```bash
# 正しいマスターキーを指定
vaultkey secret get api_key --master-key "correct-master-key-here"

# または正しいマスターキーファイルを指定
vaultkey secret get api_key --master-key-file ~/.vaultkey/correct-master.key
```

**重要**: マスターキーを失うと、暗号化された機密情報を復号化できなくなります。マスターキーは必ずバックアップを取ってください。

## データベースの問題

### データベースファイルが見つからない

**エラーメッセージ**:
```
Database file not found: ~/.vaultkey/vaultkey.db
```

**原因**: データベースが初期化されていない。

**解決方法**:
```bash
# データベースを初期化
vaultkey init
```

### データベースが破損している

**エラーメッセージ**:
```
Database is corrupted or invalid
```

**原因**: データベースファイルが破損している。

**解決方法**:

1. データベースファイルをバックアップ:
```bash
cp ~/.vaultkey/vaultkey.db ~/.vaultkey/vaultkey.db.backup
```

2. データベースを再初期化:
```bash
rm ~/.vaultkey/vaultkey.db
vaultkey init
```

**注意**: データベースを削除すると、すべてのユーザーと機密情報が失われます。可能であればバックアップから復元してください。

### データベースへの書き込み権限がない

**エラーメッセージ**:
```
Permission denied: ~/.vaultkey/vaultkey.db
```

**原因**: データベースファイルまたはディレクトリへの書き込み権限がない。

**解決方法**:
```bash
# ディレクトリとファイルのパーミッションを修正
chmod 700 ~/.vaultkey
chmod 600 ~/.vaultkey/vaultkey.db
```

### 複数のデータベースを使用したい

**問題**: プロジェクトごとに異なるデータベースを使用したい。

**解決方法**:

方法 1: 環境変数で指定
```bash
export VAULTKEY_DB_PATH="$PWD/.vaultkey/vault.db"
vaultkey init
vaultkey secret list
```

方法 2: CLI オプションで指定
```bash
vaultkey init --db-path ./project-vault.db
vaultkey secret list --db-path ./project-vault.db
```

## マスターキーの問題

### マスターキーを紛失した

**問題**: マスターキーファイルを紛失してしまった。

**結果**: 暗号化された機密情報を復号化できなくなります。

**対応方法**:
- マスターキーのバックアップがある場合は、それを使用
- バックアップがない場合は、データベースを削除して再初期化

**予防策**:
```bash
# マスターキーをバックアップ
cp ~/.vaultkey/master.key ~/backup/master.key

# または複数の安全な場所にコピー
cp ~/.vaultkey/master.key /path/to/secure/location/master.key
```

### マスターキーのフォーマットが不正

**エラーメッセージ**:
```
Invalid master key format: Must be 64 hex characters
```

**原因**: マスターキーが 64 文字の 16 進数文字列でない。

**解決方法**:
```bash
# 正しいフォーマットのマスターキーを生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成されたキーを使用
vaultkey secret list --master-key "0123456789abcdef..."
```

### マスターキーを変更したい

**問題**: セキュリティのためマスターキーを定期的に変更したい。

**解決方法**:

**注意**: 現在のバージョンでは、マスターキーの変更機能は実装されていません。マスターキーを変更する場合は、以下の手順で手動で再暗号化が必要です。

1. すべての機密情報をエクスポート (手動)
2. 新しいマスターキーを生成
3. 新しいデータベースを作成
4. すべての機密情報を再度インポート

将来のバージョンで、マスターキーのローテーション機能を実装予定です。

## パフォーマンスの問題

### コマンドの実行が遅い

**原因**: データベースファイルが大きくなっている、または多数のトークンが存在する。

**解決方法**:

1. 不要なトークンを削除:
```bash
vaultkey token list
vaultkey token revoke <old-token>
```

2. データベースを最適化:
```bash
# SQLite データベースを手動で最適化
sqlite3 ~/.vaultkey/vaultkey.db "VACUUM;"
```

3. ログレベルを下げる:
```bash
export VAULTKEY_LOG_LEVEL=ERROR
```

## デバッグ方法

### デバッグログを有効にする

詳細なログを出力して問題を診断:

```bash
# デバッグレベルのログを有効化
export VAULTKEY_LOG_LEVEL=DEBUG
vaultkey secret list
```

### 環境変数を確認する

現在の環境変数を確認:

```bash
# マスターキー (一部のみ表示)
echo ${VAULTKEY_MASTER_KEY:0:16}...

# データベースパス
echo $VAULTKEY_DB_PATH

# ログレベル
echo $VAULTKEY_LOG_LEVEL

# トークン TTL
echo $VAULTKEY_TOKEN_TTL

# 最大トークン数
echo $VAULTKEY_MAX_TOKENS_PER_USER
```

### データベースの内容を確認する

SQLite データベースを直接確認:

```bash
# SQLite CLI でデータベースを開く
sqlite3 ~/.vaultkey/vaultkey.db

# テーブル一覧を表示
.tables

# ユーザー一覧を表示
SELECT * FROM users;

# トークン一覧を表示
SELECT * FROM tokens;

# 機密情報の数を確認
SELECT userId, COUNT(*) FROM secrets GROUP BY userId;

# 終了
.quit
```

### マスターキーの確認

マスターキーが正しく読み込まれているか確認:

```bash
# デバッグログでマスターキーの読み込み元を確認
export VAULTKEY_LOG_LEVEL=DEBUG
vaultkey secret list 2>&1 | grep -i "master key"
```

### トークンファイルの確認

トークンファイルが存在するか確認:

```bash
# トークンファイルの存在確認
ls -la ~/.vaultkey/token

# トークンファイルの内容確認 (最初の 16 文字のみ)
head -c 16 ~/.vaultkey/token
echo "..."
```

### ビルドとテストの問題

開発環境でのトラブルシューティング:

```bash
# 依存関係を再インストール
rm -rf node_modules
pnpm install

# ビルド
pnpm build

# テスト実行
export VAULTKEY_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
pnpm test

# 特定のテストファイルのみ実行
pnpm test packages/core/__tests__/config.test.ts

# TypeScript の型チェック
pnpm check:tsc

# ESLint チェック
pnpm check:eslint

# すべてのチェックを実行
pnpm check
```

## よくある質問 (FAQ)

### Q: マスターキーはどこに保存されますか?

A: デフォルトでは `~/.vaultkey/master.key` に保存されます。環境変数や CLI オプションで別の場所を指定できます。詳細は [環境変数とマスターキー管理](./ENVIRONMENT.md) を参照してください。

### Q: トークンの有効期限はどのくらいですか?

A: デフォルトでは 30 日間です。環境変数 `VAULTKEY_TOKEN_TTL` で変更できます。

### Q: 複数のユーザーを登録できますか?

A: はい、複数のユーザーを登録できます。各ユーザーは自分が作成した機密情報のみにアクセスできます。

### Q: 別のマシンでも同じ機密情報を使用できますか?

A: はい、以下のファイルを別のマシンにコピーすることで同じ機密情報を使用できます:
- マスターキーファイル (`~/.vaultkey/master.key`)
- データベースファイル (`~/.vaultkey/vaultkey.db`)

### Q: バックアップはどのように取得しますか?

A: 以下のファイルをバックアップしてください:
```bash
# マスターキー (最重要)
cp ~/.vaultkey/master.key ~/backup/

# データベース
cp ~/.vaultkey/vaultkey.db ~/backup/

# トークン (オプション)
cp ~/.vaultkey/token ~/backup/
```

### Q: PostgreSQL に切り替えることはできますか?

A: 現在のバージョン (v0.1.2) では SQLite のみサポートしています。PostgreSQL サポートは v0.4.0 で実装予定です。

## サポート

問題が解決しない場合は、以下の方法でサポートを受けられます:

- **GitHub Issues**: https://github.com/mosmos21/vault-key/issues
- **CLI リファレンス**: [CLI_REFERENCE.md](./CLI_REFERENCE.md)
- **環境変数ガイド**: [ENVIRONMENT.md](./ENVIRONMENT.md)
- **その他のドキュメント**: [docs](.)

問題を報告する際は、以下の情報を含めてください:
- Node.js のバージョン (`node --version`)
- VaultKey のバージョン
- エラーメッセージ
- 再現手順
- デバッグログ (機密情報を除く)

## 関連ドキュメント

- [CLI リファレンス](./CLI_REFERENCE.md)
- [環境変数とマスターキー管理](./ENVIRONMENT.md)
- [開発ガイドライン](./design/07-development.md)
