import { MemberRole } from '@prisma/generated';

export interface IFindByWorkspaceIdData {
  take?: number;
  cursor?: string;
  role?: MemberRole;
}
