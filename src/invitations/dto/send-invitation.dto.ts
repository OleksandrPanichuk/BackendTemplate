import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TrimAndLower } from '@/shared/decorators';
import { Member, MemberRole } from '@prisma/generated';
import { InvitationMemberRole } from '@/invitations';

export class SendInvitationInput {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
    type: 'string',
    format: 'email',
  })
  @IsEmail()
  @TrimAndLower()
  readonly email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: [MemberRole.MEMBER, MemberRole.ADMIM],
    example: MemberRole.MEMBER,
  })
  @IsEnum([MemberRole.MEMBER, MemberRole.ADMIM])
  readonly role: InvitationMemberRole;
}

export class SendInvitationDto extends SendInvitationInput {
  readonly workspaceId: string;
  readonly sender: Member;
}
