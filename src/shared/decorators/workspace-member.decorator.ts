import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Member } from '@prisma/generated';

export const WorkspaceMember = createParamDecorator(
  (data: keyof Member, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const member = req.member;
    return member ? member[data] : null;
  },
);
