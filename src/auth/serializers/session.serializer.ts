import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '@/users/users.service';
import { SafeUser } from '@/users/interfaces';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(
    user: SafeUser,
    done: (err: unknown, userId: string | null) => void,
  ) {
    try {
      done(null, user.id);
    } catch (err) {
      done(err, null);
    }
  }

  async deserializeUser(
    userId: string,
    done: (err: unknown, user: SafeUser | null) => void,
  ) {
    try {
      const user = await this.usersService.findById(userId);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
}
