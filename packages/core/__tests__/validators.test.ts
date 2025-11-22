import { describe, test, expect } from 'vitest';
import {
  validateKey,
  validateToken,
  validateMasterKey,
  validateUserId,
  ValidationError,
} from '../src/utils';
import {
  TEST_MASTER_KEY,
  TEST_TOKEN,
  TEST_USER_ID,
  TEST_KEY,
} from './fixtures/testData';

describe('validateKey', () => {
  test('accepts valid key names', () => {
    expect(() => validateKey(TEST_KEY)).not.toThrow();
    expect(() => validateKey('valid_key-name.123/path')).not.toThrow();
  });

  test('rejects empty string', () => {
    expect(() => validateKey('')).toThrow(ValidationError);
  });

  test('rejects key names longer than 256 characters', () => {
    const longKey = 'a'.repeat(257);
    expect(() => validateKey(longKey)).toThrow(ValidationError);
  });

  test('rejects key names with invalid characters', () => {
    expect(() => validateKey('invalid key')).toThrow(ValidationError);
    expect(() => validateKey('invalid@key')).toThrow(ValidationError);
    expect(() => validateKey('invalid#key')).toThrow(ValidationError);
  });
});

describe('validateToken', () => {
  test('accepts valid tokens', () => {
    expect(() => validateToken(TEST_TOKEN)).not.toThrow();
  });

  test('rejects tokens not 64 characters', () => {
    expect(() => validateToken('abc123')).toThrow(ValidationError);
    expect(() => validateToken('a'.repeat(63))).toThrow(ValidationError);
    expect(() => validateToken('a'.repeat(65))).toThrow(ValidationError);
  });

  test('rejects non-hex strings', () => {
    const invalidToken = 'g'.repeat(64);
    expect(() => validateToken(invalidToken)).toThrow(ValidationError);
  });
});

describe('validateMasterKey', () => {
  test('accepts valid master keys', () => {
    expect(() => validateMasterKey(TEST_MASTER_KEY)).not.toThrow();
  });

  test('rejects master keys not 64 characters', () => {
    expect(() => validateMasterKey('abc123')).toThrow(ValidationError);
    expect(() => validateMasterKey('a'.repeat(63))).toThrow(ValidationError);
    expect(() => validateMasterKey('a'.repeat(65))).toThrow(ValidationError);
  });

  test('rejects non-hex strings', () => {
    const invalidKey = 'g'.repeat(64);
    expect(() => validateMasterKey(invalidKey)).toThrow(ValidationError);
  });
});

describe('validateUserId', () => {
  test('accepts valid user IDs', () => {
    expect(() => validateUserId(TEST_USER_ID)).not.toThrow();
    expect(() =>
      validateUserId('user_123-name.test@example.com'),
    ).not.toThrow();
  });

  test('rejects empty string', () => {
    expect(() => validateUserId('')).toThrow(ValidationError);
  });

  test('rejects user IDs longer than 256 characters', () => {
    const longUserId = 'a'.repeat(257);
    expect(() => validateUserId(longUserId)).toThrow(ValidationError);
  });

  test('rejects user IDs with invalid characters', () => {
    expect(() => validateUserId('invalid user')).toThrow(ValidationError);
    expect(() => validateUserId('invalid#user')).toThrow(ValidationError);
    expect(() => validateUserId('invalid/user')).toThrow(ValidationError);
  });
});
