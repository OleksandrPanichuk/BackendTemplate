import { TotpService } from '@/auth/two-factor/totp.service';
import { TwoFactorController } from '@/auth/two-factor/two-factor.controller';
import { TwoFactorRepository } from '@/auth/two-factor/two-factor.repository';
import { TwoFactorService } from '@/auth/two-factor/two-factor.service';
import { UsersModule } from '@/users/users.module';
import { HashingModule } from '@app/hashing';
import { SnsModule } from '@app/sns';
import { Module } from '@nestjs/common';

@Module({
  imports: [SnsModule, UsersModule, HashingModule],
  controllers: [TwoFactorController],
  providers: [TotpService, TwoFactorService, TwoFactorRepository],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
