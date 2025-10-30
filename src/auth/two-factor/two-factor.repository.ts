import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  IUpdateTwoFactorData,
  IUpsertTwoFactorData,
} from '@/auth/two-factor/interfaces';

@Injectable()
export class TwoFactorRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByUserId(userId: string) {
    return this.db.twoFactorAuth.findUnique({
      where: {
        userId,
      },
    });
  }

  public async update(userId: string, data: Partial<IUpdateTwoFactorData>) {
    return this.db.twoFactorAuth.update({
      where: {
        userId,
      },
      data,
    });
  }

  public async upsert(userId: string, data: IUpsertTwoFactorData) {
    return this.db.twoFactorAuth.upsert({
      where: {
        userId,
      },
      create: {
        ...data.create,
        userId,
      },
      update: data.update,
    });
  }
}
