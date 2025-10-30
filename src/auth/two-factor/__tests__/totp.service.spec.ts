import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { authenticator } from 'otplib';
import { TotpService } from '../totp.service';

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('TestApp'),
          },
        },
      ],
    }).compile();
    service = module.get<TotpService>(TotpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a secret and otpauth URL', () => {
    const { secret, otpauthUrl } = service.generateSecret('user@example.com');
    expect(secret).toBeDefined();
    expect(otpauthUrl).toContain('otpauth://totp/');
  });

  it('should generate a valid QR code', async () => {
    const { otpauthUrl } = service.generateSecret('user@examle.com');

    const qr = await service.generateQRCode(otpauthUrl);
    expect(qr.startsWith('data:image/png;base64')).toBe(true);
  });

  it('should verify a valid token', () => {
    const { secret } = service.generateSecret('user@example.com');
    const token = authenticator.generate(secret);
    expect(service.verifyToken(secret, token)).toBe(true);
  });

  it('should return false for an invalid token', () => {
    const { secret } = service.generateSecret('user@example.com');
    expect(service.verifyToken(secret, '000000')).toBe(false);
  });

  it('should generate backup codes', () => {
    const codes = service.generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(codes[0]).toMatch(/^[A-F0-9]{8}$/);
  });
});
