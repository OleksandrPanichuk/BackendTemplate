import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { AuthenticatedGuard } from '@/shared/guards';
import { CurrentUser } from '@/shared/decorators';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@UseGuards(AuthenticatedGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @ApiOperation({
    summary: 'Get workspaces of a user',
    description:
      'Retrieve a list of workspaces associated with a specific user.',
  })
  @ApiOkResponse({
    description: 'A list of workspaces has been successfully retrieved.',
  })
  @ApiForbiddenResponse({
    description: 'Unauthorized access to workspaces.',
  })
  @Get('/')
  findByUserId(@CurrentUser('id') userId: string) {
    return this.workspacesService.findByUserId(userId);
  }
}
