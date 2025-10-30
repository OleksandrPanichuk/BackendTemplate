import { Trim } from '@/shared/decorators/transformer.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export enum TwoFactorMethod {
  TOTP = 'totp',
  SMS = 'sms',
  BACKUP_CODE = 'backup_code',
}

export class Verify2FAInput {
  @ApiProperty({
    description: '2FA method to use for verification',
    enum: TwoFactorMethod,
    example: TwoFactorMethod.TOTP,
  })
  @IsEnum(TwoFactorMethod)
  readonly method: TwoFactorMethod;

  @ApiProperty({
    description:
      'The 2FA code (6 digits for TOTP/SMS, 8 characters for backup code)',
    example: '123456',
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z]{6,8}$/, {
    message: 'Code must be 6-8 alphanumeric characters',
  })
  readonly code: string;
}
