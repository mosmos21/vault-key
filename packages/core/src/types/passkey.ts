import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

/**
 * Passkey (database table: passkeys)
 */
export type Passkey = {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[] | null;
  createdAt: string;
  lastUsedAt: string | null;
};

/**
 * Passkey creation input data
 */
export type CreatePasskeyInput = {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[] | null;
};
