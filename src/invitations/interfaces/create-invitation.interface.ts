import { InvitationMemberRole } from '@/invitations/invitations.types';

export interface ICreateInvitationData {
  workspaceId: string;
  userId: string;
  role: InvitationMemberRole;
  senderId: string;
}
