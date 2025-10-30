import { UserEntity } from '@/users/user.entity';
import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import { MailerService } from '@app/mailer';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { VerifyEmailInput } from './dto';
import { VerificationCodeRepository } from './verification-code.repository';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly RESEND_COOLDOWN_MS = 60_000; // 1 minute
  private readonly MAX_RESEND_ATTEMPTS = 5;

  constructor(
    private readonly verificationCodeRepository: VerificationCodeRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly hashingService: HashingService,
  ) {}

  public async sendVerificationCode(user: UserEntity): Promise<void> {
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const existingCode = await this.verificationCodeRepository.findByUserId(
      user.id,
    );

    if (existingCode) {
      if (existingCode.resendCount >= this.MAX_RESEND_ATTEMPTS) {
        this.logger.warn(`Maximum resend attempts reached for user ${user.id}`);
        throw new BadRequestException(
          'Maximum resend attempts reached. Please try again later.',
        );
      }

      const timeSinceCreation = Date.now() - existingCode.createdAt.getTime();
      if (timeSinceCreation < this.RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil(
          (this.RESEND_COOLDOWN_MS - timeSinceCreation) / 1000,
        );
        this.logger.warn(`Resend cooldown active for user ${user.id}`);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        );
      }
    }

    const plainCode = this.generateVerificationCode();
    const hashedCode = await this.hashingService.hash(plainCode);
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRATION_MS);

    if (existingCode) {
      await this.verificationCodeRepository.update(user.id, {
        code: hashedCode,
        expiresAt,
        resendCount: existingCode.resendCount + 1,
      });
    } else {
      await this.verificationCodeRepository.create({
        code: hashedCode,
        userId: user.id,
        expiresAt,
        resendCount: 0,
      });
    }

    try {
      await this.mailerService.sendEmailVerification(
        user.email,
        user.firstName || user.username,
        plainCode,
        Math.floor(this.CODE_EXPIRATION_MS / 60000),
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to user ${user.id}`,
        error,
      );
      await this.verificationCodeRepository.deleteByUserId(user.id);
      throw new BadRequestException('Failed to send email verification');
    }

    this.logger.log(`Verification code sent to user ${user.id}`);
  }

  public async verifyEmail(
    dto: VerifyEmailInput,
    user: UserEntity,
  ): Promise<void> {
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const code = await this.verificationCodeRepository.findByUserId(user.id);

    if (!code) {
      throw new BadRequestException(
        'No valid verification code found. Please request a new one.',
      );
    }

    if (code.expiresAt < new Date()) {
      await this.verificationCodeRepository.deleteByUserId(user.id);
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    const isValid = await this.hashingService.verify(code.code, dto.code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.usersRepository.updateVerificationStatus(user.id);
    await this.verificationCodeRepository.deleteByUserId(user.id);

    this.logger.log(`Email verified for user: ${user.id}`);
  }

  public async cleanupExpiredCodes(): Promise<number> {
    const result = await this.verificationCodeRepository.deleteExpiredCodes();
    this.logger.log(`Cleaned up ${result.count} expired verification codes`);
    return result.count;
  }

  private generateVerificationCode(): string {
    const min = Math.pow(10, this.CODE_LENGTH - 1);
    const max = Math.pow(10, this.CODE_LENGTH) - 1;
    return randomInt(min, max).toString();
  }
}
