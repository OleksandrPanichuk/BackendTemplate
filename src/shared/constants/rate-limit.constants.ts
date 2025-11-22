export const RATE_LIMITS = {
  GLOBAL: { ttl: 60_000, limit: 10 },
  AUTH: {
    CONTROLLER: { ttl: 60_000, limit: 5 },
    VERIFY_2FA: { ttl: 60_000, limit: 10 },
  },
  PASSWORD: {
    SEND_TOKEN: { ttl: 60_000, limit: 3 },
    RESET: { ttl: 60_000, limit: 5 },
    VERIFY_TOKEN: { ttl: 60_000, limit: 10 },
  },
  TWO_FACTOR: {
    SETUP_TOTP: { ttl: 60_000, limit: 3 },
    VERIFY_TOTP: { ttl: 60_000, limit: 10 },
    DISABLE_TOTP: { ttl: 60_000, limit: 5 },
    SETUP_SMS: { ttl: 60_000, limit: 3 },
    VERIFY_SMS: { ttl: 60_000, limit: 10 },
    DISABLE_SMS: { ttl: 60_000, limit: 5 },
    RESEND_SMS: { ttl: 60_000, limit: 2 },
    VERIFY_BACKUP: { ttl: 60_000, limit: 10 },
    REGENERATE_BACKUP: { ttl: 300_000, limit: 3 },
  },
  EMAIL_VERIFICATION: {
    SEND_CODE: { ttl: 60_000, limit: 3 },
    VERIFY: { ttl: 60_000, limit: 5 },
  },
} as const;

export type RateLimitConfig = typeof RATE_LIMITS;
