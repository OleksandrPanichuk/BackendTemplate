import { MemberRole } from '@prisma/generated';

export function validateMemberAccess(role: MemberRole) {
  return role === MemberRole.OWNER || role === MemberRole.ADMIN;
}
