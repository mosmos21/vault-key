import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VaultKeyClient } from '@mosmos_21/vault-key-core';
import { createAuthApp } from '../../src/server/authServer';

const createMockClient = (): VaultKeyClient => {
  return {
    getRegistrationOptions: vi.fn().mockResolvedValue({
      challenge: 'mock-challenge',
      rp: { name: 'VaultKey', id: 'localhost' },
      user: { id: 'user-id', name: 'test-user', displayName: 'Test User' },
    }),
    verifyRegistration: vi.fn().mockResolvedValue({ verified: true }),
    getAuthenticationOptions: vi.fn().mockResolvedValue({
      challenge: 'mock-challenge',
      allowCredentials: [],
    }),
    verifyAuthentication: vi.fn().mockResolvedValue({
      verified: true,
      token: 'mock-token-123',
    }),
  } as unknown as VaultKeyClient;
};

const mockLoadAsset = (filename: string): string => {
  if (filename === 'webauthn.js') {
    return 'const startRegistration = () => {};';
  }
  return '';
};

describe('createAuthApp', () => {
  let mockClient: VaultKeyClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('static assets', () => {
    it('should serve webauthn.js', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/webauthn.js');

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/javascript');
      expect(await res.text()).toBe('const startRegistration = () => {};');
    });
  });

  describe('registration mode', () => {
    it('should render registration page on root', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/');
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('Passkey Registration');
      expect(html).toContain('test-user');
    });

    it('should return registration options', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/api/register/options');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('challenge', 'mock-challenge');
      expect(mockClient.getRegistrationOptions).toHaveBeenCalledWith(
        'test-user',
      );
    });

    it('should verify registration', async () => {
      const onFinish = vi.fn();
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
        onFinish,
      });

      const res = await app.request('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: { id: 'cred-id' } }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
      expect(mockClient.verifyRegistration).toHaveBeenCalledWith('test-user', {
        id: 'cred-id',
      });

      // onFinish is called with setTimeout, wait for it
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(onFinish).toHaveBeenCalledWith({ success: true });
    });

    it('should render success page for registration', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/success');
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('Passkey registration completed!');
    });
  });

  describe('login mode', () => {
    it('should render authentication page on root', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'login',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/');
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('Passkey Authentication');
      expect(html).toContain('test-user');
    });

    it('should return authentication options', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'login',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/api/login/options');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('challenge', 'mock-challenge');
      expect(mockClient.getAuthenticationOptions).toHaveBeenCalledWith(
        'test-user',
      );
    });

    it('should verify authentication', async () => {
      const onFinish = vi.fn();
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'login',
        loadAsset: mockLoadAsset,
        onFinish,
      });

      const res = await app.request('/api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: { id: 'cred-id' } }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
      expect(mockClient.verifyAuthentication).toHaveBeenCalledWith(
        'test-user',
        { id: 'cred-id' },
      );

      // onFinish is called with setTimeout, wait for it
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(onFinish).toHaveBeenCalledWith({
        success: true,
        token: 'mock-token-123',
      });
    });

    it('should render success page for login', async () => {
      const app = createAuthApp({
        client: mockClient,
        userId: 'test-user',
        mode: 'login',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/success');
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('Authentication completed!');
    });
  });

  describe('error handling', () => {
    it('should return error when registration options fail', async () => {
      const mockClientWithError = {
        ...createMockClient(),
        getRegistrationOptions: vi
          .fn()
          .mockRejectedValue(new Error('User not found')),
      } as unknown as VaultKeyClient;

      const app = createAuthApp({
        client: mockClientWithError,
        userId: 'test-user',
        mode: 'register',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/api/register/options');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: 'User not found' });
    });

    it('should return error when authentication options fail', async () => {
      const mockClientWithError = {
        ...createMockClient(),
        getAuthenticationOptions: vi
          .fn()
          .mockRejectedValue(new Error('No passkey registered')),
      } as unknown as VaultKeyClient;

      const app = createAuthApp({
        client: mockClientWithError,
        userId: 'test-user',
        mode: 'login',
        loadAsset: mockLoadAsset,
      });

      const res = await app.request('/api/login/options');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ message: 'No passkey registered' });
    });
  });
});
