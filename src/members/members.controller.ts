import { FindAllMembersQuery, UpdateMemberInput } from '@/members/dto';
import { WorkspaceMember } from '@/shared/decorators';
import { AuthenticatedGuard, WorkspaceGuard } from '@/shared/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { Member } from '@prisma/generated';
import { MembersService } from './members.service';

@UseGuards(AuthenticatedGuard)
@UseGuards(WorkspaceGuard)
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @ApiOperation({
    summary: 'Get all members of a workspace',
    description:
      'Retrieve a list of all members associated with a specific workspace.',
  })
  @ApiOkResponse({
    description: 'A list of workspace members has been successfully retrieved.',
  })
  @ApiForbiddenResponse({
    description: 'Unauthorized access to workspace members.',
  })
  @HttpCode(HttpStatus.OK)
  @Get()
  public findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: FindAllMembersQuery,
  ) {
    return this.membersService.findAll({ ...query, workspaceId });
  }

  @ApiOperation({
    summary: 'Update a member in a workspace',
    description: 'Update the role of a member within a specific workspace.',
  })
  @ApiOkResponse({
    description: 'The member has been successfully updated.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update member roles.',
  })
  @ApiForbiddenResponse({
    description: 'Cannot change the role of the workspace owner.',
  })
  @ApiNotFoundResponse({
    description: 'Member not found in the specified workspace.',
  })
  @HttpCode(HttpStatus.OK)
  @Patch('/:memberId')
  public update(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @WorkspaceMember() currentMember: Member,
    @Body() dto: UpdateMemberInput,
  ) {
    return this.membersService.update({
      ...dto,
      currentMember,
      memberId,
      workspaceId,
    });
  }

  @ApiOperation({
    summary: 'Remove a member from a workspace',
    description: 'Remove a member from a specific workspace.',
  })
  @ApiOkResponse({
    description: 'The member has been successfully removed.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to remove members.',
  })
  @ApiNotFoundResponse({
    description: 'Member not found in the specified workspace.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/:memberId')
  public remove(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @WorkspaceMember() currentMember: Member,
  ) {
    return this.membersService.remove({
      memberId,
      workspaceId,
      currentMember,
    });
  }
}
