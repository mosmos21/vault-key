# 7. 開発ガイドライン

## 7.1 コーディング規約

### 7.1.1 命名規則

| 種類 | 規則 | 例 |
|------|------|-----|
| クラス・型 | PascalCase | `SecretsManager`, `VaultKeyClient`, `Secret` |
| 関数・変数 | camelCase | `getSecret`, `userId`, `tokenHash` |
| 定数 | UPPER_SNAKE_CASE | `MAX_TOKEN_AGE`, `DEFAULT_EXPIRATION` |
| ファイル名 | lowerCamelCase | `secretRepository.ts`, `tokenManager.ts` |
| プライベート | アンダースコア接頭辞 | `_validateToken`, `_decryptValue` |

### 7.1.2 エラーハンドリング

**基本方針**:
- すべてのエラーを適切にキャッチして処理
- カスタムエラークラス (`VaultKeyError` など) を使用
- エラーの再スローは適切に判断 (カスタムエラーはそのまま、それ以外はラップ)
- エラーメッセージに機密情報を含めない

## 7.2 テスト戦略

### 7.2.1 ユニットテスト

**目標**: すべてのビジネスロジックをカバー (カバレッジ 100%)

**テスト対象**:
- 各サービスクラスのメソッド
- 暗号化・復号化処理
- トークン管理
- バリデーション処理

**テストケース例**:
- 正常系: 機密情報の保存と取得
- 異常系: キーが存在しない場合の `NotFoundError`
- 異常系: 有効期限切れの場合の `ExpiredError`

### 7.2.2 統合テスト

**目標**: データベースを含む E2E テスト

**使用するデータベース**: テスト用 SQLite (`:memory:`)

**テストケース例**:
- VaultKeyClient を使った機密情報の保存・取得
- ユーザー認証フロー
- トークン管理フロー

### 7.2.3 CLI テスト

**使用ライブラリ**: `execa` (コマンド実行)

**テストケース例**:
- `vaultkey init` コマンドの実行
- `vaultkey --help` のヘルプ表示
- 各サブコマンドの実行と出力確認

## 7.3 ログ設計

### 7.3.1 ログレベル

| レベル | 用途 | 例 |
|--------|------|-----|
| DEBUG | デバッグ情報 (開発環境のみ) | トークンハッシュ、クエリ内容 |
| INFO | 正常系の処理 | トークン発行、機密情報取得 |
| WARNING | 軽微な問題 | トークン数制限超過 |
| ERROR | エラー | 認証失敗、キー未検出 |
| CRITICAL | システム障害 | DB 接続失敗 |

### 7.3.2 ログ形式

**構造化ログ (JSON 形式)**:

各ログエントリは以下のフィールドを含む:
- `timestamp`: ISO 8601 形式のタイムスタンプ
- `level`: ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `message`: ログメッセージ
- `context`: コンテキスト情報 (オプション)

**出力例**:
```json
{
  "timestamp": "2025-01-22T10:00:00.000Z",
  "level": "INFO",
  "message": "機密情報を取得しました",
  "context": {
    "userId": "user123",
    "key": "apiKeyOpenai",
    "action": "getSecret"
  }
}
```

### 7.3.3 機密情報の取り扱い

**絶対に記録しない**:
- 機密情報の値
- トークン (平文)
- パスワード
- 暗号化キー

**記録可能**:
- ユーザー ID、キー名、アクション種別、タイムスタンプ
- エラーメッセージ (機密情報を含まない)

### 7.3.4 Logger クラスの設計

**主要機能**:
- ログレベルによるフィルタリング
- 構造化ログの出力 (JSON 形式)
- レベル別のメソッド (`debug`, `info`, `warn`, `error`, `critical`)
- 環境変数 `LOG_LEVEL` によるログレベル設定

## 7.4 デバッグ

### 7.4.1 デバッグ用環境変数

```bash
# デバッグログを有効化
export LOG_LEVEL=DEBUG

# デバッグモードで CLI を実行
vaultkey --log-level debug secret get apiKey
```
