import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { TenantMemberRole } from '@prisma/generated';
import { ICreateTenantData, IUpdateTenantData } from './tenants.interfaces';

@Injectable()
export class TenantsRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(tenantId: string) {
    return this.db.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  public async findBySlug(slug: string) {
    return this.db.tenant.findUnique({
      where: { slug },
    });
  }

  public async findByOwnerId(ownerId: string) {
    return this.db.tenant.findMany({
      where: { ownerId },
    });
  }

  public async findUserTenants(userId: string) {
    return this.db.tenant.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    });
  }

  public async create(data: ICreateTenantData) {
    return this.db.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerId: data.ownerId,
        members: {
          create: {
            userId: data.ownerId,
            role: TenantMemberRole.OWNER,
          },
        },
      },
      include: {
        members: true,
      },
    });
  }

  public async update(
    tenantId: string,
    data:IUpdateTenantData
  ) {
    return this.db.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  public async delete(tenantId: string) {
    return this.db.tenant.delete({
      where: { id: tenantId },
    });
  }

  public async findMember(tenantId: string, userId: string) {
    return this.db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
  }

  public async findTenantMembers(tenantId: string) {
    return this.db.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarId: true,
          },
        },
      },
    });
  }

  public async addMember(
    tenantId: string,
    userId: string,
    role: TenantMemberRole,
  ) {
    return this.db.tenantMember.create({
      data: {
        tenantId,
        userId,
        role,
      },
    });
  }

  public async updateMemberRole(
    tenantId: string,
    userId: string,
    role: TenantMemberRole,
  ) {
    return this.db.tenantMember.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: { role },
    });
  }

  public async removeMember(tenantId: string, userId: string) {
    return this.db.tenantMember.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
  }
}
