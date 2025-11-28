/**
 * Authentication page components for Passkey registration and authentication.
 */

import type { FC } from 'hono/jsx';
import { css, Style } from 'hono/css';

const globalStyles = css`
  :-hono-global {
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
        sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    h1 {
      color: #333;
      margin-bottom: 16px;
      font-size: 24px;
    }

    p {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition:
        transform 0.2s,
        box-shadow 0.2s;
      width: 100%;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status {
      margin-top: 20px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
    }

    .status.loading {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status.success {
      background: #e8f5e9;
      color: #388e3c;
    }

    .status.error {
      background: #ffebee;
      color: #d32f2f;
    }
  }
`;

const containerClass = css`
  ${globalStyles}
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
`;

const logoClass = css`
  font-size: 48px;
  margin-bottom: 16px;
`;

const userIdClass = css`
  background: #f5f5f5;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  color: #333;
  margin-bottom: 24px;
  word-break: break-all;
`;

const subMessageClass = css`
  margin-top: 20px;
  color: #999;
`;

const errorMessageClass = css`
  color: #d32f2f;
`;

type LayoutProps = {
  title: string;
  children: unknown;
};

const Layout: FC<LayoutProps> = ({ title, children }) => (
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <Style />
    </head>
    <body>
      {children}
      <script src="/webauthn.js" />
    </body>
  </html>
);

type RegistrationPageProps = {
  userId: string;
};

export const RegistrationPage: FC<RegistrationPageProps> = ({ userId }) => (
  <Layout title="VaultKey - Passkey Registration">
    <div class={containerClass} data-user-id={userId}>
      <div class={logoClass}>🔐</div>
      <h1>Passkey Registration</h1>
      <p>Register a Passkey for the following user ID:</p>
      <div class={userIdClass}>{userId}</div>
      <button id="registerBtn" onclick="startRegistration()">
        Register Passkey
      </button>
      <div id="status" class="status"></div>
    </div>
  </Layout>
);

type AuthenticationPageProps = {
  userId: string;
};

export const AuthenticationPage: FC<AuthenticationPageProps> = ({ userId }) => (
  <Layout title="VaultKey - Passkey Authentication">
    <div class={containerClass} data-user-id={userId}>
      <div class={logoClass}>🔑</div>
      <h1>Passkey Authentication</h1>
      <p>Authenticate with Passkey for the following user ID:</p>
      <div class={userIdClass}>{userId}</div>
      <button id="authBtn" onclick="startAuthentication()">
        Authenticate
      </button>
      <div id="status" class="status"></div>
    </div>
  </Layout>
);

type SuccessPageProps = {
  message: string;
};

export const SuccessPage: FC<SuccessPageProps> = ({ message }) => (
  <Layout title="VaultKey - Success">
    <div class={containerClass}>
      <div class={logoClass}>✅</div>
      <h1>Success</h1>
      <p>{message}</p>
      <p class={subMessageClass}>You can close this window.</p>
    </div>
  </Layout>
);

type ErrorPageProps = {
  message: string;
};

export const ErrorPage: FC<ErrorPageProps> = ({ message }) => (
  <Layout title="VaultKey - Error">
    <div class={containerClass}>
      <div class={logoClass}>❌</div>
      <h1>Error</h1>
      <p class={errorMessageClass}>{message}</p>
      <p class={subMessageClass}>Please close this window and try again.</p>
    </div>
  </Layout>
);
