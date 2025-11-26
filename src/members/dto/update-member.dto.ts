import { Member, MemberRole } from '@prisma/generated';
import { IsEnum } from 'class-validator';

export class UpdateMemberInput {
  @IsEnum([MemberRole.ADMIN, MemberRole.MEMBER])
  readonly role: Exclude<MemberRole, 'OWNER'>;
}

export type UpdateMemberDto = UpdateMemberInput & {
  readonly memberId: string;
  readonly workspaceId: string;
  readonly currentMember: Member
};
