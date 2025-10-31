import { UserEntity } from '@/users/user.entity';
import { TenantMemberRole } from '@prisma/generated';
import { ITenantContext } from './tenants/tenants.interfaces';


declare global {
  namespace Express {
    interface Request {
      tenant?: ITenantContext;
    }

    interface User extends UserEntity {}
  }
}
