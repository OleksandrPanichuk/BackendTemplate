import {
  AcceptInvitationDto,
  FindAllWorkspaceInvitationsDto,
  IFindInvitationsByWorkspaceIdResponse,
  InvitationsRepository,
  RejectInvitationDto,
} from '@/invitations';
import { SendInvitationDto } from '@/invitations/dto';
import { MembersRepository } from '@/members';
import { validateMemberAccess } from '@/shared/utils';
import { UsersRepository } from '@/users';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus } from '@prisma/generated';
import { InfiniteResponse } from '@/shared/types';

@Injectable()
export class InvitationsService {
  private readonly DEFAULT_TAKE = 10;

  constructor(
    private readonly invitationsRepository: InvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly membersRepository: MembersRepository,
  ) {}

  public async findAllWorkspaceInvitations({
    workspaceId,
    ...dto
  }: FindAllWorkspaceInvitationsDto): InfiniteResponse<IFindInvitationsByWorkspaceIdResponse> {
    const take = dto.take ?? this.DEFAULT_TAKE;
    const limit = dto.cursor ? take + 1 : take;

    const invitations = await this.invitationsRepository.findByWorkspaceId(
      workspaceId,
      {
        cursor: dto.cursor,
        take: limit,
        role: dto.role,
        status: dto.status,
      },
    );

    let nextCursor: string | null = null;

    if (invitations.length > take) {
      nextCursor = invitations.pop()?.id ?? null;
    }

    return {
      data: invitations,
      nextCursor,
    };
  }

  public async findAllUserInvitations(userId: string) {
    return this.invitationsRepository.findByUserId(userId);
  }

  public async send({ sender, ...dto }: SendInvitationDto) {
    if (!sender || !validateMemberAccess(sender.role)) {
      throw new ForbiddenException(
        "You don't have permission to invite people to this workspace",
      );
    }

    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const receiverMember =
      await this.membersRepository.findByWorkspaceIdAndUserId(
        dto.workspaceId,
        user.id,
      );

    if (receiverMember) {
      throw new ForbiddenException('User is already a member of the workspace');
    }

    const existingInvitation =
      await this.invitationsRepository.findByWorkspaceIdAndUserId(
        dto.workspaceId,
        user.id,
      );

    if (existingInvitation) {
      throw new BadRequestException('User already has an invitation pending');
    }

    return this.invitationsRepository.create({
      workspaceId: dto.workspaceId,
      senderId: sender.id,
      userId: user.id,
      role: dto.role,
    });
  }

  public async accept({ userId, workspaceId }: AcceptInvitationDto) {
    const invite = await this.invitationsRepository.findByWorkspaceIdAndUserId(
      workspaceId,
      userId,
    );

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.invitationsRepository.update(invite.id, {
      status: InvitationStatus.ACCEPTED,
    });

    return this.membersRepository.create({
      workspaceId: invite.workspaceId,
      role: invite.role,
      userId,
    });
  }

  public async reject({ workspaceId, userId }: RejectInvitationDto) {
    const invite = await this.invitationsRepository.findByWorkspaceIdAndUserId(
      workspaceId,
      userId,
    );

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    return this.invitationsRepository.update(invite.id, {
      status: InvitationStatus.DECLINED,
    });
  }
}
