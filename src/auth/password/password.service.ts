import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ResetPasswordTokenRepository } from '@/auth/password/reset-password-token.repository';
import { UsersRepository } from '@/users/users.repository';
import {
  ResetPasswordInput,
  SendResetPasswordTokenInput,
  VerifyResetPasswordTokenInput,
} from '@/auth/password/dto';
import { randomBytes } from 'node:crypto';
import { Env } from '@/shared/config';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@app/mailer';
import { HashingService } from '@app/hashing';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly RESEND_COOLDOWN_MS = 60_000; // 1 minute
  private readonly MAX_RESEND_ATTEMPTS = 5;

  constructor(
    private readonly resetPasswordTokenRepository: ResetPasswordTokenRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly hashingService: HashingService,
    private readonly config: ConfigService,
  ) {}

  public async sendResetPasswordToken(dto: SendResetPasswordTokenInput) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Password reset attempted for non-existent email: ${dto.email}`,
      );
      await this.simulateDelay();
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const existingToken = await this.resetPasswordTokenRepository.findByUserId(
      user.id,
    );

    if (existingToken) {
      const now = Date.now();
      const tokenAge = now - existingToken.createdAt.getTime();
      const isExpired = now > existingToken.expiresAt.getTime();

      if (!isExpired && tokenAge < this.RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (this.RESEND_COOLDOWN_MS - tokenAge) / 1000,
        );
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new token`,
        );
      }

      if (existingToken.resendCount >= this.MAX_RESEND_ATTEMPTS) {
        throw new BadRequestException(
          'Maximum resend attempts reached. Please try again later',
        );
      }

      if (!isExpired) {
        await this.resetPasswordTokenRepository.incrementResendCount(
          existingToken.id,
        );

        const clientUrl = this.config.get<string>(Env.FRONTEND_URL);
        const link = `${clientUrl}/reset-password?token=${existingToken.token}`;
        const expiresInMinutes = Math.ceil(
          (existingToken.expiresAt.getTime() - now) / 60000,
        );

        await this.mailerService.sendPasswordResetEmail(
          user.email,
          link,
          user.username,
          expiresInMinutes,
        );

        return { message: 'If the email exists, a reset link has been sent' };
      }

      await this.resetPasswordTokenRepository.deleteByUserId(user.id);
    }

    const token = this.generateToken();
    const tokenHash = await this.hashingService.hash(token);

    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRATION_MS);
    const expiresInMinutes = Math.floor(this.TOKEN_EXPIRATION_MS / 60000);

    await this.resetPasswordTokenRepository.create({
      userId: user.id,
      expiresAt,
      token: tokenHash,
    });

    const clientUrl = this.config.get<string>(Env.FRONTEND_URL);
    const link = `${clientUrl}/reset-password?token=${token}`;

    await this.mailerService.sendPasswordResetEmail(
      user.email,
      link,
      user.username,
      expiresInMinutes,
    );

    return { message: 'If the email exists, a reset link has been sent' };
  }

  public async verifyToken(dto: VerifyResetPasswordTokenInput) {
    const tokenHash = await this.hashingService.hash(dto.token);
    const token =
      await this.resetPasswordTokenRepository.findByToken(tokenHash);

    if (!token || token.consumedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (Date.now() > token.expiresAt.getTime()) {
      throw new BadRequestException('Invalid or expired token');
    }

    return { valid: true };
  }

  public async resetPassword(dto: ResetPasswordInput) {
    const tokenHash = await this.hashingService.hash(dto.token);
    const token =
      await this.resetPasswordTokenRepository.findByToken(tokenHash);

    if (!token || token.consumedAt) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (Date.now() > token.expiresAt.getTime()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    await this.usersRepository.updatePassword(token.userId, passwordHash);

    await this.resetPasswordTokenRepository.markAsConsumed(token.id);

    this.logger.log(`Password reset successful for user: ${token.userId}`);

    return { message: 'Password reset successfully' };
  }

  public async cleanupExpiredTokens() {
    const result =
      await this.resetPasswordTokenRepository.deleteExpiredTokens();
    this.logger.log(`Cleaned up ${result.count} expired reset tokens`);
    return result.count;
  }

  private generateToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  private async simulateDelay(): Promise<void> {
    const delay = 100 + Math.random() * 200;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
