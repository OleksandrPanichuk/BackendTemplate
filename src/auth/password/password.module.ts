import { ResetPasswordTokenRepository } from '@/auth/password/reset-password-token.repository';
import { UsersModule } from '@/users/users.module';
import { HashingModule } from '@app/hashing';
import { MailerModule } from '@app/mailer';
import { Module } from '@nestjs/common';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';

@Module({
  imports: [MailerModule, UsersModule, HashingModule],
  controllers: [PasswordController],
  providers: [PasswordService, ResetPasswordTokenRepository],
})
export class PasswordModule {}
