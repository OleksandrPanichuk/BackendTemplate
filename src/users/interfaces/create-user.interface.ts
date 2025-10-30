import { UserRole } from '@prisma/generated';

export interface ICreateUserData {
  email: string;
  username: string;
  passwordHash?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
}
