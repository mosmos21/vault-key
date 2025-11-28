import { DatabaseSync } from 'node:sqlite';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { storeChallenge, consumeChallenge } from './challengeStore';
import {
  createPasskey,
  getPasskeysByUserId,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  updatePasskeyLastUsed,
} from '@core/database/repositories/passkeyRepository';
import {
  createUser,
  getUserById,
  updateUserLastLogin,
} from '@core/database/repositories/userRepository';
import type { Passkey } from '@core/types/passkey';
import { AuthenticationError } from '@core/utils/errors';

const RP_ID = 'localhost';
const RP_NAME = 'VaultKey';
const DEFAULT_AUTH_PORT = 5432;

const getOrigin = (): string => {
  const port = process.env.VAULTKEY_AUTH_PORT
    ? parseInt(process.env.VAULTKEY_AUTH_PORT, 10)
    : DEFAULT_AUTH_PORT;
  return `http://localhost:${port}`;
};

/**
 * Generate registration options for a new user
 */
export const generatePasskeyRegistrationOptions = async (
  db: DatabaseSync,
  userId: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> => {
  const existingUser = getUserById(db, userId);

  const existingPasskeys = existingUser ? getPasskeysByUserId(db, userId) : [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: userId,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      ...(passkey.transports && { transports: passkey.transports }),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  storeChallenge(userId, options.challenge);

  return options;
};

/**
 * Verify registration response and create passkey
 */
export const verifyPasskeyRegistration = async (
  db: DatabaseSync,
  userId: string,
  response: RegistrationResponseJSON,
): Promise<Passkey> => {
  const expectedChallenge = consumeChallenge(userId);
  if (!expectedChallenge) {
    throw new AuthenticationError('Challenge not found or expired');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AuthenticationError('Registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const existingUser = getUserById(db, userId);
  if (!existingUser) {
    createUser(db, { userId });
  }

  const passkey = createPasskey(db, {
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: response.response.transports ?? null,
  });

  return passkey;
};

/**
 * Generate authentication options for an existing user
 */
export const generatePasskeyAuthenticationOptions = async (
  db: DatabaseSync,
  userId: string,
): Promise<PublicKeyCredentialRequestOptionsJSON> => {
  const user = getUserById(db, userId);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  const passkeys = getPasskeysByUserId(db, userId);
  if (passkeys.length === 0) {
    throw new AuthenticationError('No passkeys registered');
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId,
      ...(passkey.transports && { transports: passkey.transports }),
    })),
    userVerification: 'preferred',
  });

  storeChallenge(userId, options.challenge);

  return options;
};

/**
 * Verify authentication response
 */
export const verifyPasskeyAuthentication = async (
  db: DatabaseSync,
  userId: string,
  response: AuthenticationResponseJSON,
): Promise<{ verified: boolean; passkey: Passkey }> => {
  const expectedChallenge = consumeChallenge(userId);
  if (!expectedChallenge) {
    throw new AuthenticationError('Challenge not found or expired');
  }

  const passkey = getPasskeyByCredentialId(db, response.id);
  if (!passkey) {
    throw new AuthenticationError('Passkey not found');
  }

  if (passkey.userId !== userId) {
    throw new AuthenticationError('Passkey does not belong to user');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64'),
      counter: passkey.counter,
      ...(passkey.transports && { transports: passkey.transports }),
    },
  });

  if (!verification.verified) {
    throw new AuthenticationError('Authentication verification failed');
  }

  updatePasskeyCounter(
    db,
    passkey.id,
    verification.authenticationInfo.newCounter,
  );
  updatePasskeyLastUsed(db, passkey.id);
  updateUserLastLogin(db, userId);

  return {
    verified: true,
    passkey,
  };
};
