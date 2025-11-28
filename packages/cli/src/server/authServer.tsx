import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { VaultKeyClient } from '@mosmos_21/vault-key-core';
import { RegistrationPage, AuthenticationPage, SuccessPage } from './authPages';

export type AuthServerOptions = {
  client: VaultKeyClient;
  userId: string;
  port: number;
  mode: 'register' | 'login';
};

export type AuthServerResult = {
  success: boolean;
  token?: string;
  error?: string;
};

export type CreateAuthAppOptions = {
  client: VaultKeyClient;
  userId: string;
  mode: 'register' | 'login';
  onFinish?: (result: AuthServerResult) => void;
  loadAsset?: (filename: string) => string;
};

const defaultLoadAsset = (filename: string): string => {
  const filePath = join(__dirname, filename);
  return readFileSync(filePath, 'utf-8');
};

/**
 * Create Hono app for authentication
 */
export const createAuthApp = (options: CreateAuthAppOptions): Hono => {
  const {
    client,
    userId,
    mode,
    onFinish = () => {},
    loadAsset = defaultLoadAsset,
  } = options;

  const app = new Hono();

  app.use('*', cors());

  app.get('/webauthn.js', (c) => {
    const js = loadAsset('webauthn.js');
    return c.text(js, 200, { 'Content-Type': 'application/javascript' });
  });

  app.get('/', (c) => {
    return c.html(
      mode === 'register' ? (
        <RegistrationPage userId={userId} />
      ) : (
        <AuthenticationPage userId={userId} />
      ),
    );
  });

  app.get('/api/register/options', async (c) => {
    const registrationOptions = await client.getRegistrationOptions(userId);
    return c.json(registrationOptions);
  });

  app.post('/api/register/verify', async (c) => {
    const { response } = await c.req.json();
    await client.verifyRegistration(userId, response);
    setTimeout(() => onFinish({ success: true }), 100);
    return c.json({ success: true });
  });

  app.get('/api/login/options', async (c) => {
    const loginOptions = await client.getAuthenticationOptions(userId);
    return c.json(loginOptions);
  });

  app.post('/api/login/verify', async (c) => {
    const { response } = await c.req.json();
    const result = await client.verifyAuthentication(userId, response);
    setTimeout(() => onFinish({ success: true, token: result.token }), 100);
    return c.json({ success: true });
  });

  app.get('/success', (c) => {
    const message =
      mode === 'register'
        ? 'Passkey registration completed!'
        : 'Authentication completed!';
    return c.html(<SuccessPage message={message} />);
  });

  app.onError((err, c) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setTimeout(() => onFinish({ success: false, error: message }), 100);
    return c.json({ message }, 400);
  });

  return app;
};

/**
 * Start authentication server and wait for authentication completion
 */
export const startAuthServer = (
  options: AuthServerOptions,
): Promise<AuthServerResult> => {
  const { client, userId, port, mode } = options;

  return new Promise((resolve) => {
    const state = { resolved: false };

    const finish = (result: AuthServerResult) => {
      if (state.resolved) return;
      state.resolved = true;
      server.close();
      resolve(result);
    };

    const app = createAuthApp({
      client,
      userId,
      mode,
      onFinish: finish,
    });

    const server = serve(
      {
        fetch: app.fetch,
        port,
        hostname: 'localhost',
      },
      () => {
        // Server started
      },
    );

    // Timeout after 5 minutes
    setTimeout(
      () => {
        finish({ success: false, error: 'Authentication timeout' });
      },
      5 * 60 * 1000,
    );
  });
};
