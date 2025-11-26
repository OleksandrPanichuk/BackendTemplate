import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly db: PrismaService) {}

  public findByUserId(userId: string) {
    return this.db.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    });
  }
}
