import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { Env } from '@/shared/config/env.config';

export function getCorsConfig(config: ConfigService): CorsOptions {
  return {
    credentials: true,
    origin: config.get<string>(Env.FRONTEND_URL),
  };
}
