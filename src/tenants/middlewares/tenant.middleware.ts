import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantsRepository } from '../tenants.repository';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const user = req.user;

    if (tenantId && user?.id) {
      try {
        const member = await this.tenantsRepository.findMember(
          tenantId,
          user.id,
        );

        if (member) {
          req.tenant = {
            id: tenantId,
            role: member.role,
          };
          this.logger.debug(
            `Tenant context set: ${tenantId} for user: ${user.id}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error setting tenant context: ${(error as Error).message}`,
        );
      }
    }

    next();
  }
}
