import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/shared/config';
import { getCallbackUrl } from '@/auth/auth.helpers';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { TOAuthUser } from '../auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>(Env.GOOGLE_CLIENT_ID)!,
      clientSecret: config.get<string>(Env.GOOGLE_CLIENT_SECRET)!,
      scope: ['email', 'profile'],
      callbackURL: getCallbackUrl('google', config),
    });
  }

  validate(
    at: string,
    rt: string,
    profile: Profile,
    done: (err: unknown, user: TOAuthUser | null) => void,
  ) {
    this.logger.debug(`Authenticating GitHub user: ${profile.id}`);

    const { emails, photos, username, displayName, name } = profile;

    if (!emails?.length || !photos?.length) {
      this.logger.warn('Missing email or photo in Google profile');
      return done(new UnauthorizedException('Incomplete Google profile'), null);
    }

    const user = {
      email: emails[0].value,
      avatar: {
        url: photos[0].value,
      },
      username: username || displayName,
      firstName: name?.givenName,
      lastName: name?.familyName,
    };

    done(null, user);
  }
}
