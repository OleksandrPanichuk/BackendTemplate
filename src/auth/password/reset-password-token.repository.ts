import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { ICreateResetPasswordTokenData } from '@/auth/password/interfaces';

@Injectable()
export class ResetPasswordTokenRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByToken(token: string) {
    return this.db.resetPasswordToken.findUnique({
      where: {
        token,
      },
    });
  }

  public async findByUserId(userId: string) {
    return this.db.resetPasswordToken.findFirst({
      where: {
        userId,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async create(data: ICreateResetPasswordTokenData) {
    return this.db.resetPasswordToken.create({
      data: {
        userId: data.userId,
        expiresAt: data.expiresAt,
        token: data.token,
        resendCount: data.resendCount ?? 0,
      },
    });
  }

  public async incrementResendCount(id: string) {
    return this.db.resetPasswordToken.update({
      where: { id },
      data: {
        resendCount: {
          increment: 1,
        },
      },
    });
  }

  public async markAsConsumed(id: string) {
    return this.db.resetPasswordToken.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  public async deleteByUserId(userId: string) {
    return this.db.resetPasswordToken.deleteMany({
      where: {
        userId,
      },
    });
  }

  public async deleteExpiredTokens() {
    return this.db.resetPasswordToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
