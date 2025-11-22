import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // Server settings
  PORT: z.coerce.number(),
  APP_NAME: z.string().min(1).default('Prisma Next.js Starter'),
  BASE_URL: z.url(),
  FRONTEND_URL: z.url(),
  // Database
  DATABASE_URL: z.url().min(1),
  // Google auth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // Github auth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  // Session
  SESSION_SECRET: z.string().min(1),
  // CSRF
  CSRF_SECRET: z.string().min(32),
  // Redis
  REDIS_URL: z.string().min(1),
  // AWS
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  // Nodemailer config
  MAIL_HOST: z.string().min(1),
  MAIL_PORT: z.coerce.number(),
  MAIL_USER: z.string().min(1),
  MAIL_PASSWORD: z.string().min(1),
  MAIL_FROM: z.email(),
  SUPPORT_EMAIL: z.email().optional(),
  // Sentry
  SENTRY_DSN: z.url(),
  // Stripe
  STRIPE_API_KEY: z.string().min(1),
});

function toLiteralMap<const A extends readonly string[]>(
  arr: A,
): { [K in A[number]]: K } {
  return arr.reduce(
    (o, k) => {
      o[k] = k;
      return o;
    },
    {} as unknown as { [K in A[number]]: K },
  );
}

const literalKeys = envSchema.keyof().options;
export const Env = toLiteralMap(literalKeys);

export type Env = keyof typeof Env;
