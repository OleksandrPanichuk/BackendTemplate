import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/shared/constants';

import { Env } from '@/shared/config/env.config';
import { RedisService } from '@app/redis';
import { ConfigService } from '@nestjs/config';
import { RedisStore } from 'connect-redis';
import { SessionOptions } from 'express-session';

/**
 * Configures Express session with secure settings for production use.
 *
 * Security Features:
 * - Redis-backed session storage for scalability and persistence
 * - HTTP-only cookies to prevent XSS attacks
 * - Secure flag in production (HTTPS only)
 * - SameSite=Strict to prevent CSRF attacks
 * - Long secret key for session signing
 * - Session regeneration on login/privilege changes (implement in auth flow)
 *
 * @param {ConfigService} config - NestJS configuration service
 * @param {RedisService} redis - Redis client for session storage
 * @returns {SessionOptions} Express session configuration
 */
export function getSessionConfig(
  config: ConfigService,
  redis: RedisService,
): SessionOptions {
  const isProduction = config.get<string>(Env.NODE_ENV) === 'production';

  return {
    secret: config.get<string>(Env.SESSION_SECRET)!,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
      maxAge: SESSION_MAX_AGE, // Session duration
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevents client-side JavaScript access
      sameSite: 'strict', // Strict CSRF protection
    },
    name: SESSION_COOKIE_NAME, // Custom session cookie name
    store: new RedisStore({
      client: redis,
      prefix: 'sess:', // Redis key prefix for sessions
      ttl: SESSION_MAX_AGE / 1000, // Redis TTL in seconds
    }),
    rolling: true, // Reset cookie maxAge on every response (sliding expiration)
  };
}
