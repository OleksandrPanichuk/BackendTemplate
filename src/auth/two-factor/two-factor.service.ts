import { TotpService } from '@/auth/two-factor/totp.service';
import { TwoFactorRepository } from '@/auth/two-factor/two-factor.repository';
import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SnsService } from 'libs/sns/src';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly SMS_EXPIRATION_TIME = 10 * 60 * 1000;

  constructor(
    private readonly totpService: TotpService,
    private readonly hashingService: HashingService,
    private readonly snsService: SnsService,
    private readonly usersRepository: UsersRepository,
    private readonly twoFactorRepository: TwoFactorRepository,
  ) {}

  public async getStatus(userId: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth) {
      return {
        totpEnabled: false,
        smsEnabled: false,
        phoneVerified: false,
        backupCodesCount: 0,
      };
    }

    return {
      totpEnabled: twoFactorAuth.totpEnabled,
      smsEnabled: twoFactorAuth.smsEnabled,
      phoneVerified: twoFactorAuth.phoneVerified,
      backupCodesCount: twoFactorAuth.backupCodes?.length || 0,
    };
  }

  public async setupTotp(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { secret, otpauthUrl } = this.totpService.generateSecret(user.email);

    const qrCode = await this.totpService.generateQRCode(otpauthUrl);

    await this.twoFactorRepository.upsert(userId, {
      create: { totpEnabled: false, totpSecret: secret },
      update: { totpEnabled: false, totpSecret: secret },
    });

    this.logger.log(`TOTP setup initiated for user: ${userId}`);
    return { qrCode, secret };
  }

  public async verifyAndEnableTotp(userId: string, token: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth?.totpSecret) {
      throw new BadRequestException('TOTP not set up');
    }

    const isValid = this.totpService.verifyToken(
      twoFactorAuth.totpSecret,
      token,
    );

    if (!isValid) {
      this.logger.warn(`Invalid TOTP token for user: ${userId}`);
      throw new UnauthorizedException('Invalid TOTP token');
    }

    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashingService.hash(code)),
    );

    await this.twoFactorRepository.update(userId, {
      totpEnabled: true,
      totpVerified: true,
      backupCodes: hashedBackupCodes,
    });

    this.logger.log(`TOTP enabled for user: ${userId}`);
    return {
      backupCodes,
      message: 'TOTP enabled successfully',
    };
  }

  public async disableTotp(userId: string, code: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth?.totpEnabled) {
      throw new BadRequestException('TOTP not enabled');
    }

    let isValid = false;

    if (code.length === 6 && twoFactorAuth.totpSecret) {
      isValid = this.totpService.verifyToken(twoFactorAuth.totpSecret, code);
    }

    if (!isValid && code.length === 8) {
      isValid = await this.verifyBackupCodeInternal(
        userId,
        code,
        twoFactorAuth.backupCodes,
      );
    }

    if (!isValid) {
      this.logger.warn(`Failed TOTP disable attempt for user: ${userId}`);
      throw new UnauthorizedException('Invalid code');
    }

    await this.twoFactorRepository.update(userId, {
      totpEnabled: false,
      totpVerified: false,
      totpSecret: null,
      backupCodes: [],
    });

    this.logger.log(`TOTP disabled for user: ${userId}`);
    return { message: 'TOTP disabled successfully' };
  }

  public async setupSms(userId: string, phoneNumber: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await this.snsService.send(
        phoneNumber,
        `Your verification code is: ${code}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}: ${error}`);
      throw new BadRequestException('Failed to send SMS code');
    }

    const expiresAt = new Date(Date.now() + this.SMS_EXPIRATION_TIME);

    await this.twoFactorRepository.upsert(userId, {
      create: {
        phoneNumber,
        smsCode: code,
        smsCodeExpiresAt: expiresAt,
        smsEnabled: false,
        phoneVerified: false,
      },
      update: {
        phoneNumber,
        smsCode: code,
        smsCodeExpiresAt: expiresAt,
      },
    });

    this.logger.log(`SMS code sent to user: ${userId}`);

    return { message: 'SMS code sent' };
  }

  public async verifyAndEnableSms(userId: string, code: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth?.smsCode || !twoFactorAuth?.smsCodeExpiresAt) {
      throw new BadRequestException('SMS not set up');
    }

    if (new Date() > twoFactorAuth.smsCodeExpiresAt) {
      this.logger.warn(`Expired SMS code for user: ${userId}`);
      throw new BadRequestException('SMS code has expired');
    }

    if (twoFactorAuth.smsCode !== code) {
      this.logger.warn(`Invalid SMS code for user: ${userId}`);
      throw new BadRequestException('Invalid SMS code');
    }

    await this.twoFactorRepository.update(userId, {
      smsEnabled: true,
      phoneVerified: true,
      smsCode: null,
      smsCodeExpiresAt: null,
    });

    this.logger.log(`SMS enabled for user: ${userId}`);
    return { message: 'SMS enabled successfully' };
  }

  public async disableSms(userId: string, code: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth?.smsEnabled) {
      throw new BadRequestException('SMS not enabled');
    }

    if (!twoFactorAuth.smsCode || !twoFactorAuth.smsCodeExpiresAt) {
      if (!twoFactorAuth.phoneNumber) {
        throw new BadRequestException('Phone number not found');
      }

      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      await this.snsService.send(
        twoFactorAuth.phoneNumber,
        `Your verification code is: ${verificationCode}`,
      );

      const expiresAt = new Date(Date.now() + this.SMS_EXPIRATION_TIME);

      await this.twoFactorRepository.update(userId, {
        smsCode: verificationCode,
        smsCodeExpiresAt: expiresAt,
      });

      throw new BadRequestException(
        'Verification code sent. Please provide the code to disable SMS.',
      );
    }

    if (new Date() > twoFactorAuth.smsCodeExpiresAt) {
      throw new BadRequestException('SMS code has expired');
    }

    if (twoFactorAuth.smsCode !== code) {
      this.logger.warn(`Failed SMS disable attempt for user: ${userId}`);
      throw new UnauthorizedException('Invalid SMS code');
    }

    await this.twoFactorRepository.update(userId, {
      smsEnabled: false,
      phoneVerified: false,
      phoneNumber: null,
      smsCode: null,
      smsCodeExpiresAt: null,
    });

    this.logger.log(`SMS disabled for user: ${userId}`);
    return { message: 'SMS disabled successfully' };
  }

  public async resendSmsCode(userId: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);

    if (!twoFactorAuth?.phoneNumber) {
      throw new BadRequestException('Phone number not set up');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await this.snsService.send(
        twoFactorAuth.phoneNumber,
        `Your verification code is: ${code}`,
      );
    } catch (error) {
      this.logger.error(`Failed to resend SMS to user ${userId}: ${error}`);
      throw new BadRequestException('Failed to send SMS code');
    }

    const expiresAt = new Date(Date.now() + this.SMS_EXPIRATION_TIME);

    await this.twoFactorRepository.update(userId, {
      smsCode: code,
      smsCodeExpiresAt: expiresAt,
    });

    this.logger.log(`SMS code resent to user: ${userId}`);
    return { message: 'SMS code resent' };
  }

  public async verifyBackupCode(userId: string, code: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactorAuth?.backupCodes || twoFactorAuth.backupCodes.length === 0) {
      throw new BadRequestException('No backup codes available');
    }
    const isValid = await this.verifyBackupCodeInternal(
      userId,
      code,
      twoFactorAuth.backupCodes,
    );
    if (!isValid) {
      this.logger.warn(`Invalid backup code for user: ${userId}`);
      throw new UnauthorizedException('Invalid backup code');
    }
    this.logger.log(`Backup code used for user: ${userId}`);
    return { valid: true, remainingCodes: twoFactorAuth.backupCodes.length };
  }

  private async verifyBackupCodeInternal(
    userId: string,
    code: string,
    backupCodes: string[],
  ): Promise<boolean> {
    for (let i = 0; i < backupCodes.length; i++) {
      const isMatch = await this.hashingService.verify(backupCodes[i], code);
      if (isMatch) {
        const updatedBackupCodes = backupCodes.filter(
          (_, index) => index !== i,
        );
        await this.twoFactorRepository.update(userId, {
          backupCodes: updatedBackupCodes,
        });
        return true;
      }
    }
    return false;
  }

  public async regenerateBackupCodes(userId: string, totpToken: string) {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactorAuth?.totpEnabled || !twoFactorAuth.totpSecret) {
      throw new BadRequestException('TOTP not enabled');
    }
    const isValid = this.totpService.verifyToken(
      twoFactorAuth.totpSecret,
      totpToken,
    );
    if (!isValid) {
      this.logger.warn(
        `Invalid TOTP token for backup code regeneration: ${userId}`,
      );
      throw new UnauthorizedException('Invalid TOTP token');
    }
    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.hashingService.hash(code)),
    );
    await this.twoFactorRepository.update(userId, {
      backupCodes: hashedBackupCodes,
    });
    this.logger.log(`Backup codes regenerated for user: ${userId}`);
    return {
      backupCodes,
      message: 'Backup codes regenerated successfully',
    };
  }

  public async verify2FA(
    userId: string,
    code: string,
    method: 'totp' | 'sms' | 'backup',
  ): Promise<boolean> {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactorAuth) {
      return false;
    }
    try {
      switch (method) {
        case 'totp':
          if (!twoFactorAuth.totpEnabled || !twoFactorAuth.totpSecret) {
            return false;
          }
          return this.totpService.verifyToken(twoFactorAuth.totpSecret, code);
        case 'sms':
          if (
            !twoFactorAuth.smsEnabled ||
            !twoFactorAuth.smsCode ||
            !twoFactorAuth.smsCodeExpiresAt
          ) {
            return false;
          }
          if (new Date() > twoFactorAuth.smsCodeExpiresAt) {
            return false;
          }
          if (twoFactorAuth.smsCode === code) {
            await this.twoFactorRepository.update(userId, {
              smsCode: null,
              smsCodeExpiresAt: null,
              lastUsedAt: new Date(),
            });
            return true;
          }
          return false;
        case 'backup':
          if (
            !twoFactorAuth.backupCodes ||
            twoFactorAuth.backupCodes.length === 0
          ) {
            return false;
          }
          return await this.verifyBackupCodeInternal(
            userId,
            code,
            twoFactorAuth.backupCodes,
          );
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`2FA verification error for user ${userId}: ${error}`);
      return false;
    }
  }

  public async has2FAEnabled(userId: string): Promise<boolean> {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactorAuth) {
      return false;
    }
    return twoFactorAuth.totpEnabled || twoFactorAuth.smsEnabled;
  }

  public async send2FACode(userId: string): Promise<void> {
    const twoFactorAuth = await this.twoFactorRepository.findByUserId(userId);
    if (!twoFactorAuth?.smsEnabled || !twoFactorAuth.phoneNumber) {
      throw new BadRequestException('SMS 2FA not enabled');
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.SMS_EXPIRATION_TIME);
    try {
      await this.snsService.send(
        twoFactorAuth.phoneNumber,
        `Your verification code is: ${code}`,
      );
      await this.twoFactorRepository.update(userId, {
        smsCode: code,
        smsCodeExpiresAt: expiresAt,
      });
      this.logger.log(`2FA SMS code sent to user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send 2FA SMS to user ${userId}: ${error}`);
      throw new BadRequestException('Failed to send SMS code');
    }
  }
}
