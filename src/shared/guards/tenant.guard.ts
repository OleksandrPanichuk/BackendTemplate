import { TenantsService } from '@/tenants/tenants.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    const member = await this.tenantsService['tenantsRepository'].findMember(
      tenantId,
      user.id,
    );

    if (!member) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    req.tenant = {
      id: tenantId,
      role: member.role,
    };

    return true;
  }
}
