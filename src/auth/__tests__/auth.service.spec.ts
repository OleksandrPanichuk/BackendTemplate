import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { TwoFactorService } from '../two-factor/two-factor.service';

describe('AuthService', () => {
  let service: AuthService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
