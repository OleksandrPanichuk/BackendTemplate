import { DoubleCsrfConfigOptions } from 'csrf-csrf';
import { CSRF_COOKIE_MAX_AGE, CSRF_COOKIE_NAME } from '@/shared/constants';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/shared/config/env.config';
import { randomBytes } from 'node:crypto';

export function getCsrfConfig(config: ConfigService): DoubleCsrfConfigOptions {
  return {
    cookieName: CSRF_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: config.get(Env.NODE_ENV) === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: CSRF_COOKIE_MAX_AGE,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
    getSecret: () => randomBytes(32).toString('hex'),
    getSessionIdentifier: (req) => req.session.id || req.sessionID,
  };
}
