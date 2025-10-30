import { STRATEGIES } from '@/auth/auth.constants';
import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GithubOAuthGuard extends AuthGuard(STRATEGIES.GITHUB) {
  private readonly logger = new Logger(GithubOAuthGuard.name);
  canActivate(context: ExecutionContext) {
    this.logger.debug('GithubOAuthGuard invoked');
    return super.canActivate(context);
  }
}
