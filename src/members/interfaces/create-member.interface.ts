import { MemberRole } from '@prisma/generated';

export interface ICreateMemberData {
  workspaceId: string;
  userId: string;
  role: MemberRole;
}
