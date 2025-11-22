import { RATE_LIMITS } from '@/shared/constants';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ResetPasswordInput,
  SendResetPasswordTokenInput,
  VerifyResetPasswordTokenInput,
} from './dto';
import { PasswordService } from './password.service';

@ApiTags('Password')
@UseGuards(ThrottlerGuard)
@Controller('/auth/password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @ApiOperation({ summary: 'Send password reset token to user email' })
  @ApiBody({ type: SendResetPasswordTokenInput })
  @ApiCreatedResponse({
    description: 'Reset password token sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If the email exists, a reset link has been sent',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email address or too many requests',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.PASSWORD.SEND_TOKEN })
  @Post('send-token')
  @HttpCode(HttpStatus.CREATED)
  public sendResetPasswordToken(@Body() dto: SendResetPasswordTokenInput) {
    return this.passwordService.sendResetPasswordToken(dto);
  }

  @ApiOperation({ summary: 'Reset user password using a valid token' })
  @ApiBody({ type: ResetPasswordInput })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token, or weak password',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.PASSWORD.RESET })
  @Patch('reset')
  @HttpCode(HttpStatus.OK)
  public resetPassword(@Body() dto: ResetPasswordInput) {
    return this.passwordService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Verify if a reset password token is valid' })
  @ApiBody({ type: VerifyResetPasswordTokenInput })
  @ApiOkResponse({
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  @Throttle({ default: RATE_LIMITS.PASSWORD.VERIFY_TOKEN })
  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  public verifyToken(@Body() dto: VerifyResetPasswordTokenInput) {
    return this.passwordService.verifyToken(dto);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  cleanupExpiredTokens() {
    return this.passwordService.cleanupExpiredTokens();
  }
}
