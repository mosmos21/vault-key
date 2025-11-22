import { describe, test, expect } from 'vitest';
import {
  VaultKeyError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  CryptoError,
  DatabaseError,
  ExpiredError,
  DuplicateError,
} from '@core/utils/errors';

describe('VaultKeyError', () => {
  test('creates error with correct message and name', () => {
    const error = new VaultKeyError('test error');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('test error');
    expect(error.name).toBe('VaultKeyError');
  });

  test('is catchable as Error', () => {
    try {
      throw new VaultKeyError('test error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VaultKeyError);
    }
  });
});

describe('AuthenticationError', () => {
  test('creates error with correct message and name', () => {
    const error = new AuthenticationError('authentication failed');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('authentication failed');
    expect(error.name).toBe('AuthenticationError');
  });
});

describe('ValidationError', () => {
  test('creates error with correct message and name', () => {
    const error = new ValidationError('validation failed');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('validation failed');
    expect(error.name).toBe('ValidationError');
  });
});

describe('NotFoundError', () => {
  test('creates error with correct message and name', () => {
    const error = new NotFoundError('resource not found');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('resource not found');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('CryptoError', () => {
  test('creates error with correct message and name', () => {
    const error = new CryptoError('encryption failed');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('encryption failed');
    expect(error.name).toBe('CryptoError');
  });
});

describe('DatabaseError', () => {
  test('creates error with correct message and name', () => {
    const error = new DatabaseError('database operation failed');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('database operation failed');
    expect(error.name).toBe('DatabaseError');
  });
});

describe('ExpiredError', () => {
  test('creates error with correct message and name', () => {
    const error = new ExpiredError('token expired');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('token expired');
    expect(error.name).toBe('ExpiredError');
  });
});

describe('DuplicateError', () => {
  test('creates error with correct message and name', () => {
    const error = new DuplicateError('duplicate entry');

    expect(error).toBeInstanceOf(VaultKeyError);
    expect(error.message).toBe('duplicate entry');
    expect(error.name).toBe('DuplicateError');
  });
});

describe('Error inheritance', () => {
  test('all custom errors inherit from VaultKeyError', () => {
    const errors = [
      new AuthenticationError('test'),
      new ValidationError('test'),
      new NotFoundError('test'),
      new CryptoError('test'),
      new DatabaseError('test'),
      new ExpiredError('test'),
      new DuplicateError('test'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(VaultKeyError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  test('can differentiate between error types using instanceof', () => {
    const authError = new AuthenticationError('test');
    const validationError = new ValidationError('test');

    expect(authError).toBeInstanceOf(AuthenticationError);
    expect(authError).not.toBeInstanceOf(ValidationError);

    expect(validationError).toBeInstanceOf(ValidationError);
    expect(validationError).not.toBeInstanceOf(AuthenticationError);
  });
});
