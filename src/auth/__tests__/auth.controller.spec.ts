import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { TwoFactorService } from '../two-factor/two-factor.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findByEmailOrUsername: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateVerificationStatus: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
    getFailedLoginAttempts: jest.fn(),
    updateFailedLoginAttempts: jest.fn(),
  };

  const mockHashingService = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  const mockTwoFactorService = {
    has2FAEnabled: jest.fn(),
    verify2FA: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: HashingService,
          useValue: mockHashingService,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
