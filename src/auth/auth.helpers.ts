import { ConfigService } from '@nestjs/config';
import { Env } from '@/shared/config';

export function getCallbackUrl(
  type: 'google' | 'github',
  config: ConfigService,
) {
  return `${config.get(Env.BASE_URL)}/api/auth/callback/${type}`;
}
