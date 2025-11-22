import { UsersRepository } from '@/users/users.repository';
import { HashingService } from '@app/hashing';
import { Test, TestingModule } from '@nestjs/testing';
import { SnsService } from 'libs/sns/src';
import { TotpService } from '../totp.service';
import { TwoFactorRepository } from '../two-factor.repository';
import { TwoFactorService } from '../two-factor.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  const mockTotpService = {
    generateSecret: jest.fn(),
    generateTotp: jest.fn(),
    verifyToken: jest.fn(),
    generateBackupCodes: jest.fn(),
    generateQRCode: jest.fn(),
  };

  const mockHashingService = {
    hash: jest.fn(),
    verify: jest.fn(),
  };


  const mockSnsService: jest.Mocked<Pick<SnsService, 'send'>> = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockUsersRepository = {
    findById: jest.fn(),
  };

  const mockTwoFactorRepository = {
    findByUserId: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  };

  const userId = 'user-123';

  beforeEach(async () => {
    mockSnsService.send.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: TwoFactorRepository,
          useValue: mockTwoFactorRepository,
        },
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: TotpService,
          useValue: mockTotpService,
        },
        {
          provide: HashingService,
          useValue: mockHashingService,
        },
        {
          provide: SnsService,
          useValue: mockSnsService,
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => {
    mockTwoFactorRepository.findByUserId.mockReset();
    mockTwoFactorRepository.upsert.mockReset();
    mockTwoFactorRepository.update.mockReset();
    mockUsersRepository.findById.mockReset();
    mockTotpService.generateSecret.mockReset();
    mockTotpService.generateTotp.mockReset();
    mockTotpService.verifyToken.mockReset();
    mockTotpService.generateBackupCodes.mockReset();
    mockTotpService.generateQRCode.mockReset();
    mockHashingService.hash.mockReset();
    mockHashingService.verify.mockReset();
    mockSnsService.send.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return default two-factor settings when two-factor auth is not setup', async () => {
      mockTwoFactorRepository.findByUserId.mockReturnValueOnce(null);

      const result = await service.getStatus(userId);
      expect(result).toEqual({
        totpEnabled: false,
        smsEnabled: false,
        phoneVerified: false,
        backupCodesCount: 0,
      });
    });

    it("should return user's two-factor settings when two-factor auth is setup", async () => {
      const twoFactorData = {
        totpEnabled: true,
        smsEnabled: false,
        phoneVerified: true,
        backupCodes: ['code1', 'code2'],
      };

      mockTwoFactorRepository.findByUserId.mockReturnValueOnce(twoFactorData);

      const result = await service.getStatus(userId);

      expect(result).toEqual({
        totpEnabled: true,
        smsEnabled: false,
        phoneVerified: true,
        backupCodesCount: 2,
      });
    });
  });

  describe('setupTotp', () => {
    it('should throw an error when user is not found', async () => {
      mockUsersRepository.findById.mockReturnValueOnce(null);

      await expect(service.setupTotp(userId)).rejects.toThrow('User not found');
    });

    it('should generate TOTP secret and return it along with otpauth URL', async () => {
      const mockUser = {
        id: userId,
        email: 'user@example.com',
      };

      const mockSecret = 'SECRET123';
      const mockQrCode = 'data:image/png;base64,QR_CODE_DATA';

      mockUsersRepository.findById.mockReturnValueOnce(mockUser);

      mockTotpService.generateSecret.mockReturnValueOnce({
        secret: mockSecret,
        otpauthUrl:
          'otpauth://totp/Example:user@example.com?secret=SECRET123&issuer=Example',
      });

      mockTotpService.generateQRCode.mockResolvedValueOnce(mockQrCode);

      const { qrCode, secret } = await service.setupTotp(userId);

      expect(mockTwoFactorRepository.upsert).toHaveBeenCalledWith(userId, {
        create: { totpEnabled: false, totpSecret: mockSecret },
        update: { totpEnabled: false, totpSecret: mockSecret },
      });
      expect(secret).toBe(mockSecret);
      expect(qrCode).toBe(mockQrCode);
    });
  });

  describe('verifyAndEnableTotp', () => {
    it('should throw an error when TOTP is not set up', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.verifyAndEnableTotp(userId, '123456'),
      ).rejects.toThrow('TOTP not set up');
    });

    it('should throw an error when TOTP secret is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpSecret: null,
      });

      await expect(
        service.verifyAndEnableTotp(userId, '123456'),
      ).rejects.toThrow('TOTP not set up');
    });

    it('should throw an error when TOTP token is invalid', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpSecret: 'SECRET123',
      });
      mockTotpService.verifyToken.mockReturnValueOnce(false);

      await expect(
        service.verifyAndEnableTotp(userId, '123456'),
      ).rejects.toThrow('Invalid TOTP token');
    });

    it('should enable TOTP and return backup codes when token is valid', async () => {
      const mockBackupCodes = ['CODE1', 'CODE2', 'CODE3'];
      const mockHashedCodes = ['HASH1', 'HASH2', 'HASH3'];

      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpSecret: 'SECRET123',
      });
      mockTotpService.verifyToken.mockReturnValueOnce(true);
      mockTotpService.generateBackupCodes.mockReturnValueOnce(mockBackupCodes);
      mockHashingService.hash
        .mockResolvedValueOnce(mockHashedCodes[0])
        .mockResolvedValueOnce(mockHashedCodes[1])
        .mockResolvedValueOnce(mockHashedCodes[2]);

      const result = await service.verifyAndEnableTotp(userId, '123456');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        totpEnabled: true,
        totpVerified: true,
        backupCodes: mockHashedCodes,
      });
      expect(result).toEqual({
        backupCodes: mockBackupCodes,
        message: 'TOTP enabled successfully',
      });
    });
  });

  describe('disableTotp', () => {
    it('should throw an error when TOTP is not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: false,
      });

      await expect(service.disableTotp(userId, '123456')).rejects.toThrow(
        'TOTP not enabled',
      );
    });

    it('should throw an error when TOTP is not enabled (null)', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(service.disableTotp(userId, '123456')).rejects.toThrow(
        'TOTP not enabled',
      );
    });

    it('should disable TOTP with valid 6-digit TOTP token', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        totpSecret: 'SECRET123',
        backupCodes: ['HASH1', 'HASH2'],
      });
      mockTotpService.verifyToken.mockReturnValueOnce(true);

      const result = await service.disableTotp(userId, '123456');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        totpEnabled: false,
        totpVerified: false,
        totpSecret: null,
        backupCodes: [],
      });
      expect(result).toEqual({ message: 'TOTP disabled successfully' });
    });

    it('should disable TOTP with valid 8-digit backup code', async () => {
      const mockBackupCodes = ['HASH1', 'HASH2'];
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        totpSecret: 'SECRET123',
        backupCodes: mockBackupCodes,
      });
      mockTotpService.verifyToken.mockReturnValueOnce(false);
      mockHashingService.verify.mockResolvedValueOnce(true);

      const result = await service.disableTotp(userId, '12345678');

      // First call is to remove backup code, second is to disable TOTP
      expect(mockTwoFactorRepository.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: 'TOTP disabled successfully' });
    });

    it('should throw an error when both TOTP and backup code are invalid', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        totpSecret: 'SECRET123',
        backupCodes: ['HASH1'],
      });
      mockTotpService.verifyToken.mockReturnValueOnce(false);
      mockHashingService.verify.mockResolvedValueOnce(false);

      await expect(service.disableTotp(userId, '12345678')).rejects.toThrow(
        'Invalid code',
      );
    });
  });

  describe('setupSms', () => {
    it('should send SMS code and save it to database', async () => {
      const phoneNumber = '+1234567890';
      mockSnsService.send.mockResolvedValueOnce(undefined);

      const result = await service.setupSms(userId, phoneNumber);

      expect(mockSnsService.send).toHaveBeenCalledWith(
        phoneNumber,
        expect.stringMatching(/^\d{6}$/),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const upsertCall = mockTwoFactorRepository.upsert.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[0]).toBe(userId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[1]).toHaveProperty('create');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[1]).toHaveProperty('update');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[1].create).toMatchObject({
        phoneNumber,
        smsEnabled: false,
        phoneVerified: false,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[1].create.smsCode).toMatch(/^\d{6}$/);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(upsertCall[1].create.smsCodeExpiresAt).toBeInstanceOf(Date);
      expect(result).toEqual({ message: 'SMS code sent' });
    });

    it('should throw an error when SMS sending fails', async () => {
      const phoneNumber = '+1234567890';
      mockSnsService.send.mockRejectedValueOnce(
        new Error('SMS service error'),
      );

      await expect(service.setupSms(userId, phoneNumber)).rejects.toThrow(
        'Failed to send SMS code',
      );
    });
  });

  describe('verifyAndEnableSms', () => {
    it('should throw an error when SMS is not set up', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.verifyAndEnableSms(userId, '123456'),
      ).rejects.toThrow('SMS not set up');
    });

    it('should throw an error when SMS code is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsCode: null,
      });

      await expect(
        service.verifyAndEnableSms(userId, '123456'),
      ).rejects.toThrow('SMS not set up');
    });

    it('should throw an error when SMS code has expired', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsCode: '123456',
        smsCodeExpiresAt: expiredDate,
      });

      await expect(
        service.verifyAndEnableSms(userId, '123456'),
      ).rejects.toThrow('SMS code has expired');
    });

    it('should throw an error when SMS code is invalid', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      await expect(
        service.verifyAndEnableSms(userId, '654321'),
      ).rejects.toThrow('Invalid SMS code');
    });

    it('should enable SMS when code is valid', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      const result = await service.verifyAndEnableSms(userId, '123456');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        smsEnabled: true,
        phoneVerified: true,
        smsCode: null,
        smsCodeExpiresAt: null,
      });
      expect(result).toEqual({ message: 'SMS enabled successfully' });
    });
  });

  describe('disableSms', () => {
    it('should throw an error when SMS is not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: false,
      });

      await expect(service.disableSms(userId, '123456')).rejects.toThrow(
        'SMS not enabled',
      );
    });

    it('should throw an error when SMS is not enabled (null)', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(service.disableSms(userId, '123456')).rejects.toThrow(
        'SMS not enabled',
      );
    });

    it('should send verification code when no code exists', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
        smsCode: null,
        smsCodeExpiresAt: null,
      });
      mockSnsService.send.mockResolvedValueOnce(undefined);

      await expect(service.disableSms(userId, '123456')).rejects.toThrow(
        'Verification code sent. Please provide the code to disable SMS.',
      );

      expect(mockSnsService.send).toHaveBeenCalled();
      expect(mockTwoFactorRepository.update).toHaveBeenCalled();
    });

    it('should throw an error when phone number is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: null,
        smsCode: null,
        smsCodeExpiresAt: null,
      });

      await expect(service.disableSms(userId, '123456')).rejects.toThrow(
        'Phone number not found',
      );
    });

    it('should throw an error when SMS code has expired during disable', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
        smsCode: '123456',
        smsCodeExpiresAt: expiredDate,
      });

      await expect(service.disableSms(userId, '123456')).rejects.toThrow(
        'SMS code has expired',
      );
    });

    it('should throw an error when SMS code is invalid during disable', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      await expect(service.disableSms(userId, '654321')).rejects.toThrow(
        'Invalid SMS code',
      );
    });

    it('should disable SMS when code is valid', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      const result = await service.disableSms(userId, '123456');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        smsEnabled: false,
        phoneVerified: false,
        phoneNumber: null,
        smsCode: null,
        smsCodeExpiresAt: null,
      });
      expect(result).toEqual({ message: 'SMS disabled successfully' });
    });
  });

  describe('resendSmsCode', () => {
    it('should throw an error when phone number is not set up', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(service.resendSmsCode(userId)).rejects.toThrow(
        'Phone number not set up',
      );
    });

    it('should throw an error when phone number is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        phoneNumber: null,
      });

      await expect(service.resendSmsCode(userId)).rejects.toThrow(
        'Phone number not set up',
      );
    });

    it('should throw an error when SMS sending fails', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        phoneNumber: '+1234567890',
      });
      mockSnsService.send.mockRejectedValueOnce(
        new Error('SMS service error'),
      );

      await expect(service.resendSmsCode(userId)).rejects.toThrow(
        'Failed to send SMS code',
      );
    });

    it('should resend SMS code successfully', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        phoneNumber: '+1234567890',
      });
      mockSnsService.send.mockResolvedValueOnce(undefined);

      const result = await service.resendSmsCode(userId);

      expect(mockSnsService.send).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringMatching(/^\d{6}$/),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const updateCall = mockTwoFactorRepository.update.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[0]).toBe(userId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1]).toHaveProperty('smsCode');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1]).toHaveProperty('smsCodeExpiresAt');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(typeof updateCall[1].smsCode).toBe('string');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1].smsCodeExpiresAt).toBeInstanceOf(Date);
      expect(result).toEqual({ message: 'SMS code resent' });
    });
  });

  describe('verifyBackupCode', () => {
    it('should throw an error when no backup codes are available', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.verifyBackupCode(userId, '12345678'),
      ).rejects.toThrow('No backup codes available');
    });

    it('should throw an error when backup codes array is empty', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        backupCodes: [],
      });

      await expect(
        service.verifyBackupCode(userId, '12345678'),
      ).rejects.toThrow('No backup codes available');
    });

    it('should throw an error when backup code is invalid', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        backupCodes: ['HASH1', 'HASH2'],
      });
      mockHashingService.verify
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await expect(
        service.verifyBackupCode(userId, '12345678'),
      ).rejects.toThrow('Invalid backup code');
    });

    it('should verify and remove used backup code', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        backupCodes: ['HASH1', 'HASH2', 'HASH3'],
      });
      mockHashingService.verify
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.verifyBackupCode(userId, '12345678');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        backupCodes: ['HASH1', 'HASH3'],
      });
      expect(result).toEqual({
        valid: true,
        remainingCodes: 3,
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should throw an error when TOTP is not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: false,
      });

      await expect(
        service.regenerateBackupCodes(userId, '123456'),
      ).rejects.toThrow('TOTP not enabled');
    });

    it('should throw an error when TOTP secret is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        totpSecret: null,
      });

      await expect(
        service.regenerateBackupCodes(userId, '123456'),
      ).rejects.toThrow('TOTP not enabled');
    });

    it('should throw an error when TOTP token is invalid', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        totpSecret: 'SECRET123',
      });
      mockTotpService.verifyToken.mockReturnValueOnce(false);

      await expect(
        service.regenerateBackupCodes(userId, '123456'),
      ).rejects.toThrow('Invalid TOTP token');
    });

    it('should regenerate backup codes when TOTP token is valid', async () => {
      const mockBackupCodes = ['NEW1', 'NEW2', 'NEW3'];
      const mockHashedCodes = ['NEWHASH1', 'NEWHASH2', 'NEWHASH3'];

      mockTwoFactorRepository.findByUserId.mockReset();
      mockTotpService.verifyToken.mockReset();
      mockTotpService.generateBackupCodes.mockReset();
      mockHashingService.hash.mockReset();
      mockTwoFactorRepository.update.mockReset();

      mockTwoFactorRepository.findByUserId.mockResolvedValue({
        totpEnabled: true,
        totpSecret: 'SECRET123',
      });
      mockTotpService.verifyToken.mockReturnValue(true);
      mockTotpService.generateBackupCodes.mockReturnValue(mockBackupCodes);
      mockHashingService.hash
        .mockResolvedValueOnce(mockHashedCodes[0])
        .mockResolvedValueOnce(mockHashedCodes[1])
        .mockResolvedValueOnce(mockHashedCodes[2]);

      const result = await service.regenerateBackupCodes(userId, '123456');

      expect(mockTwoFactorRepository.update).toHaveBeenCalledWith(userId, {
        backupCodes: mockHashedCodes,
      });
      expect(result).toEqual({
        backupCodes: mockBackupCodes,
        message: 'Backup codes regenerated successfully',
      });
    });
  });

  describe('verify2FA', () => {
    it('should return false when two-factor auth is not set up', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      const result = await service.verify2FA(userId, '123456', 'totp');

      expect(result).toBe(false);
    });

    it('should verify TOTP successfully', async () => {
      mockTwoFactorRepository.findByUserId.mockReset();
      mockTotpService.verifyToken.mockReset();

      mockTwoFactorRepository.findByUserId.mockResolvedValue({
        totpEnabled: true,
        totpSecret: 'SECRET123',
      });
      mockTotpService.verifyToken.mockReturnValue(true);

      const result = await service.verify2FA(userId, '123456', 'totp');

      expect(result).toBe(true);
    });

    it('should return false for TOTP when not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: false,
      });

      const result = await service.verify2FA(userId, '123456', 'totp');

      expect(result).toBe(false);
    });

    it('should verify SMS successfully', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      const result = await service.verify2FA(userId, '123456', 'sms');

      expect(result).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const updateCall = mockTwoFactorRepository.update.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[0]).toBe(userId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1]).toMatchObject({
        smsCode: null,
        smsCodeExpiresAt: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1].lastUsedAt).toBeInstanceOf(Date);
    });

    it('should return false for SMS when not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: false,
      });

      const result = await service.verify2FA(userId, '123456', 'sms');

      expect(result).toBe(false);
    });

    it('should return false for SMS when code has expired', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        smsCode: '123456',
        smsCodeExpiresAt: expiredDate,
      });

      const result = await service.verify2FA(userId, '123456', 'sms');

      expect(result).toBe(false);
    });

    it('should return false for SMS when code does not match', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        smsCode: '123456',
        smsCodeExpiresAt: futureDate,
      });

      const result = await service.verify2FA(userId, '654321', 'sms');

      expect(result).toBe(false);
    });

    it('should verify backup code successfully', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        backupCodes: ['HASH1', 'HASH2'],
      });
      mockHashingService.verify.mockResolvedValueOnce(true);

      const result = await service.verify2FA(userId, '12345678', 'backup');

      expect(result).toBe(true);
    });

    it('should return false for backup code when no codes available', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        backupCodes: [],
      });

      const result = await service.verify2FA(userId, '12345678', 'backup');

      expect(result).toBe(false);
    });

    it('should throw an error when database error occurs', async () => {
      mockTwoFactorRepository.findByUserId.mockReset();

      mockTwoFactorRepository.findByUserId.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.verify2FA(userId, '123456', 'totp')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('has2FAEnabled', () => {
    it('should return false when two-factor auth is not set up', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce(null);

      const result = await service.has2FAEnabled(userId);

      expect(result).toBe(false);
    });

    it('should return true when TOTP is enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        smsEnabled: false,
      });

      const result = await service.has2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return true when SMS is enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: false,
        smsEnabled: true,
      });

      const result = await service.has2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return true when both TOTP and SMS are enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: true,
        smsEnabled: true,
      });

      const result = await service.has2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false when both TOTP and SMS are disabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        totpEnabled: false,
        smsEnabled: false,
      });

      const result = await service.has2FAEnabled(userId);

      expect(result).toBe(false);
    });
  });

  describe('send2FACode', () => {
    it('should throw an error when SMS 2FA is not enabled', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: false,
      });

      await expect(service.send2FACode(userId)).rejects.toThrow(
        'SMS 2FA not enabled',
      );
    });

    it('should throw an error when phone number is missing', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: null,
      });

      await expect(service.send2FACode(userId)).rejects.toThrow(
        'SMS 2FA not enabled',
      );
    });

    it('should throw an error when SMS sending fails', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
      });
      mockSnsService.send.mockRejectedValueOnce(
        new Error('SMS service error'),
      );

      await expect(service.send2FACode(userId)).rejects.toThrow(
        'Failed to send SMS code',
      );
    });

    it('should send 2FA code successfully', async () => {
      mockTwoFactorRepository.findByUserId.mockResolvedValueOnce({
        smsEnabled: true,
        phoneNumber: '+1234567890',
      });
      mockSnsService.send.mockResolvedValueOnce(undefined);

      await service.send2FACode(userId);

      expect(mockSnsService.send).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringMatching(/^\d{6}$/),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const updateCall = mockTwoFactorRepository.update.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[0]).toBe(userId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1]).toHaveProperty('smsCode');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1]).toHaveProperty('smsCodeExpiresAt');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(typeof updateCall[1].smsCode).toBe('string');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(updateCall[1].smsCodeExpiresAt).toBeInstanceOf(Date);
    });
  });
});
