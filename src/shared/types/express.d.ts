import { SafeUser } from '@/users/interfaces';
import { Member } from '@prisma/generated';

declare global {
  namespace Express {
    interface Request {
      member?: Member;
    }

    interface User extends SafeUser {}
  }
}
