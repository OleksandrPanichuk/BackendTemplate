import { File, Invitation, InvitationStatus } from '@prisma/generated';
import { InvitationMemberRole } from '@/invitations';

export interface IFindInvitationsByWorkspaceIdData {
  status?: InvitationStatus;
  role?: InvitationMemberRole;
  take?: number;
  cursor?: string;
}

export interface IFindInvitationsByWorkspaceIdResponse extends Invitation {
  user: {
    id: string;
    email: string;
    username: string;
    avatar: File | null;
  };
  sender: {
    id: string;
    email: string;
    username: string;
    avatar: File | null;
  };
}
