import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getCorsConfig(origin: string): CorsOptions {
  return {
    credentials: true,
    origin,
  };
}
