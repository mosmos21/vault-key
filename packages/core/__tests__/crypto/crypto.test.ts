import { describe, test, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  generateMasterKey,
  hashToken,
  generateToken,
} from '@core/crypto';
import {
  TEST_MASTER_KEY,
  TEST_PLAINTEXT,
  TEST_TOKEN,
} from '../fixtures/testData';

describe('encryption', () => {
  test('encrypt and decrypt work correctly', () => {
    const encrypted = encrypt(TEST_PLAINTEXT, TEST_MASTER_KEY);
    const decrypted = decrypt(encrypted, TEST_MASTER_KEY);

    expect(decrypted).toBe(TEST_PLAINTEXT);
  });

  test('encrypted value is different from plaintext', () => {
    const encrypted = encrypt(TEST_PLAINTEXT, TEST_MASTER_KEY);

    expect(encrypted).not.toBe(TEST_PLAINTEXT);
  });

  test('encrypted value has the format iv:authTag:ciphertext', () => {
    const encrypted = encrypt(TEST_PLAINTEXT, TEST_MASTER_KEY);
    const parts = encrypted.split(':');

    expect(parts).toHaveLength(3);
  });

  test('cannot decrypt with wrong master key', () => {
    const encrypted = encrypt(TEST_PLAINTEXT, TEST_MASTER_KEY);
    const wrongKey =
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  test('generateMasterKey generates 64-character hex string', () => {
    const masterKey = generateMasterKey();

    expect(masterKey).toHaveLength(64);
    expect(masterKey).toMatch(/^[a-f0-9]+$/);
  });
});

describe('tokenHash', () => {
  test('hashToken hashes with SHA-256', () => {
    const hash = hashToken(TEST_TOKEN);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test('same token generates same hash', () => {
    const hash1 = hashToken(TEST_TOKEN);
    const hash2 = hashToken(TEST_TOKEN);

    expect(hash1).toBe(hash2);
  });

  test('different tokens generate different hashes', () => {
    const token1 = TEST_TOKEN;
    const token2 =
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345678a';
    const hash1 = hashToken(token1);
    const hash2 = hashToken(token2);

    expect(hash1).not.toBe(hash2);
  });

  test('generateToken generates 64-character hex string', () => {
    const token = generateToken();

    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  test('generateToken generates different tokens each time', () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).not.toBe(token2);
  });
});
