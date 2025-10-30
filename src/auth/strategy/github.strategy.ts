import { getCallbackUrl } from '@/auth/auth.helpers';
import { Env } from '@/shared/config';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { TOAuthUser } from '../auth.types';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>(Env.GITHUB_CLIENT_ID)!,
      clientSecret: config.get<string>(Env.GITHUB_CLIENT_SECRET)!,
      callbackURL: getCallbackUrl('github', config),
      scope: ['user:email'],
    });
  }

  validate(
    at: string,
    rt: string,
    profile: Profile,
    done: (err: unknown, user: TOAuthUser | null) => void,
  ) {
    this.logger.debug(`Authenticating GitHub user: ${profile.id}`);

    const { emails, photos, displayName, username, name } = profile;

    if (!emails?.length || !photos?.length) {
      this.logger.warn('Missing email or photo in GitHub profile');
      return done(new UnauthorizedException('Incomplete GitHub profile'), null);
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
