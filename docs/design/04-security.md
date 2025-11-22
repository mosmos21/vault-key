# 4. セキュリティ設計

## 4.1 暗号化方式

### 4.1.1 機密情報の暗号化

**方式**: AES-256-GCM (対称鍵暗号)

- **認証付き暗号化**: データの改ざん検出が可能
- **GCM モード**: Galois/Counter Mode (並列処理可能、高速)
- **キー長**: 256 bit (32 bytes)
- **IV (Initialization Vector)**: 12 bytes (ランダム生成)
- **Auth Tag**: 16 bytes (認証タグ)

**暗号化フロー**:

```typescript
export const encrypt = (plaintext: string, masterKey: Buffer): EncryptedData => {
  // 1. IV をランダム生成
  const iv = crypto.randomBytes(12);

  // 2. AES-256-GCM で暗号化
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  // 3. Auth Tag を取得
  const authTag = cipher.getAuthTag();

  // 4. IV + Auth Tag + 暗号化データを返却
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encrypted: encrypted.toString('base64'),
  };
};
```

**復号化フロー**:

```typescript
export const decrypt = (encryptedData: EncryptedData, masterKey: Buffer): string => {
  // 1. Base64 デコード
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

  // 2. AES-256-GCM で復号化
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);

  // 3. 平文を返却
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
```

### 4.1.2 マスターキーの管理

**環境変数での管理**:

```bash
# 32 バイトの hex 文字列 (64 文字)
export VAULTKEY_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

**生成方法**:

```bash
# Node.js で生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# または OpenSSL で生成
openssl rand -hex 32
```

**セキュリティ要件**:

- マスターキーはコードリポジトリに含めない
- `.env` ファイルを `.gitignore` に追加
- 本番環境では環境変数または専用のシークレット管理サービスを使用

### 4.1.3 トークンの保存

**方式**: SHA-256 ハッシュ

- **トークン生成**: `crypto.randomBytes(32)` (256 bit)
- **エンコード**: Base64 URL-safe
- **ハッシュ化**: SHA-256
- **保存**: ハッシュ値のみを DB に保存

**トークン生成フロー**:

```typescript
export const generateToken = (): string => {
  // 1. ランダムバイト列を生成
  const randomBytes = crypto.randomBytes(32);

  // 2. Base64 URL-safe エンコード
  return randomBytes.toString('base64url');
};
```

**トークンハッシュ化フロー**:

```typescript
export const hashToken = (token: string): string => {
  // 1. SHA-256 でハッシュ化
  const hash = crypto.createHash('sha256');
  hash.update(token);

  // 2. Hex 文字列で返却
  return hash.digest('hex');
};
```

**検証フロー**:

```typescript
export const verifyToken = async (token: string): Promise<string> => {
  // 1. トークンをハッシュ化
  const tokenHash = hashToken(token);

  // 2. DB からトークン情報を取得
  const tokenData = await tokenRepository.findByHash(tokenHash);

  // 3. トークンが存在しない場合はエラー
  if (!tokenData) {
    throw new AuthenticationError('トークンが無効です');
  }

  // 4. 有効期限チェック
  if (new Date() > new Date(tokenData.expiresAt)) {
    throw new AuthenticationError('トークンの有効期限が切れています');
  }

  // 5. 無効化チェック
  if (tokenData.isRevoked) {
    throw new AuthenticationError('トークンは無効化されています');
  }

  // 6. ユーザー ID を返す
  return tokenData.userId;
};
```

## 4.2 認証設計 (WebAuthn)

### 4.2.1 Passkey 認証の概要

VaultKey は **Passkey (WebAuthn)** による強固な多要素認証を実装します。

- **公開鍵暗号**: 公開鍵を DB に保存、秘密鍵はユーザーのデバイスに保存
- **フィッシング耐性**: チャレンジ・レスポンス認証により、リプレイ攻撃を防止
- **生体認証**: 指紋、顔認証などをサポート (デバイス依存)

### 4.2.2 登録フロー

```typescript
// 1. 登録開始
const registrationOptions = generateRegistrationOptions({
  rpID: 'localhost', // Relying Party ID (本番環境ではドメイン名)
  rpName: 'VaultKey',
  userID: userId,
  userName: username,
  challenge: generateChallenge(), // ランダムチャレンジ
  attestationType: 'none', // 認証器の証明は不要
  authenticatorSelection: {
    residentKey: 'preferred', // デバイスに Passkey を保存
    userVerification: 'preferred', // 生体認証を推奨
  },
});

