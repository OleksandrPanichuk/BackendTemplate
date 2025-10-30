import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('should hash a plain text string', async () => {
      const plainText = 'mySecurePassword123';
      const hashedData = await service.hash(plainText);

      expect(hashedData).toBeDefined();
      expect(typeof hashedData).toBe('string');
      expect(hashedData).not.toBe(plainText);
      expect(hashedData.startsWith('$argon2')).toBe(true);
    });

    it('should produce different hashes for the same input (due to salt)', async () => {
      const plainText = 'samePassword';
      const hash1 = await service.hash(plainText);
      const hash2 = await service.hash(plainText);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', async () => {
      const hashedData = await service.hash('');

      expect(hashedData).toBeDefined();
      expect(hashedData.startsWith('$argon2')).toBe(true);
    });

    it('should hash long strings', async () => {
      const longText = 'a'.repeat(1000);
      const hashedData = await service.hash(longText);

      expect(hashedData).toBeDefined();
      expect(hashedData.startsWith('$argon2')).toBe(true);
    });

    it('should accept custom options', async () => {
      const plainText = 'password';
      const hashedData = await service.hash(plainText, {
        memoryCost: 2 ** 16,
        timeCost: 3,
      });

      expect(hashedData).toBeDefined();
      expect(hashedData.startsWith('$argon2')).toBe(true);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const plainText = 'correctPassword123';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, plainText);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const plainText = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should reject password with slight variation', async () => {
      const plainText = 'Password123';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, 'password123');

      expect(isValid).toBe(false);
    });

    it('should verify empty string if it was hashed', async () => {
      const plainText = '';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, plainText);

      expect(isValid).toBe(true);
    });

    it('should reject empty string against non-empty hash', async () => {
      const plainText = 'notEmpty';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, '');

      expect(isValid).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const plainText = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, plainText);

      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const plainText = 'пароль密码🔐';
      const hashedData = await service.hash(plainText);

      const isValid = await service.verify(hashedData, plainText);

      expect(isValid).toBe(true);
    });

    it('should reject invalid hash format', async () => {
      const plainText = 'password';
      const invalidHash = 'not-a-valid-hash';

      await expect(service.verify(invalidHash, plainText)).rejects.toThrow();
    });
  });

  describe('integration', () => {
    it('should handle multiple hash and verify operations', async () => {
      const passwords = ['pass1', 'pass2', 'pass3'];
      const hashes = await Promise.all(passwords.map((p) => service.hash(p)));

      for (let i = 0; i < passwords.length; i++) {
        const isValid = await service.verify(hashes[i], passwords[i]);
        expect(isValid).toBe(true);

        for (let j = 0; j < passwords.length; j++) {
          if (i !== j) {
            const isInvalid = await service.verify(hashes[i], passwords[j]);
            expect(isInvalid).toBe(false);
          }
        }
      }
    });
  });
});
