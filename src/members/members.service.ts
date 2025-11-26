import {
  FindAllMembersDto,
  RemoveMemberDto,
  UpdateMemberDto,
} from '@/members/dto';
import { MembersRepository } from '@/members/members.repository';
import { InfiniteResponse } from '@/shared/types';
import { validateMemberAccess } from '@/shared/utils';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Member, MemberRole } from '@prisma/generated';

@Injectable()
export class MembersService {
  private readonly DEFAULT_TAKE = 10;
  constructor(private readonly membersRepository: MembersRepository) {}

  public async findAll(dto: FindAllMembersDto): InfiniteResponse<Member> {
    const take = dto.take ?? this.DEFAULT_TAKE;
    const limit = dto.cursor ? take + 1 : take;

    const members = await this.membersRepository.findByWorkspaceIdWithUser(
      dto.workspaceId,
      {
        cursor: dto.cursor,
        role: dto.role,
        take: limit,
      },
    );

    let nextCursor: string | null = null;

    if (members.length > take) {
      nextCursor = members.pop()!.id ?? null;
    }

    return {
      data: members,
      nextCursor,
    };
  }

  public async update(dto: UpdateMemberDto) {
    if (!validateMemberAccess(dto.currentMember.role)) {
      throw new ForbiddenException(
        'You do not have permission to update member roles.',
      );
    }

    const existingMember = await this.membersRepository.findById(dto.memberId);

    if (!existingMember || existingMember.workspaceId !== dto.workspaceId) {
      throw new NotFoundException(
        'Member not found in the specified workspace.',
      );
    }

    if (existingMember.role === MemberRole.OWNER) {
      throw new ForbiddenException(
        'Cannot change the role of the workspace owner.',
      );
    }

    switch (dto.currentMember.role) {
      case MemberRole.OWNER: {
        return this.membersRepository.update(dto.memberId, {
          role: dto.role,
        });
      }
      case MemberRole.ADMIN: {
        if (existingMember.role === MemberRole.ADMIN) {
          throw new ForbiddenException('Admins cannot update other admins.');
        }
        return this.membersRepository.update(dto.memberId, {
          role: dto.role,
        });
      }
    }
  }

  public async remove(dto: RemoveMemberDto) {
    if (dto.currentMember.role === MemberRole.MEMBER) {
      throw new ForbiddenException(
        'You do not have permission to remove members.',
      );
    }

    const existingMember = await this.membersRepository.findById(dto.memberId);

    if (!existingMember || existingMember.workspaceId !== dto.workspaceId) {
      throw new NotFoundException(
        'Member not found in the specified workspace.',
      );
    }

    if (existingMember.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner.');
    }

    switch (dto.currentMember.role) {
      case MemberRole.OWNER: {
        return this.membersRepository.remove(dto.memberId);
      }
      case MemberRole.ADMIN: {
        if (existingMember.role === MemberRole.ADMIN) {
          throw new ForbiddenException('Admins cannot remove other admins.');
        }
        return this.membersRepository.remove(dto.memberId);
      }
    }
  }
}
