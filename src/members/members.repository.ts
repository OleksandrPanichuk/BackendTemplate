import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  ICreateMemberData,
  IFindByWorkspaceIdData,
} from '@/members/interfaces';
import { IUpdateMemberData } from '@/members/interfaces/update-member.interface';

@Injectable()
export class MembersRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByWorkspaceId(
    workspaceId: string,
    data?: IFindByWorkspaceIdData,
  ) {
    return this.db.member.findMany({
      where: {
        workspaceId,
      },
      take: data?.take,
      cursor: data?.cursor
        ? {
            id: data.cursor,
          }
        : undefined,
    });
  }

  public async findByWorkspaceIdWithUser(
    workspaceId: string,
    data?: IFindByWorkspaceIdData,
  ) {
    return this.db.member.findMany({
      where: {
        workspaceId,
      },
      take: data?.take,
      cursor: data?.cursor
        ? {
            id: data.cursor,
          }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  public findByWorkspaceIdAndUserId(workspaceId: string, userId: string) {
    return this.db.member.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  public create(data: ICreateMemberData) {
    return this.db.member.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
      },
    });
  }

  public update(memberId: string, data: IUpdateMemberData) {
    return this.db.member.update({
      where: {
        id: memberId,
      },
      data: {
        role: data.role,
      },
    });
  }

  public delete(memberId: string) {
    return this.db.member.delete({
      where: {
        id: memberId,
      },
    });
  }
}
