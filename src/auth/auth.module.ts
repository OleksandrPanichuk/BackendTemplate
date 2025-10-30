import { SessionSerializer } from '@/auth/serializers';
import { UsersModule } from '@/users/users.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { PasswordModule } from './password/password.module';
import { GithubStrategy, GoogleStrategy, LocalStrategy } from './strategy';
import { TwoFactorModule } from '@/auth/two-factor/two-factor.module';

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
  ],
})
export class AuthModule {}
