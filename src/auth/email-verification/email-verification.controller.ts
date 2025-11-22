import { RATE_LIMITS } from '@/shared/constants';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Session,
  UseGuards,
} from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SafeUser } from '@/users/interfaces';
import { CurrentUser } from '@/shared/decorators';
import { AuthenticatedGuard } from '@/shared/guards';
import { VerifyEmailInput } from '@/auth/email-verification/dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TSession } from '@/auth/auth.types';
import { updateSession } from '@/shared/utils';

@ApiTags('Email Verification')
@ApiUnauthorizedResponse({
  description: 'Unauthorized - User must be authenticated',
})
@UseGuards(ThrottlerGuard, AuthenticatedGuard)
@Controller('/auth/verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @ApiOperation({
    summary: 'Send verification code to user email',
    description:
      "Sends a 6-digit verification code to the authenticated user's email address. " +
      'The code is valid for 15 minutes. Maximum 5 resend attempts are allowed per code. ' +
      'A cooldown period of 1 minute is enforced between resend requests.',
  })
  @ApiOkResponse({
    description: 'Verification code sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Verification code sent successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Email already verified | Too many resend attempts | Please wait before requesting a new code | Failed to send email',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - Rate limit exceeded',
  })
  @Throttle({ default: RATE_LIMITS.EMAIL_VERIFICATION.SEND_CODE })
  @Post('/code')
  @HttpCode(HttpStatus.OK)
  async sendVerificationCode(
    @CurrentUser() user: SafeUser,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.sendVerificationCode(user);
    return { message: 'Verification code sent successfully' };
  }

  @ApiOperation({
    summary: 'Verify user email with verification code',
    description:
      "Verifies the authenticated user's email address using the 6-digit code sent to their email. " +
      'The code must be valid and not expired (valid for 15 minutes). ' +
      'Once verified, the code is marked as consumed and cannot be reused.',
  })
  @ApiBody({ type: VerifyEmailInput })
  @ApiOkResponse({
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Email already verified | Invalid or expired verification code | Code already used',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - Rate limit exceeded',
  })
  @Throttle({ default: RATE_LIMITS.EMAIL_VERIFICATION.VERIFY })
  @Post('/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailInput,
    @CurrentUser() user: SafeUser,
    @Session() session: TSession,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.verifyEmail(dto, user);
    await updateSession(session, { passport: { verified: true } });
    return { message: 'Email verified successfully' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  cleanupExpiredCodes() {
    return this.emailVerificationService.cleanupExpiredCodes();
  }
}