// 2. クライアントで Passkey 作成 (ブラウザ/CLI)
// navigator.credentials.create() を使用

// 3. 登録完了
const verification = await verifyRegistrationResponse({
  response: clientResponse,
  expectedChallenge: challenge,
  expectedOrigin: 'http://localhost:5000',
});

// 4. 公開鍵を DB に保存
await userRepository.create({
  userId,
  username,
  credentialId: verification.registrationInfo.credentialID,
  publicKey: verification.registrationInfo.credentialPublicKey,
});
```

### 4.2.3 認証フロー

```typescript
// 1. 認証開始
const authenticationOptions = generateAuthenticationOptions({
  rpID: 'localhost',
  challenge: generateChallenge(),
  allowCredentials: [
    {
      id: user.credentialId,
      type: 'public-key',
    },
  ],
  userVerification: 'preferred',
});

// 2. クライアントで署名 (ブラウザ/CLI)
// navigator.credentials.get() を使用

// 3. 認証完了
const verification = await verifyAuthenticationResponse({
  response: clientResponse,
  expectedChallenge: challenge,
  expectedOrigin: 'http://localhost:5000',
  authenticator: {
    credentialID: user.credentialId,
    credentialPublicKey: user.publicKey,
    counter: 0, // Phase 1 ではカウンターは使用しない
  },
});

// 4. トークン発行
const { token } = await tokenManager.issueToken(userId, 3600); // 1 時間
```

### 4.2.4 認証 UX の実装

#### ブラウザ自動起動方式 (デフォルト)

```typescript
// CLI から認証サーバーを起動
const authServer = new AuthServer();
await authServer.start(); // http://localhost:5000 で起動

// ブラウザを自動起動
await authServer.openBrowser('http://localhost:5000/login?userId=alice');

// ブラウザで Passkey 認証を実行
// 認証成功後、トークンを CLI に返却
const token = await authServer.waitForToken();

// トークンを ~/.vaultkey/token に保存
await saveToken(token);

// 認証サーバーを停止
await authServer.stop();
```

#### 手動コピー方式 (WSL など)

```typescript
// CLI から認証サーバーを起動
const authServer = new AuthServer();
await authServer.start(); // http://localhost:5000 で起動

// 認証 URL を CLI に表示
console.log('以下の URL をブラウザで開いてください:');
console.log('http://localhost:5000/login?userId=alice');

// ブラウザで Passkey 認証を実行
// 認証成功後、トークンをブラウザに表示

// CLI でトークンを入力
const token = await promptPassword('トークンを貼り付けてください:');

// トークンを ~/.vaultkey/token に保存
await saveToken(token);

