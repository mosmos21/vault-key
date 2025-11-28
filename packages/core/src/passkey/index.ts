export {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from './passkeyService';

export {
  storeChallenge,
  consumeChallenge,
  cleanupExpiredChallenges,
  clearChallenges,
} from './challengeStore';
