import { TOAuthUser, TSession } from '@/auth/auth.types';
import { SignInInput, SignUpInput, Verify2FAInput } from '@/auth/dto';
import {
  GithubOAuthGuard,
  GoogleOAuthGuard,
  LocalAuthGuard,
} from '@/auth/guards';
import { AuthenticatedGuard } from '@/shared/guards';
import { destroySession, updateSession } from '@/shared/utils/session.utils';
import { UserEntity } from '@/users/user.entity';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';

import { Env } from '@/shared/config';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@ApiTags('Auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a new user account with email, password, and username. ' +
      'Password must contain at least 8 characters including uppercase, lowercase, numbers, and symbols. ' +
      'Username must be 3-255 characters and can only contain letters, numbers, and underscores. ' +
      'Email must be unique and valid. After registration, the user is automatically signed in.',
  })
  @ApiBody({ type: SignUpInput })
  @ApiCreatedResponse({
    description: 'User account created successfully and user is signed in',
    type: UserEntity,
  })
  @ApiConflictResponse({
    description: 'Username or email already exists in the system',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input data - check email format, password strength, or username format',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Too many requests - Rate limit exceeded (5 requests per minute)',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpInput,
    @Session() session: TSession,
  ): Promise<UserEntity> {
    const user = await this.authService.signUp(dto);
    await updateSession(session, {
      passport: { user: user.id, verified: user.emailVerified },
    });
    return user;
  }

  @ApiOperation({
    summary: 'Sign in with email and password',
    description:
      'Authenticates a user using email and password credentials. ' +
      'If 2FA is enabled, returns requires2FA flag and does not create session yet. ' +
      'Account will be locked after 5 failed login attempts for 15 minutes.',
  })
  @ApiBody({ type: SignInInput })
  @ApiOkResponse({
    description: 'User authenticated successfully. Check requires2FA flag.',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            emailVerified: { type: 'boolean' },
          },
        },
        {
          type: 'object',
          properties: {
            requires2FA: { type: 'boolean' },
            userId: { type: 'string' },
            message: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or password',
  })
  @ApiForbiddenResponse({
    description: 'Account locked due to too many failed login attempts',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Too many requests - Rate limit exceeded (5 requests per minute)',
  })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(
    @Req() req: Request,
    @Session() session: TSession,
  ): Promise<
    UserEntity | { requires2FA: boolean; userId: string; message: string }
  > {
    if (!req.user) throw new Error('User not found');

    const user = new UserEntity(req.user) as UserEntity & {
      requires2FA?: boolean;
    };

    // Check if 2FA is required
    if (user.requires2FA) {
      // Store the userId in session temporarily for 2FA verification
      await updateSession(session, {
        pending2FA: { userId: user.id, timestamp: Date.now() },
      });

      return {
        requires2FA: true,
        userId: user.id,
        message:
          'Two-factor authentication required. Please verify using /auth/verify-2fa',
      };
    }

    await updateSession(session, {
      passport: { user: user.id, verified: user.emailVerified },
    });

    return user;
  }

  @ApiOperation({
    summary: 'Sign out current user',
    description:
      'Destroys the current user session and signs out the authenticated user. ' +
      'Requires an active authenticated session.',
  })
  @ApiOkResponse({
    description: 'User signed out successfully and session destroyed',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated - No active session found',
  })
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  @Get('sign-out')
  async signOut(@Session() session: TSession) {
    try {
      await destroySession(session);
    } catch (err) {
      this.logger.error('Error destroying session', err);
      throw err;
    }
  }

  @ApiOperation({
    summary: 'Initiate Google OAuth2 authentication',
    description:
      'Starts the Google OAuth2 authentication flow. ' +
      "Redirects the user to Google's sign-in page. " +
      'After successful authentication, Google redirects to the callback endpoint.',
  })
  @ApiOkResponse({
    description: 'Redirects to Google OAuth2 sign-in page',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - Rate limit exceeded',
  })
  @UseGuards(GoogleOAuthGuard)
  @Get('sign-in/google')
  signInGoogle() {}

  @ApiOperation({
    summary: 'Google OAuth2 callback handler',
    description:
      'Handles the callback from Google OAuth2 authentication. ' +
      'Creates or updates user account based on Google profile data. ' +
      'Creates a session and redirects to the frontend application.',
  })
  @ApiOkResponse({
    description:
      'Authentication successful - Redirects to frontend application',
  })
  @ApiBadRequestResponse({
    description: 'Invalid OAuth2 data received from Google',
  })
  @Get('callback/google')
  @UseGuards(GoogleOAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Session() session: TSession,
    @Res() res: Response,
  ) {
    const user = await this.authService.oauthSignIn(req?.user as TOAuthUser);
    await updateSession(session, {
      passport: { user: user.id, verified: user.emailVerified },
    });
    return res.redirect(this.config.get<string>(Env.FRONTEND_URL)!);
  }

  @ApiOperation({
    summary: 'Initiate GitHub OAuth2 authentication',
    description:
      'Starts the GitHub OAuth2 authentication flow. ' +
      "Redirects the user to GitHub's sign-in page. " +
      'After successful authentication, GitHub redirects to the callback endpoint.',
  })
  @ApiOkResponse({
    description: 'Redirects to GitHub OAuth2 sign-in page',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - Rate limit exceeded',
  })
  @UseGuards(GithubOAuthGuard)
  @Get('sign-in/github')
  signInGithub() {}

  @ApiOperation({
    summary: 'GitHub OAuth2 callback handler',
    description:
      'Handles the callback from GitHub OAuth2 authentication. ' +
      'Creates or updates user account based on GitHub profile data. ' +
      'Creates a session and redirects to the frontend application.',
  })
  @ApiOkResponse({
    description:
      'Authentication successful - Redirects to frontend application',
  })
  @ApiBadRequestResponse({
    description: 'Invalid OAuth2 data received from GitHub',
  })
  @Get('callback/github')
  @UseGuards(GithubOAuthGuard)
  async githubCallback(
    @Req() req: Request,
    @Session() session: TSession,
    @Res() res: Response,
  ) {
    const user = await this.authService.oauthSignIn(req?.user as TOAuthUser);
    await updateSession(session, {
      passport: { user: user.id, verified: user.emailVerified },
    });
    return res.redirect(this.config.get<string>(Env.FRONTEND_URL)!);
  }

  @ApiOperation({
    summary: 'Verify 2FA code and complete sign-in',
    description:
      'Verifies the 2FA code and completes the sign-in process. ' +
      'Must be called after receiving requires2FA from sign-in endpoint. ' +
      'Supports TOTP, SMS, and backup code verification.',
  })
  @ApiBody({ type: Verify2FAInput })
  @ApiOkResponse({
    description: '2FA verified successfully and session created',
    type: UserEntity,
  })
  @ApiBadRequestResponse({
    description: 'Invalid 2FA code or no pending 2FA verification',
  })
  @ApiUnauthorizedResponse({
    description: '2FA verification session expired',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - Rate limit exceeded',
  })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-2fa')
  async verify2FA(
    @Body() dto: Verify2FAInput,
    @Session() session: TSession,
  ): Promise<UserEntity> {
    // Check if there's a pending 2FA verification
    const pending2FA = session.pending2FA;
    if (!pending2FA || !pending2FA.userId) {
      throw new Error('No pending 2FA verification');
    }

    // Check if the session hasn't expired (5 minutes)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - pending2FA.timestamp > fiveMinutes) {
      // Clear the pending 2FA session
      delete session.pending2FA;
      throw new Error(
        '2FA verification session expired. Please sign in again.',
      );
    }

    // Verify the 2FA code
    const user = await this.authService.verify2FA(
      pending2FA.userId,
      dto.method,
      dto.code,
    );

    // Clear the pending 2FA session and create actual session
    delete session.pending2FA;
    await updateSession(session, {
      passport: { user: user.id, verified: user.emailVerified },
    });

    return user;
  }
}
