/**
 * User (database table: users)
 */
export type User = {
  /** User ID (primary key) */
  userId: string;
  /** WebAuthn Credential ID */
  credentialId: string;
  /** WebAuthn public key (JSON) */
  publicKey: string;
  /** Created at (ISO 8601) */
  createdAt: string;
};

/**
 * User creation input data
 */
export type CreateUserInput = {
  userId: string;
  credentialId: string;
  publicKey: string;
};
