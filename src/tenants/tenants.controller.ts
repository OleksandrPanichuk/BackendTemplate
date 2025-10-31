import { CurrentUser } from '@/shared/decorators';
import { AuthenticatedGuard } from '@/shared/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  AddMemberInput,
  CreateTenantInput,
  UpdateMemberRoleInput,
  UpdateTenantInput,
} from './dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(AuthenticatedGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiCreatedResponse({ description: 'Tenant created successfully' })
  @ApiConflictResponse({ description: 'Tenant with this slug already exists' })
  createTenant(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTenantInput,
  ) {
    return this.tenantsService.createTenant(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants for the current user' })
  @ApiOkResponse({ description: 'List of user tenants' })
  getUserTenants(@CurrentUser('id') userId: string) {
    return this.tenantsService.getUserTenants(userId);
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'Tenant details' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  getTenantById(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getTenantById(tenantId);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  @ApiParam({ name: 'slug', description: 'Tenant slug' })
  @ApiOkResponse({ description: 'Tenant details' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  getTenantBySlug(@Param('slug') slug: string) {
    return this.tenantsService.getTenantBySlug(slug);
  }

  @Patch(':tenantId')
  @ApiOperation({ summary: 'Update tenant (ADMIN/OWNER only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'Tenant updated successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiConflictResponse({ description: 'Tenant with this slug already exists' })
  updateTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTenantInput,
  ) {
    return this.tenantsService.updateTenant(tenantId, userId, dto);
  }

  @Delete(':tenantId')
  @ApiOperation({ summary: 'Delete tenant (OWNER only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'Tenant deleted successfully' })
  @ApiForbiddenResponse({ description: 'Only owner can delete tenant' })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  deleteTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tenantsService.deleteTenant(tenantId, userId);
  }

  @Get(':tenantId/members')
  @ApiOperation({ summary: 'Get all members of a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiOkResponse({ description: 'List of tenant members' })
  @ApiForbiddenResponse({ description: 'No access to this tenant' })
  getTenantMembers(
    @Param('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tenantsService.getTenantMembers(tenantId, userId);
  }

  @Post(':tenantId/members')
  @ApiOperation({ summary: 'Add member to tenant (ADMIN/OWNER only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiCreatedResponse({ description: 'Member added successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiConflictResponse({ description: 'User is already a member' })
  addMember(
    @Param('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMemberInput,
  ) {
    return this.tenantsService.addMember(
      tenantId,
      userId,
      dto.userId,
      dto.role,
    );
  }

  @Patch(':tenantId/members/:memberId')
  @ApiOperation({ summary: 'Update member role (ADMIN/OWNER only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'memberId', description: 'Member user UUID' })
  @ApiOkResponse({ description: 'Member role updated successfully' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Member not found' })
  updateMemberRole(
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleInput,
  ) {
    return this.tenantsService.updateMemberRole(
      tenantId,
      userId,
      memberId,
      dto.role,
    );
  }

  @Delete(':tenantId/members/:memberId')
  @ApiOperation({ summary: 'Remove member from tenant (ADMIN/OWNER only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID' })
  @ApiParam({ name: 'memberId', description: 'Member user UUID' })
  @ApiOkResponse({ description: 'Member removed successfully' })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions or cannot remove owner',
  })
  @ApiNotFoundResponse({ description: 'Member not found' })
  removeMember(
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tenantsService.removeMember(tenantId, userId, memberId);
  }
}
