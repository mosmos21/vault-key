/* eslint-disable */
/**
 * WebAuthn client-side utilities for Passkey registration and authentication.
 * This file runs in the browser, not Node.js.
 */

// Base64URL encoding/decoding utilities
const base64URLToBuffer = (base64URL) => {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64URL = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Status display utility
const setStatus = (message, type) => {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.style.display = 'block';
};

// Get userId from data attribute
const getUserId = () => {
  const container = document.querySelector('[data-user-id]');
  return container.dataset.userId;
};

// Registration flow
const startRegistration = async () => {
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  setStatus('Getting registration options...', 'loading');

  const userId = getUserId();

  try {
    const optionsRes = await fetch(
      '/api/register/options?userId=' + encodeURIComponent(userId),
    );
    if (!optionsRes.ok) {
      throw new Error('Failed to get registration options');
    }
    const options = await optionsRes.json();

    options.challenge = base64URLToBuffer(options.challenge);
    options.user.id = base64URLToBuffer(options.user.id);
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map((cred) => ({
        ...cred,
        id: base64URLToBuffer(cred.id),
      }));
    }

    setStatus('Please authenticate with your device...', 'loading');

    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    const response = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
        attestationObject: bufferToBase64URL(
          credential.response.attestationObject,
        ),
        transports: credential.response.getTransports
          ? credential.response.getTransports()
          : [],
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };

    setStatus('Verifying registration...', 'loading');

    const verifyRes = await fetch('/api/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, response }),
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      throw new Error(error.message || 'Registration verification failed');
    }

    setStatus('Registration successful! You can close this window.', 'success');
  } catch (error) {
    console.error('Registration error:', error);
    setStatus('Error: ' + error.message, 'error');
    btn.disabled = false;
  }
};

// Authentication flow
const startAuthentication = async () => {
  const btn = document.getElementById('authBtn');
  btn.disabled = true;
  setStatus('Getting authentication options...', 'loading');

  const userId = getUserId();

  try {
    const optionsRes = await fetch(
      '/api/login/options?userId=' + encodeURIComponent(userId),
    );
    if (!optionsRes.ok) {
      const error = await optionsRes.json();
      throw new Error(error.message || 'Failed to get authentication options');
    }
    const options = await optionsRes.json();

    options.challenge = base64URLToBuffer(options.challenge);
    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map((cred) => ({
        ...cred,
        id: base64URLToBuffer(cred.id),
      }));
    }

    setStatus('Please authenticate with your device...', 'loading');

    const credential = await navigator.credentials.get({ publicKey: options });

    const response = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
        authenticatorData: bufferToBase64URL(
          credential.response.authenticatorData,
        ),
        signature: bufferToBase64URL(credential.response.signature),
        userHandle: credential.response.userHandle
          ? bufferToBase64URL(credential.response.userHandle)
          : null,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };

    setStatus('Verifying authentication...', 'loading');

    const verifyRes = await fetch('/api/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, response }),
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      throw new Error(error.message || 'Authentication verification failed');
    }

    setStatus(
      'Authentication successful! You can close this window.',
      'success',
    );
  } catch (error) {
    console.error('Authentication error:', error);
    setStatus('Error: ' + error.message, 'error');
    btn.disabled = false;
  }
};
