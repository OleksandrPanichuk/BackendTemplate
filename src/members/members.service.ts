import { Injectable } from '@nestjs/common';
import { MembersRepository } from '@/members/members.repository';
import { FindAllMembersDto } from '@/members/dto';
import { InfiniteResponse } from '@/shared/types';
import { Member } from '@prisma/generated';

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
}
