import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { AuthenticatedGuard, WorkspaceGuard } from '@/shared/guards';
import { FindAllMembersQuery } from '@/members/dto';

@UseGuards(AuthenticatedGuard)
@UseGuards(WorkspaceGuard)
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  public async findAll(@Param("workspaceId") workspaceId: string, @Query() query: FindAllMembersQuery) {
    return this.membersService.findAll({...query, workspaceId})
  }


}
