import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { ICreateVerificationCodeData } from './interfaces';

@Injectable()
export class VerificationCodeRepository {
  constructor(private readonly db: PrismaService) {}

  public async create(data: ICreateVerificationCodeData) {
    return this.db.verificationCode.create({
      data: {
        code: data.code,
        userId: data.userId,
        expiresAt: data.expiresAt,
        consumedAt: data.consumedAt || null,
        resendCount: data.resendCount || 0,
      },
    });
  }

  public async update(
    userId: string,
    data: Partial<
      Pick<ICreateVerificationCodeData, 'code' | 'expiresAt' | 'resendCount'>
    >,
  ) {
    return this.db.verificationCode.updateMany({
      where: {
        userId,
        consumedAt: null,
      },
      data,
    });
  }

  public async findByUserId(userId: string) {
    return this.db.verificationCode.findFirst({
      where: {
        userId,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async findAllByUserId(userId: string) {
    return this.db.verificationCode.findMany({
      where: {
        userId,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async deleteExpiredCodes() {
    return this.db.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  public async deleteByUserId(userId: string) {
    return this.db.verificationCode.deleteMany({
      where: {
        userId,
      },
    });
  }
}
