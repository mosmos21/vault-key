/**
 * VaultKey base error class
 */
export class VaultKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultKeyError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Encryption/decryption error
 */
export class CryptoError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Expired error
 */
export class ExpiredError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'ExpiredError';
  }
}

/**
 * Duplicate error
 */
export class DuplicateError extends VaultKeyError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateError';
  }
}
