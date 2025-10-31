import { SessionSerializer } from '@/auth/serializers';
import { TwoFactorModule } from '@/auth/two-factor/two-factor.module';
import { UsersModule } from '@/users/users.module';
import { HashingModule } from '@app/hashing';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { PasswordModule } from './password/password.module';
import { GithubStrategy, GoogleStrategy, LocalStrategy } from './strategy';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionSerializer,
    GithubStrategy,
    GoogleStrategy,
    LocalStrategy,
  ],
  imports: [
    EmailVerificationModule,
    PasswordModule,
    UsersModule,
    TwoFactorModule,
    HashingModule,
  ],
})
export class AuthModule {}
