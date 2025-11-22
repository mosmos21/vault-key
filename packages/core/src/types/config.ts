/**
 * Application configuration
 */
export type VaultKeyConfig = {
  /** Database file path */
  dbPath: string;
  /** Master key (hex string, 64 characters) */
  masterKey: string;
  /** Authentication server port number */
  authPort: number;
  /** Log level */
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  /** Token TTL (seconds) */
  tokenTtl: number;
  /** Maximum number of tokens per user */
  maxTokensPerUser: number;
};
