import { InvitationStatus } from '@prisma/generated';
import { InvitationMemberRole } from '@/invitations/invitations.types';

export interface IUpdateInvitationData {
  status?: InvitationStatus;
  role?: InvitationMemberRole;
}
