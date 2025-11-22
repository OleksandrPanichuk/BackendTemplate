import { User } from '@prisma/generated';

export type SafeUser = Omit<
  User,
  'hash' | 'failedLoginAttempts' | 'lockedUntil'
>;

export function toSafeUser(user: User): SafeUser {
  const { hash, failedLoginAttempts, lockedUntil, ...safeUser } = user;
  return safeUser;
}
