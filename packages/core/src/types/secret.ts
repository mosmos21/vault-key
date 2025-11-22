/**
 * Secret (database table: secrets)
 */
export type Secret = {
  /** User ID (composite primary key 1) */
  userId: string;
  /** Key name (composite primary key 2) */
  key: string;
  /** Encrypted value (AES-256-GCM) */
  encryptedValue: string;
  /** Expires at (ISO 8601, nullable) */
  expiresAt: string | null;
  /** Created at (ISO 8601) */
  createdAt: string;
  /** Updated at (ISO 8601) */
  updatedAt: string;
};

/**
 * Secret creation input data
 */
export type CreateSecretInput = {
  userId: string;
  key: string;
  value: string;
  expiresAt?: string | null;
};

/**
 * Secret update input data
 */
export type UpdateSecretInput = {
  value: string;
  expiresAt?: string | null;
};

/**
 * List secrets options
 */
export type ListSecretsOptions = {
  /** Include expired secrets */
  includeExpired?: boolean;
};

/**
 * Decrypted secret data
 */
export type DecryptedSecret = {
  key: string;
  value: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};
