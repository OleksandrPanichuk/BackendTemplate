import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import {
  ICreateInvitationData,
  IFindInvitationsByUserIdData,
  IFindInvitationsByWorkspaceIdData,
  IUpdateInvitationData,
} from '@/invitations/interfaces';
import { InvitationStatus } from '@prisma/generated';

@Injectable()
export class InvitationsRepository {
  constructor(private readonly db: PrismaService) {}

  public findByWorkspaceId(
    workspaceId: string,
    data?: IFindInvitationsByWorkspaceIdData,
  ) {
    return this.db.invitation.findMany({
      where: {
        workspaceId,
        status: data?.status,
        role: data?.role,
      },
      take: data?.take,
      cursor: data?.cursor ? { id: data.cursor } : undefined,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            avatar: true,
            username: true,
          },
        },
      },
    });
  }

  public findByUserId(userId: string, data?: IFindInvitationsByUserIdData) {
    return this.db.invitation.findMany({
      where: {
        userId,
        status: InvitationStatus.PENDING,
      },
      take: data?.take,
      cursor: data?.cursor ? { id: data.cursor } : undefined,
      include: {
        workspace: {
          select: {
            id: true,
            logo: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  public findByWorkspaceIdAndUserId(workspaceId: string, userId: string) {
    return this.db.invitation.findFirst({
      where: {
        workspaceId,
        userId,
        status: InvitationStatus.PENDING,
      },
    });
  }

  public create(data: ICreateInvitationData) {
    return this.db.invitation.create({
      data: {
        workspaceId: data.workspaceId,
        senderId: data.senderId,
        userId: data.userId,
        role: data.role,
      },
    });
  }

  public update(invitationId: string, data: Partial<IUpdateInvitationData>) {
    return this.db.invitation.update({
      where: {
        id: invitationId,
      },
      data: {
        status: data.status,
        role: data.role,
      },
    });
  }

  public delete(invitationId: string) {
    return this.db.invitation.delete({
      where: {
        id: invitationId,
      },
    });
  }
}
