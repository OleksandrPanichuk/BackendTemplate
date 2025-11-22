import {
  ICreateUserData,
  IUpdateFailedLoginAttemptsData,
} from '@/users/interfaces';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: PrismaService) {}

  public findById(userId: string) {
    return this.db.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  public findByEmail(email: string) {
    return this.db.user.findUnique({
      where: {
        email,
      },
    });
  }

  public findByEmailOrUsername(email: string, username: string) {
    return this.db.user.findFirst({
      where: {
        OR: [
          {
            email,
          },
          {
            username,
          },
        ],
      },
    });
  }

  public create(data: ICreateUserData) {
    return this.db.user.create({
      data: {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        hash: data.passwordHash,
        failedLoginAttempts: 0,
      },
    });
  }

  public getFailedLoginAttempts(userId: string) {
    return this.db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        failedLoginAttempts: true,
      },
    });
  }

  public async updateFailedLoginAttempts(
    userId: string,
    data: IUpdateFailedLoginAttemptsData,
  ) {
    return this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        failedLoginAttempts: data.attempts,
        lockedUntil: data.lockedUntil,
      },
    });
  }

  public updatePassword(userId: string, hash: string) {
    return this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        hash,
      },
    });
  }

  public resetFailedLoginAttempts(userId: string) {
    return this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  public updateVerificationStatus(userId: string) {
    return this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerified: true,
      },
    });
  }
}
