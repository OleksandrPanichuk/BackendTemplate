import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenantMemberRole } from '@prisma/generated';
import { TenantMemberEntity } from './entities/tenant-member.entity';
import { TenantEntity } from './entities/tenant.entity';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly tenantsRepository: TenantsRepository) {}

  public async createTenant(
    userId: string,
    data: { name: string; slug: string },
  ): Promise<TenantEntity> {
    const existingTenant = await this.tenantsRepository.findBySlug(data.slug);

    if (existingTenant) {
      throw new ConflictException('Tenant with this slug already exists');
    }

    const tenant = await this.tenantsRepository.create({
      name: data.name,
      slug: data.slug,
      ownerId: userId,
    });

    this.logger.log(`Tenant created: ${tenant.id} by user: ${userId}`);

    return new TenantEntity(tenant);
  }

  public async getTenantById(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantsRepository.findById(tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return new TenantEntity(tenant);
  }

  public async getTenantBySlug(slug: string): Promise<TenantEntity> {
    const tenant = await this.tenantsRepository.findBySlug(slug);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return new TenantEntity(tenant);
  }

  public async getUserTenants(userId: string): Promise<TenantEntity[]> {
    const tenants = await this.tenantsRepository.findUserTenants(userId);
    return tenants.map((tenant) => new TenantEntity(tenant));
  }

  public async updateTenant(
    tenantId: string,
    userId: string,
    data: { name?: string; slug?: string },
  ): Promise<TenantEntity> {
    await this.validateTenantAccess(tenantId, userId, [
      TenantMemberRole.OWNER,
      TenantMemberRole.ADMIN,
    ]);

    if (data.slug) {
      const existingTenant = await this.tenantsRepository.findBySlug(data.slug);
      if (existingTenant && existingTenant.id !== tenantId) {
        throw new ConflictException('Tenant with this slug already exists');
      }
    }

    const tenant = await this.tenantsRepository.update(tenantId, data);

    this.logger.log(`Tenant updated: ${tenantId} by user: ${userId}`);

    return new TenantEntity(tenant);
  }

  public async deleteTenant(tenantId: string, userId: string): Promise<void> {
    await this.validateTenantAccess(tenantId, userId, [TenantMemberRole.OWNER]);

    await this.tenantsRepository.delete(tenantId);

    this.logger.log(`Tenant deleted: ${tenantId} by user: ${userId}`);
  }

  public async getTenantMembers(tenantId: string, userId: string) {
    await this.validateTenantAccess(tenantId, userId);

    return this.tenantsRepository.findTenantMembers(tenantId);
  }

  public async addMember(
    tenantId: string,
    userId: string,
    targetUserId: string,
    role: TenantMemberRole,
  ): Promise<TenantMemberEntity> {
    await this.validateTenantAccess(tenantId, userId, [
      TenantMemberRole.OWNER,
      TenantMemberRole.ADMIN,
    ]);

    if (role === TenantMemberRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role');
    }

    const existingMember = await this.tenantsRepository.findMember(
      tenantId,
      targetUserId,
    );

    if (existingMember) {
      throw new ConflictException('User is already a member of this tenant');
    }

    const member = await this.tenantsRepository.addMember(
      tenantId,
      targetUserId,
      role,
    );

    this.logger.log(
      `Member added to tenant ${tenantId}: ${targetUserId} by user: ${userId}`,
    );

    return new TenantMemberEntity(member);
  }

  public async updateMemberRole(
    tenantId: string,
    userId: string,
    targetUserId: string,
    role: TenantMemberRole,
  ): Promise<TenantMemberEntity> {
    await this.validateTenantAccess(tenantId, userId, [
      TenantMemberRole.OWNER,
      TenantMemberRole.ADMIN,
    ]);

    if (role === TenantMemberRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role');
    }

    const member = await this.tenantsRepository.findMember(
      tenantId,
      targetUserId,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === TenantMemberRole.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    const updatedMember = await this.tenantsRepository.updateMemberRole(
      tenantId,
      targetUserId,
      role,
    );

    this.logger.log(
      `Member role updated in tenant ${tenantId}: ${targetUserId} by user: ${userId}`,
    );

    return new TenantMemberEntity(updatedMember);
  }

  public async removeMember(
    tenantId: string,
    userId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.validateTenantAccess(tenantId, userId, [
      TenantMemberRole.OWNER,
      TenantMemberRole.ADMIN,
    ]);

    const member = await this.tenantsRepository.findMember(
      tenantId,
      targetUserId,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === TenantMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove owner');
    }

    await this.tenantsRepository.removeMember(tenantId, targetUserId);

    this.logger.log(
      `Member removed from tenant ${tenantId}: ${targetUserId} by user: ${userId}`,
    );
  }

  private async validateTenantAccess(
    tenantId: string,
    userId: string,
    requiredRoles?: TenantMemberRole[],
  ): Promise<void> {
    const member = await this.tenantsRepository.findMember(tenantId, userId);

    if (!member) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (requiredRoles && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
  }

  public async getUserTenantRole(
    tenantId: string,
    userId: string,
  ): Promise<TenantMemberRole | null> {
    const member = await this.tenantsRepository.findMember(tenantId, userId);
    return member?.role || null;
  }
}
