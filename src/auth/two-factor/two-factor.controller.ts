import { RATE_LIMITS } from '@/shared/constants';
import { CurrentUser } from '@/shared/decorators';
import { AuthenticatedGuard } from '@/shared/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  DisableSmsInput,
  DisableTotpInput,
  RegenerateBackupCodesInput,
  SetupSmsInput,
  VerifyBackupCodeInput,
  VerifySmsInput,
  VerifyTotpInput,
} from './dto';
import { TwoFactorService } from './two-factor.service';

@ApiTags('Two-Factor Authentication')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard, ThrottlerGuard)
@Controller('auth/two-factor')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  // ==================== TOTP (Authenticator App) ====================

  @ApiOperation({
    summary: 'Get two-factor authentication status',
    description:
      'Returns the current status of all two-factor authentication methods enabled for the user',
  })
  @ApiOkResponse({
    description: 'Two-factor authentication status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totpEnabled: { type: 'boolean' },
        smsEnabled: { type: 'boolean' },
        phoneVerified: { type: 'boolean' },
        backupCodesCount: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return await this.twoFactorService.getStatus(userId);
  }

  @ApiOperation({
    summary: 'Setup TOTP (Time-based One-Time Password)',
    description:
      'Generates a secret and QR code for setting up TOTP authentication with apps like Google Authenticator or Authy. ' +
      'Returns a QR code as a data URL and the secret key for manual entry.',
  })
  @ApiOkResponse({
    description: 'TOTP setup initiated successfully',
    schema: {
      type: 'object',
      properties: {
        qrCode: { type: 'string', description: 'QR code as data URL' },
        secret: {
          type: 'string',
          description: 'Secret key for manual entry',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.SETUP_TOTP })
  @Post('totp/setup')
  async setupTotp(@CurrentUser('id') userId: string) {
    return await this.twoFactorService.setupTotp(userId);
  }

  @ApiOperation({
    summary: 'Verify and enable TOTP',
    description:
      'Verifies the TOTP token from the authenticator app and enables TOTP authentication. ' +
      'Returns backup codes that should be stored securely by the user.',
  })
  @ApiOkResponse({
    description: 'TOTP verified and enabled successfully',
    schema: {
      type: 'object',
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backup codes for account recovery',
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'TOTP not set up or invalid token' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.VERIFY_TOTP })
  @Post('totp/verify')
  async verifyAndEnableTotp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTotpInput,
  ) {
    return await this.twoFactorService.verifyAndEnableTotp(userId, dto.token);
  }

  @ApiOperation({
    summary: 'Disable TOTP authentication',
    description:
      'Disables TOTP authentication for the user. Requires a valid TOTP token or backup code for verification.',
  })
  @ApiOkResponse({
    description: 'TOTP disabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid code' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.DISABLE_TOTP })
  @HttpCode(HttpStatus.OK)
  @Delete('totp')
  async disableTotp(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableTotpInput,
  ) {
    return await this.twoFactorService.disableTotp(userId, dto.code);
  }

  // ==================== SMS ====================

  @ApiOperation({
    summary: 'Setup SMS two-factor authentication',
    description:
      'Initiates SMS two-factor authentication by sending a verification code to the provided phone number. ' +
      'Phone number must be in E.164 format (e.g., +1234567890).',
  })
  @ApiOkResponse({
    description: 'SMS code sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid phone number format' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.SETUP_SMS })
  @Post('sms/setup')
  async setupSms(
    @CurrentUser('id') userId: string,
    @Body() dto: SetupSmsInput,
  ) {
    return await this.twoFactorService.setupSms(userId, dto.phoneNumber);
  }

  @ApiOperation({
    summary: 'Verify and enable SMS authentication',
    description:
      'Verifies the SMS code and enables SMS two-factor authentication. ' +
      'The code must be the one sent during the setup process.',
  })
  @ApiOkResponse({
    description: 'SMS enabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'SMS not set up, code expired, or invalid code',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.VERIFY_SMS })
  @Post('sms/verify')
  async verifyAndEnableSms(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifySmsInput,
  ) {
    return await this.twoFactorService.verifyAndEnableSms(userId, dto.code);
  }

  @ApiOperation({
    summary: 'Disable SMS authentication',
    description:
      'Disables SMS two-factor authentication for the user. Requires a valid SMS code for verification.',
  })
  @ApiOkResponse({
    description: 'SMS disabled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid SMS code' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.DISABLE_SMS })
  @HttpCode(HttpStatus.OK)
  @Delete('sms')
  async disableSms(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableSmsInput,
  ) {
    return await this.twoFactorService.disableSms(userId, dto.code);
  }

  @ApiOperation({
    summary: 'Resend SMS verification code',
    description:
      'Resends the SMS verification code to the phone number on file. Rate limited to prevent abuse.',
  })
  @ApiOkResponse({
    description: 'SMS code resent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'SMS not set up or phone not verified',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.RESEND_SMS })
  @Post('sms/resend')
  async resendSmsCode(@CurrentUser('id') userId: string) {
    return await this.twoFactorService.resendSmsCode(userId);
  }

  // ==================== Backup Codes ====================

  @ApiOperation({
    summary: 'Verify backup code',
    description:
      'Verifies a backup code. This is typically used during login when the primary 2FA method is unavailable. ' +
      'Each backup code can only be used once.',
  })
  @ApiOkResponse({
    description: 'Backup code verified successfully',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        remainingCodes: { type: 'number' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid backup code or no backup codes available',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.VERIFY_BACKUP })
  @Post('backup-codes/verify')
  async verifyBackupCode(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyBackupCodeInput,
  ) {
    return await this.twoFactorService.verifyBackupCode(userId, dto.code);
  }

  @ApiOperation({
    summary: 'Regenerate backup codes',
    description:
      'Generates new backup codes and invalidates all previous ones. ' +
      'Requires TOTP or SMS verification to prevent unauthorized regeneration.',
  })
  @ApiOkResponse({
    description: 'Backup codes regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'New backup codes',
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'TOTP not enabled' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.TWO_FACTOR.REGENERATE_BACKUP })
  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(
    @CurrentUser('id') userId: string,
    @Body() dto: RegenerateBackupCodesInput,
  ) {
    return await this.twoFactorService.regenerateBackupCodes(userId, dto.token);
  }
}
