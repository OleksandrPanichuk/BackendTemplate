import { Exclude } from 'class-transformer';
import {
  ResetPasswordToken,
  User,
  UserRole,
  VerificationCode,
} from '@prisma/generated';

export class UserEntity implements User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly role: UserRole;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly avatarId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly emailVerified: boolean;

  @Exclude()
  readonly hash: string | null;

  @Exclude()
  readonly failedLoginAttempts: number | null;

  @Exclude()
  readonly lockedUntil: Date | null;

  @Exclude()
  readonly resetPasswordTokens?: ResetPasswordToken[];

  @Exclude()
  readonly verificationCodes?: VerificationCode[];

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
