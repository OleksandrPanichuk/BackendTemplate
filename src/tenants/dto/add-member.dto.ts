import { ApiProperty } from '@nestjs/swagger';
import { TenantMemberRole } from '@prisma/generated';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class AddMemberInput {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User UUID to add to tenant',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    enum: TenantMemberRole,
    example: TenantMemberRole.MEMBER,
    description: 'Role to assign to the member',
  })
  @IsEnum(TenantMemberRole)
  @IsNotEmpty()
  role: TenantMemberRole;
}
