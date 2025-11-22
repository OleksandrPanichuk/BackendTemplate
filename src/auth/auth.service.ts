import { SignInInput, SignUpInput } from '@/auth/dto';
import { SafeUser, toSafeUser } from '@/users/interfaces';
import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TOAuthUser } from './auth.types';
import { TwoFactorService } from './two-factor/two-factor.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashingService: HashingService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  public async oauthSignIn(dto?: TOAuthUser): Promise<SafeUser> {
    if (!dto) {
      throw new BadRequestException('Invalid OAuth2 data');
    }
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (!existingUser) {
      const newUser = await this.usersRepository.create({
        email: dto.email,
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      await this.usersRepository.updateVerificationStatus(newUser.id);

      return toSafeUser(newUser);
    }

    if (!existingUser.emailVerified) {
      await this.usersRepository.updateVerificationStatus(existingUser.id);
    }

    return toSafeUser(existingUser);
  }

  public async signUp(dto: SignUpInput): Promise<SafeUser> {
    const existingUser = await this.usersRepository.findByEmailOrUsername(
      dto.email,
      dto.username,
    );

    if (existingUser) {
      if (existingUser.username === dto.username) {
        throw new ConflictException('Username already in use');
      } else if (existingUser.email === dto.email) {
        throw new ConflictException('Email already in use');
      }
    }

    const hashedPassword = await this.hashingService.hash(dto.password);

    const newUser = await this.usersRepository.create({
      passwordHash: hashedPassword,
      email: dto.email,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    this.logger.log(`New user registered: ${newUser.id}`);

    return toSafeUser(newUser);
  }

  public async signIn(
    dto: SignInInput,
  ): Promise<SafeUser & { requires2FA?: boolean }> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.logger.warn(`Failed login attempt. Email: ${user.email}`);
      throw new ForbiddenException(
        'Too many failed attempts. Please try again later.',
      );
    }

    if (!user.hash) {
      throw new BadRequestException('Invalid email or password');
    }

    const isValidPassword = await this.hashingService.verify(
      user.hash,
      dto.password,
    );

    if (!isValidPassword) {
      this.logger.warn(`Failed login attempt. Email: ${user.email}`);
      await this.handleFailedLogin(user.id, user.email);
      throw new BadRequestException('Invalid email or password');
    }

    await this.resetFailedAttempts(user.id);

    const has2FA = await this.twoFactorService.has2FAEnabled(user.id);
    if (has2FA) {
      const safeUser = toSafeUser(user);
      return Object.assign(safeUser, { requires2FA: true });
    }

    return toSafeUser(user);
  }

  private async resetFailedAttempts(userId: string) {
    await this.usersRepository.resetFailedLoginAttempts(userId);
  }

  private async handleFailedLogin(userId: string, email: string) {
    const user = await this.usersRepository.getFailedLoginAttempts(userId);

    const attempts = (user?.failedLoginAttempts || 0) + 1;
    const shouldLock = attempts >= this.MAX_FAILED_ATTEMPTS;

    const lockedUntil = shouldLock
      ? new Date(Date.now() + this.LOCK_DURATION)
      : null;

    await this.usersRepository.updateFailedLoginAttempts(userId, {
      attempts,
      lockedUntil,
    });

    if (shouldLock) {
      this.logger.warn(
        `Account locked due to ${attempts} failed attempts. User ID: ${userId}, Email: ${email}`,
      );
    } else {
      this.logger.warn(
        `Failed login attempt ${attempts}/${this.MAX_FAILED_ATTEMPTS}. User ID: ${userId}, Email: ${email}`,
      );
    }
  }

  public async verify2FA(
    userId: string,
    method: 'totp' | 'sms' | 'backup_code',
    code: string,
  ): Promise<SafeUser> {
    // Map 'backup_code' to 'backup' for the two-factor service
    const methodForService = method === 'backup_code' ? 'backup' : method;
    const isValid = await this.twoFactorService.verify2FA(
      userId,
      code,
      methodForService,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return toSafeUser(user);
  }
}
