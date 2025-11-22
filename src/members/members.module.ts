import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { MembersRepository } from '@/members/members.repository';

@Module({
  controllers: [MembersController],
  providers: [MembersService, MembersRepository],
  exports: [MembersRepository],
})
export class MembersModule {}
