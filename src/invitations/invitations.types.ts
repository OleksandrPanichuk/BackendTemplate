import { MemberRole } from '@prisma/generated';

export type InvitationMemberRole = Exclude<
  (typeof MemberRole)[keyof typeof MemberRole],
  'OWNER'
>;
