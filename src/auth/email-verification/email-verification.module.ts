import { MailerModule } from '@app/mailer';
import { Module } from '@nestjs/common';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';
import { VerificationCodeRepository } from './verification-code.repository';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [MailerModule, UsersModule],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService, VerificationCodeRepository],
})
export class EmailVerificationModule {}
