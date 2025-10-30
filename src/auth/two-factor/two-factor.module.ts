import { TotpService } from '@/auth/two-factor/totp.service';
import { TwoFactorController } from '@/auth/two-factor/two-factor.controller';
import { TwoFactorRepository } from '@/auth/two-factor/two-factor.repository';
import { TwoFactorService } from '@/auth/two-factor/two-factor.service';
import { UsersModule } from '@/users/users.module';
import { SmsModule } from '@app/sms';
import { Module } from '@nestjs/common';

@Module({
  imports: [SmsModule, UsersModule],
  controllers: [TwoFactorController],
  providers: [TotpService, TwoFactorService, TwoFactorRepository],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
