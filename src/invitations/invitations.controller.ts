import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { AuthenticatedGuard, WorkspaceGuard } from '@/shared/guards';
import { InvitationsGateway } from '@/invitations/invitations.gateway';
import { CurrentUser, WorkspaceMember } from '@/shared/decorators';
import { SendInvitationInput } from '@/invitations/dto';
import { Member } from '@prisma/generated';
import {
  FindAllWorkspaceInvitationsDto,
  FindAllWorkspaceInvitationsQuery,
} from '@/invitations/dto/find-all-workspace-invitations.dto';

@ApiTags('Invitations')
@UseGuards(AuthenticatedGuard)
@Controller('workspaces/:workspaceId/invites')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly invitationsGateway: InvitationsGateway,
  ) {}

  @ApiOperation({
    summary: "List all user's invitations",
    description: 'Retrieve a list of all pending invitations sent to the user',
  })
  @ApiParam({
    name: 'workspaceId',
    type: 'string',
    description: 'The ID of the workspace to retrieve invitations for',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user invitations',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @Get('/user')
  findAllUserInvites(@CurrentUser('id') userId: string) {
    return this.invitationsService.findAllUserInvitations(userId);
  }

  @ApiOperation({
    summary: 'List all workspace invitations',
    description:
      'Retrieve a list of all invitations workspace has sent to users. Only workspace members with appropriate permissions can access this endpoint.',
  })
  @ApiParam({
    name: 'workspaceId',
    type: 'string',
    description: 'The ID of the workspace to retrieve invitations for',
  })
  @ApiBody({
    type: FindAllWorkspaceInvitationsDto,
    description: 'Parameters for filtering and pagination of invitations',
  })
  @ApiResponse({
    status: 200,
    description: 'List of workspace invitations',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'User does not have permission to view invitations',
  })
  @UseGuards(WorkspaceGuard)
  @Get('/workspace')
  findAllWorkspaceInvites(
    @Param('workspaceId') workspaceId: string,
    @Query() query: FindAllWorkspaceInvitationsQuery,
  ) {
    return this.invitationsService.findAllWorkspaceInvitations({
      workspaceId,
      ...query,
    });
  }

  @ApiOperation({
    summary: 'Send invitation to a user',
    description:
      'Send an invitation to a user to join a workspace. Only workspace members with appropriate permissions can send invitations.',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'The ID of the workspace to invite the user to',
    type: 'string',
  })
  @ApiBody({
    type: SendInvitationInput,
    description: 'Invitation details including email and role',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiForbiddenResponse({
    description:
      'User does not have permission to send invitations or user is already a member',
  })
  @ApiNotFoundResponse({
    description: 'User with the provided email not found',
  })
  @UseGuards(WorkspaceGuard)
  @Post('send')
  async sendInvitation(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: SendInvitationInput,
    @WorkspaceMember() sender: Member,
  ) {
    const invitation = await this.invitationsService.send({
      ...dto,
      workspaceId,
      sender,
    });

    this.invitationsGateway.sendInvitation(invitation);

    return invitation;
  }

  @ApiOperation({
    summary: 'Accept workspace invitation',
    description:
      'Accept an invitation to join a workspace. The authenticated user must have a pending invitation for the specified workspace.',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'The ID of the workspace to accept invitation for',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation accepted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'No pending invitation found for this workspace',
  })
  @ApiBadRequestResponse({
    description: 'Invalid invitation status',
  })
  @Post('accept')
  acceptInvitation(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitationsService.accept({ workspaceId, userId });
  }

  @ApiOperation({
    summary: 'Reject workspace invitation',
    description:
      'Reject an invitation to join a workspace. The authenticated user must have a pending invitation for the specified workspace.',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'The ID of the workspace to reject invitation for',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation rejected successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'No pending invitation found for this workspace',
  })
  @ApiBadRequestResponse({
    description: 'Invalid invitation status',
  })
  @Post('reject')
  rejectInvitation(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitationsService.reject({ workspaceId, userId });
  }
}
