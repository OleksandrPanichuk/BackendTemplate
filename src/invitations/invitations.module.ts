import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsGateway } from '@/invitations/invitations.gateway';
import { InvitationsRepository } from '@/invitations/invitations.repository';
import { UsersModule } from '@/users';
import { MembersModule } from '@/members';

@Module({
  imports: [UsersModule, MembersModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsGateway, InvitationsRepository],
})
export class InvitationsModule {}
