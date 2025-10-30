import { Prisma } from '@prisma/generated';

export interface IUpsertTwoFactorData {
  create: Omit<Prisma.TwoFactorAuthUpsertWithoutUserInput['create'], 'userId'>;
  update: Omit<Prisma.TwoFactorAuthUpsertWithoutUserInput['update'], 'userId'>;
}
