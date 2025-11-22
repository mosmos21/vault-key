import { z } from 'zod';
import { ValidationError } from './errors';

const keySchema = z
  .string()
  .min(1, 'Key name must be at least 1 character')
  .max(256, 'Key name must be at most 256 characters')
  .regex(
    /^[a-zA-Z0-9_\-./]+$/,
    'Key name can only contain alphanumeric characters, underscores, hyphens, dots, and slashes',
  );

const tokenSchema = z
  .string()
  .length(64, 'Token must be 64 characters')
  .regex(/^[a-f0-9]+$/, 'Token must be a hexadecimal string');

const masterKeySchema = z
  .string()
  .length(64, 'Master key must be 64 characters')
  .regex(/^[a-f0-9]+$/, 'Master key must be a hexadecimal string');

const userIdSchema = z
  .string()
  .min(1, 'User ID must be at least 1 character')
  .max(256, 'User ID must be at most 256 characters')
  .regex(
    /^[a-zA-Z0-9_\-.@]+$/,
    'User ID can only contain alphanumeric characters, underscores, hyphens, dots, and @',
  );

export const validateKey = (key: string): void => {
  try {
    keySchema.parse(key);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.issues[0]?.message ?? 'Validation error');
    }
    throw error;
  }
};

export const validateToken = (token: string): void => {
  try {
    tokenSchema.parse(token);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.issues[0]?.message ?? 'Validation error');
    }
    throw error;
  }
};

export const validateMasterKey = (masterKey: string): void => {
  try {
    masterKeySchema.parse(masterKey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.issues[0]?.message ?? 'Validation error');
    }
    throw error;
  }
};

export const validateUserId = (userId: string): void => {
  try {
    userIdSchema.parse(userId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.issues[0]?.message ?? 'Validation error');
    }
    throw error;
  }
};
