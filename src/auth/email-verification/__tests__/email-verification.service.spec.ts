import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmailVerificationService } from '../email-verification.service';
import { VerificationCodeRepository } from '../verification-code.repository';
import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import { MailerService } from '@app/mailer';
import { SafeUser } from '@/users/interfaces';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let verificationCodeRepository: jest.Mocked<VerificationCodeRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let hashingService: jest.Mocked<HashingService>;
  let mailerService: jest.Mocked<MailerService>;

  const mockUser: SafeUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    emailVerified: false,
  } as SafeUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: VerificationCodeRepository,
          useValue: {
            findByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteByUserId: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            updateVerificationStatus: jest.fn(),
          },
        },
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendEmailVerification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    verificationCodeRepository = module.get(VerificationCodeRepository);
    usersRepository = module.get(UsersRepository);
    hashingService = module.get(HashingService);
    mailerService = module.get(MailerService);
  });

  describe('sendVerificationCode', () => {
    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };

      await expect(service.sendVerificationCode(verifiedUser)).rejects.toThrow(
        new BadRequestException('Email already verified'),
      );
    });

    it('should create new verification code for first-time user', async () => {
      verificationCodeRepository.findByUserId.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-code');
      mailerService.sendEmailVerification.mockResolvedValue(undefined);

      await service.sendVerificationCode(mockUser);

      expect(verificationCodeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          resendCount: 0,
        }),
      );
      expect(mailerService.sendEmailVerification).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        expect.any(String),
        15,
      );
    });

    it('should enforce resend cooldown', async () => {
      const recentCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'hashed-code',
        resendCount: 0,
        createdAt: new Date(Date.now() - 30000), // 30 seconds ago
        expiresAt: new Date(Date.now() + 900000),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(
        recentCode as any,
      );

      await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should enforce maximum resend attempts', async () => {
      const maxedOutCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'hashed-code',
        resendCount: 5,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        expiresAt: new Date(Date.now() + 900000),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(
        maxedOutCode as any,
      );

      await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(
        new BadRequestException(
          'Maximum resend attempts reached. Please try again later.',
        ),
      );
    });

    it('should increment resendCount when resending code', async () => {
      const oldCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'old-hashed-code',
        resendCount: 2,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        expiresAt: new Date(Date.now() + 900000),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(oldCode as any);
      hashingService.hash.mockResolvedValue('new-hashed-code');
      mailerService.sendEmailVerification.mockResolvedValue(undefined);

      await service.sendVerificationCode(mockUser);

      expect(verificationCodeRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          resendCount: 3,
        }),
      );
    });

    it('should delete code if email sending fails', async () => {
      verificationCodeRepository.findByUserId.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-code');
      mailerService.sendEmailVerification.mockRejectedValue(
        new Error('SMTP error'),
      );

      await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(
        new BadRequestException('Failed to send email verification'),
      );

      expect(verificationCodeRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };

      await expect(
        service.verifyEmail({ code: '123456' }, verifiedUser),
      ).rejects.toThrow(new BadRequestException('Email already verified'));
    });

    it('should throw BadRequestException if no code exists', async () => {
      verificationCodeRepository.findByUserId.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ code: '123456' }, mockUser),
      ).rejects.toThrow(
        new BadRequestException(
          'No valid verification code found. Please request a new one.',
        ),
      );
    });

    it('should throw BadRequestException if code is expired', async () => {
      const expiredCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'hashed-code',
        expiresAt: new Date(Date.now() - 1000), // Expired
        resendCount: 0,
        createdAt: new Date(),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(
        expiredCode as any,
      );

      await expect(
        service.verifyEmail({ code: '123456' }, mockUser),
      ).rejects.toThrow(
        new BadRequestException(
          'Verification code has expired. Please request a new one.',
        ),
      );

      expect(verificationCodeRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should throw BadRequestException if code is invalid', async () => {
      const validCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'hashed-code',
        expiresAt: new Date(Date.now() + 900000),
        resendCount: 0,
        createdAt: new Date(),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(
        validCode as any,
      );
      hashingService.verify.mockResolvedValue(false);

      await expect(
        service.verifyEmail({ code: '123456' }, mockUser),
      ).rejects.toThrow(new BadRequestException('Invalid verification code.'));
    });

    it('should verify email successfully with valid code', async () => {
      const validCode = {
        id: 'code-123',
        userId: mockUser.id,
        code: 'hashed-code',
        expiresAt: new Date(Date.now() + 900000),
        resendCount: 0,
        createdAt: new Date(),
      };

      verificationCodeRepository.findByUserId.mockResolvedValue(
        validCode as any,
      );
      hashingService.verify.mockResolvedValue(true);
      usersRepository.updateVerificationStatus.mockResolvedValue(
        undefined as any,
      );

      await service.verifyEmail({ code: '123456' }, mockUser);

      expect(usersRepository.updateVerificationStatus).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(verificationCodeRepository.deleteByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });
});
