import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly db: PrismaService) {}
}
