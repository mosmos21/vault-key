import { DatabaseSync } from 'node:sqlite';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import type {
  VaultKeyConfig,
  DecryptedSecret,
  Token,
  Passkey,
} from '@core/types';
import { loadConfig } from '@core/config';
import { createConnection, closeConnection } from '@core/database';
import {
  issueToken,
  verifyToken,
  invalidateToken,
} from '@core/auth/tokenManager';
import {
  saveSecret,
  retrieveSecret,
  removeSecret,
  listAllSecrets,
} from '@core/secrets/secretsService';
import { listUserTokens } from '@core/database/repositories/tokenRepository';
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from '@core/passkey';
import { logger } from '@core/logger';

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning') {
    return;
  }
  logger.warning(warning.message);
});

/**
 * VaultKeyClient constructor options
 */
export type VaultKeyClientOptions = Partial<VaultKeyConfig> & {
  masterKeyFile?: string;
};

/**
 * VaultKey client class.
 * Provides API for secret management, user authentication, and token management.
 */
export class VaultKeyClient {
  private db: DatabaseSync;
  private config: VaultKeyConfig;

  constructor(config?: VaultKeyClientOptions) {
    this.config = loadConfig(
      config?.masterKey || config?.masterKeyFile
        ? {
            ...(config.masterKey ? { masterKey: config.masterKey } : {}),
            ...(config.masterKeyFile
              ? { masterKeyFile: config.masterKeyFile }
              : {}),
          }
        : undefined,
    );

    if (config?.dbPath) {
      this.config.dbPath = config.dbPath;
    }
    if (config?.authPort !== undefined) {
      this.config.authPort = config.authPort;
    }
    if (config?.logLevel) {
      this.config.logLevel = config.logLevel;
    }
    if (config?.tokenTtl !== undefined) {
      this.config.tokenTtl = config.tokenTtl;
    }
    if (config?.maxTokensPerUser !== undefined) {
      this.config.maxTokensPerUser = config.maxTokensPerUser;
    }

    this.db = createConnection(this.config.dbPath);
  }

  /**
   * Get registration options for Passkey registration
   */
  async getRegistrationOptions(
    userId: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return generatePasskeyRegistrationOptions(this.db, userId);
  }

  /**
   * Verify Passkey registration response
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
  ): Promise<Passkey> {
    return verifyPasskeyRegistration(this.db, userId, response);
  }

  /**
   * Get authentication options for Passkey authentication
   */
  async getAuthenticationOptions(
    userId: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return generatePasskeyAuthenticationOptions(this.db, userId);
  }

  /**
   * Verify Passkey authentication response
   */
  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
  ): Promise<{ verified: boolean; token: string }> {
    const result = await verifyPasskeyAuthentication(this.db, userId, response);

    if (!result.verified) {
      throw new Error('Authentication failed');
    }

    const tokenResult = issueToken(
      this.db,
      userId,
      this.config.tokenTtl,
      this.config.maxTokensPerUser,
    );

    return {
      verified: true,
      token: tokenResult.token,
    };
  }

  /**
   * Issue a token
   */
  issueToken(
    userId: string,
    expiresIn?: number,
  ): { token: string; tokenHash: string; expiresAt: string } {
    const tokenTtl = expiresIn ?? this.config.tokenTtl;
    return issueToken(this.db, userId, tokenTtl, this.config.maxTokensPerUser);
  }

  /**
   * Get a secret
   */
  getSecret(key: string, token: string): DecryptedSecret {
    const userId = verifyToken(this.db, token);
    return retrieveSecret(this.db, userId, key, this.config.masterKey);
  }

  /**
   * Store a secret
   */
  storeSecret(
    key: string,
    value: string,
    token: string,
    expiresAt?: string,
  ): void {
    const userId = verifyToken(this.db, token);
    saveSecret(
      this.db,
      userId,
      key,
      value,
      this.config.masterKey,
      expiresAt ?? null,
    );
  }

  /**
   * Update a secret
   */
  updateSecret(
    key: string,
    value: string,
    token: string,
    expiresAt?: string,
  ): void {
    const userId = verifyToken(this.db, token);
    saveSecret(
      this.db,
      userId,
      key,
      value,
      this.config.masterKey,
      expiresAt ?? null,
    );
  }

  /**
   * Delete a secret
   */
  deleteSecret(key: string, token: string): void {
    const userId = verifyToken(this.db, token);
    removeSecret(this.db, userId, key);
  }

  /**
   * List secrets
   */
  listSecrets(
    token: string,
    pattern?: string,
  ): Array<{
    key: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }> {
    const userId = verifyToken(this.db, token);
    const options = pattern ? { pattern } : {};
    return listAllSecrets(this.db, userId, options);
  }

  /**
   * Revoke a token
   */
  revokeToken(token: string): void {
    verifyToken(this.db, token);
    invalidateToken(this.db, token);
  }

  /**
   * List tokens
   */
  listTokens(token: string): Token[] {
    const userId = verifyToken(this.db, token);
    return listUserTokens(this.db, userId);
  }

  /**
   * Close database connection
   */
  close(): void {
    closeConnection(this.db);
  }
}
