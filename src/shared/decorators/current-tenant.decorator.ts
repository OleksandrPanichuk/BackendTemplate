
import { ITenantContext } from '@/tenants/tenants.interfaces';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentTenant = createParamDecorator(
  (data: keyof ITenantContext | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const tenant = req.tenant;

    return data ? tenant?.[data] : tenant;
  },
);
