import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { STRATEGIES } from '@/auth/auth.constants';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard(STRATEGIES.GOOGLE) {
  private readonly logger = new Logger(GoogleOAuthGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.debug('GoogleOAuthGuard invoked');
    return super.canActivate(context);
  }
}
