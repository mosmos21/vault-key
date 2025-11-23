# @mosmos_21/vault-key-cli

VaultKey の CLI ツール。コマンドラインから機密情報を安全に管理できます。

## インストール

```bash
npm install -g @mosmos_21/vault-key-cli
```

## 使い方

### 1. データベースの初期化

```bash
vaultkey init
```

データベースファイルのデフォルトパスは `~/.vaultkey/vaultkey.db` です。

カスタムパスを指定する場合:

```bash
vaultkey init --db-path /path/to/db.db
```

### 2. ユーザー登録

```bash
vaultkey user register
```

ユーザー ID を入力してユーザーを登録します。

### 3. ログイン

```bash
vaultkey user login
```

ユーザー ID を入力してログインし、アクセストークンを取得します。トークンは `~/.vaultkey/token` に保存されます。

### 4. 機密情報の管理

#### 機密情報の保存

```bash
vaultkey secret set <key>
```

プロンプトに従って機密情報の値を入力します。値はマスク表示されます。

#### 機密情報の取得

```bash
vaultkey secret get <key>
```

指定したキーの機密情報を取得します。

#### 機密情報の更新

```bash
vaultkey secret update <key>
```

既存の機密情報を更新します。

#### 機密情報の削除

```bash
vaultkey secret delete <key>
```

指定したキーの機密情報を削除します。

#### 機密情報一覧の取得

```bash
vaultkey secret list
```

すべての機密情報のキーを一覧表示します。

パターンでフィルタする:

```bash
vaultkey secret list --pattern "api_*"
```

### 5. トークン管理

#### トークン一覧の取得

```bash
vaultkey token list
```

現在のユーザーのすべてのトークンを一覧表示します。

#### トークンの無効化

```bash
vaultkey token revoke <token>
```

指定したトークンを無効化します。

### 6. ログアウト

```bash
vaultkey user logout
```

トークンファイル (`~/.vaultkey/token`) を削除します。

## トークンの指定方法

トークンは以下の優先順位で取得されます:

1. `--token` オプション
2. トークンファイル (`~/.vaultkey/token`)
3. 環境変数 (`VAULTKEY_TOKEN`)

コマンドで直接指定する場合:

```bash
vaultkey secret get my-key --token <your-token>
```

環境変数で指定する場合:

```bash
export VAULTKEY_TOKEN=<your-token>
vaultkey secret get my-key
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|--------------|
| `VAULTKEY_TOKEN` | アクセストークン | - |
| `VAULTKEY_DB_PATH` | データベースファイルのパス | `~/.vaultkey/vaultkey.db` |
| `VAULTKEY_MASTER_KEY` | マスター暗号化キー | ランダム生成 |

## ライセンス

MIT