// 認証サーバーを停止
await authServer.stop();
```

## 4.3 認可設計

### 4.3.1 権限モデル

VaultKey は**ユーザーごとに完全に分離された権限モデル**を採用します。

- すべてのユーザーは対等な権限を持つ (管理者・一般ユーザーの区別なし)
- 各ユーザーは自分が作成した機密情報のみにアクセス可能 (CRUD)
- 他のユーザーが作成した機密情報には一切アクセスできない

### 4.3.2 アクセス制御フロー

```typescript
// 機密情報取得時のアクセス制御
export const getSecret = async (key: string, token: string) => {
  // 1. トークンを検証してユーザー ID を取得
  const userId = await tokenManager.verifyToken(token);

  // 2. ユーザー ID とキーで機密情報を検索
  const secret = await secretRepository.findByUserAndKey(userId, key);

  // 3. 機密情報が見つからない場合はエラー
  if (!secret) {
    throw new NotFoundError('機密情報が見つかりません');
  }

  // 4. 所有権チェック (user_id 一致確認)
  if (secret.userId !== userId) {
    throw new PermissionError('この機密情報にアクセスする権限がありません');
  }

  // 5. 有効期限チェック
  if (secret.expiresAt && new Date() > new Date(secret.expiresAt)) {
    throw new ExpiredError('機密情報の有効期限が切れています');
  }

  // 6. 復号化して返却
  return decrypt(secret.encryptedValue);
};
```

### 4.3.3 データベースレベルの分離

```sql
-- 複合主キーによる名前空間分離
CREATE TABLE secrets (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ユーザー削除時に機密情報も削除される (CASCADE DELETE)
```

## 4.4 脅威モデルとセキュリティ対策

### 4.4.1 脅威 1: 不正アクセス

**影響**: 機密情報の漏洩

**対策**:
- Passkey (WebAuthn) による強固な多要素認証
- トークンの有効期限 (デフォルト: 1 時間)
- 監査ログの記録

### 4.4.2 脅威 2: トークン漏洩

**影響**: なりすましによる機密情報へのアクセス

**対策**:
- トークンのハッシュ化 (SHA-256)
- 短い有効期限
- 即座の無効化機能 (`vaultkey token revoke`)
- トークン数制限 (デフォルト: 5 個)

### 4.4.3 脅威 3: データベース侵害

**影響**: 保存された機密情報の漏洩

**対策**:
- 暗号化保存 (AES-256-GCM)
- マスターキーの分離管理 (環境変数)
- データベースファイルのアクセス権限設定 (600)

### 4.4.4 脅威 4: リプレイ攻撃

**影響**: 過去の認証情報の再利用

**対策**:
- チャレンジ・レスポンス認証 (WebAuthn)
- ランダムチャレンジの使用
- タイムスタンプによる有効期限チェック

### 4.4.5 脅威 5: ライブラリの脆弱性

**影響**: アプリケーション全体のセキュリティ侵害

**対策**:
- 定期的な依存ライブラリの更新
- セキュリティ監査の実施 (Phase 4)
- npm audit の定期実行

## 4.5 セキュリティベストプラクティス

### 4.5.1 機密情報の取り扱い

**絶対に記録しない**:
- 機密情報の値
- トークン (平文)
- パスワード
- 暗号化キー

**記録可能**:
- ユーザー ID、キー名、アクション種別、タイムスタンプ
- エラーメッセージ (機密情報を含まない)

### 4.5.2 エラーメッセージの設計

```typescript
// Good: 機密情報を含まない
throw new NotFoundError('機密情報が見つかりません');

// Bad: キー名を含む
throw new NotFoundError(`機密情報 '${key}' が見つかりません`);

// Good: ユーザー ID を含まない
throw new AuthenticationError('トークンが無効です');

// Bad: ユーザー ID を含む
throw new AuthenticationError(`ユーザー ${userId} のトークンが無効です`);
```

### 4.5.3 メモリ上の機密情報の破棄

```typescript
// 機密情報を使用後速やかに破棄
const getSecret = async (key: string, token: string) => {
  let plaintext: string | null = null;

  try {
    // 復号化
    plaintext = decrypt(encryptedValue);

    // 使用
    return { key, value: plaintext };
  } finally {
    // メモリから削除
    if (plaintext) {
      plaintext = null;
    }
  }
};
```

### 4.5.4 データベースファイルのアクセス権限

```bash
# データベースファイルの作成時に権限を設定
chmod 600 vaultkey.db

# トークンファイルの権限設定
chmod 600 ~/.vaultkey/token
```

### 4.5.5 定期的なセキュリティチェック

```bash
# 依存ライブラリの脆弱性チェック
npm audit

# 依存ライブラリの更新
npm update

# セキュリティパッチの適用
npm audit fix
```

## 4.6 セキュリティ監査 (Phase 4)

Phase 4 では以下のセキュリティ監査を実施します:

- OWASP Top 10 の対策確認
- 暗号化実装のレビュー
- 認証・認可フローの検証
- 依存ライブラリの脆弱性スキャン
- ペネトレーションテスト
