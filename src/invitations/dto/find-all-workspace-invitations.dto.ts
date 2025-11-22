import { ToNumber } from '@/shared/decorators';
import { InvitationStatus, MemberRole } from '@prisma/generated';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { InvitationMemberRole } from '../invitations.types';

export class FindAllWorkspaceInvitationsQuery {
  @ToNumber()
  @IsOptional()
  @IsPositive()
  @IsNumber()
  readonly take?: number;

  @IsOptional()
  @IsString()
  readonly cursor?: string;

  @IsOptional()
  @IsEnum(InvitationStatus)
  readonly status?: InvitationStatus;

  @IsOptional()
  @IsEnum([MemberRole.ADMIM, MemberRole.MEMBER])
  readonly role?: InvitationMemberRole;
}

export class FindAllWorkspaceInvitationsDto extends FindAllWorkspaceInvitationsQuery {
  readonly workspaceId: string;
}
