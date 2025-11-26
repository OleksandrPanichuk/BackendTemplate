import { Member } from "@prisma/generated";

export type RemoveMemberDto = {
  readonly workspaceId: string;
  readonly memberId: string;
  readonly currentMember: Member;
};
