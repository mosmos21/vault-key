/**
 * Access token (database table: tokens)
 */
export type Token = {
  /** Token hash (SHA-256, primary key) */
  tokenHash: string;
  /** User ID */
  userId: string;
  /** Expires at (ISO 8601) */
  expiresAt: string;
  /** Created at (ISO 8601) */
  createdAt: string;
};

/**
 * Token creation input data
 */
export type CreateTokenInput = {
  userId: string;
  expiresAt: string;
};

/**
 * Token generation result
 */
export type GenerateTokenResult = {
  /** Plain token (hex string, 64 characters) */
  token: string;
  /** Token hash (SHA-256) */
  tokenHash: string;
  /** Expires at (ISO 8601) */
  expiresAt: string;
};
