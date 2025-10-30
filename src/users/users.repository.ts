import {
  ICreateUserData,
  IUpdateFailedLoginAttemptsData,
} from '@/users/interfaces';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(userId: string) {
    return this.db.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  public async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: {
        email,
      },
    });
  }

  public async findByEmailOrUsername(email: string, username: string) {
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

  public async create(data: ICreateUserData) {
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

  public async getFailedLoginAttempts(userId: string) {
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
      data,
    });
  }

  public async updatePassword(userId: string, hash: string) {
    return this.db.user.update({
      where: {
        id: userId,
      },
      data: {
        hash,
      },
    });
  }

  public async resetFailedLoginAttempts(userId: string) {
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

  public async updateVerificationStatus(userId: string) {
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
