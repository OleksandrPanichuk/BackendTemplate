import { ApiProperty } from '@nestjs/swagger';
import { TenantMemberRole } from '@prisma/generated';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateMemberRoleInput {
  @ApiProperty({
    enum: TenantMemberRole,
    example: TenantMemberRole.ADMIN,
    description: 'New role to assign to the member',
  })
  @IsEnum(TenantMemberRole)
  @IsNotEmpty()
  role: TenantMemberRole;
}
