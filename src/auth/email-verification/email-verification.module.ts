import { UsersModule } from '@/users/users.module';
import { HashingModule } from '@app/hashing';
import { MailerModule } from '@app/mailer';
import { Module } from '@nestjs/common';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';
import { VerificationCodeRepository } from './verification-code.repository';

@Module({
  imports: [MailerModule, UsersModule, HashingModule],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService, VerificationCodeRepository],
})
export class EmailVerificationModule {}
