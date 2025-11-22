import { MemberRole } from '@prisma/generated';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ToNumber } from '@/shared/decorators';

export class FindAllMembersQuery {
  @IsOptional()
  @IsEnum(MemberRole)
  readonly role?: MemberRole;

  @ToNumber()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  readonly take?: number;

  @IsOptional()
  @IsString()
  readonly cursor?: string;
}

export class FindAllMembersDto extends FindAllMembersQuery {
  readonly workspaceId: string;
}
