/**
 * User (database table: users)
 */
export type User = {
  userId: string;
  createdAt: string;
  lastLoginAt: string | null;
};

/**
 * User creation input data
 */
export type CreateUserInput = {
  userId: string;
};
