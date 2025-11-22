import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { getCorsConfig } from '@/shared/config';
import type { Server, Socket } from 'socket.io';
import { SocketEvents } from '@/shared/constants';
import { Invitation } from '@prisma/generated';

@WebSocketGateway({
  namespace: 'invitations',
  path: '/invitations',
  cors: getCorsConfig(process.env.FRONTEND_URL),
})
export class InvitationsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage(SocketEvents.JOIN_ROOM)
  handleJoinRoom(
    @MessageBody() userId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(userId);
    return {
      status: 'success',
      message: 'Joined room successfully',
    };
  }

  @SubscribeMessage(SocketEvents.LEAVE_ROOM)
  handleLeaveRoom(
    @MessageBody() userId: string,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(userId);
    return {
      status: 'success',
      message: 'Left room successfully',
    };
  }

  sendInvitation(invitation: Invitation) {
    this.server.to(invitation.userId).emit(SocketEvents.INVITATION_SENT, {
      data: invitation,
    });
  }
}
