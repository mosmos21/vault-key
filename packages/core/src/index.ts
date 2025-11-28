/**
 * @mosmos21/vaultkey-core
 * VaultKey core library
 */
export * from './types';
export * from './utils';
export * from './crypto';
export * from './logger';
export * from './passkey';
export { loadConfig } from './config';
export { VaultKeyClient } from './client';

// Database exports (for testing and advanced usage)
export { createConnection, closeConnection, createUser } from './database';
export { issueToken } from './auth/tokenManager';
