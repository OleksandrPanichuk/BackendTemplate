import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { PasswordController } from './password.controller';
import { ResetPasswordTokenRepository } from '@/auth/password/reset-password-token.repository';
import { MailerModule } from '@app/mailer';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [MailerModule, UsersModule],
  controllers: [PasswordController],
  providers: [PasswordService, ResetPasswordTokenRepository],
})
export class PasswordModule {}
