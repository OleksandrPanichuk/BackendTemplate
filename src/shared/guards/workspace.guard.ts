import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MembersRepository } from '@/members/members.repository';
import { Request } from 'express';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly membersRepository: MembersRepository) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user;

    if (!user || !user.id) {
      return false;
    }

    const workspaceId = request?.params?.workspaceId;

    if (!workspaceId) {
      return false;
    }

    const member = await this.membersRepository.findByWorkspaceIdAndUserId(
      workspaceId,
      user.id,
    );

    if (!member) {
      return false;
    }

    request.member = member;

    return true;
  }
}
