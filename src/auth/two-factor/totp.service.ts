import { Env } from '@/shared/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  constructor(private readonly config: ConfigService) {
    // Configure otplib for better security
    authenticator.options = {
      window: 1, // Allow 1 step before and after current time
      step: 30, // 30 second time step (standard)
    };
  }

  public generateSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = authenticator.generateSecret();
    const appName = this.config.get<string>(Env.APP_NAME)!;
    const otpauthUrl = authenticator.keyuri(email, appName, secret);

    return {
      secret,
      otpauthUrl,
    };
  }

  public async generateQRCode(otpauthUrl: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
  }

  public verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({
        token,
        secret,
      });
    } catch {
      return false;
    }
  }

  public generateBackupCodes(count: number = 10): string[] {
    return Array.from({ length: count }, () => {
      // Generate cryptographically secure random backup codes
      return crypto.randomBytes(4).toString('hex').toUpperCase();
    });
  }
}
