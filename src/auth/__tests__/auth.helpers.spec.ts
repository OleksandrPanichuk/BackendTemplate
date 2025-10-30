import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getCallbackUrl } from '@/auth/auth.helpers';

describe('GenerateCallbackUrl', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:8080'),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });

  it('should return the correct callback url for google', () => {
    const callbackUrl = getCallbackUrl('google', configService);
    expect(callbackUrl).toBe('http://localhost:8080/api/auth/callback/google');
  });

  it('should return the correct callback url for github', () => {
    const callbackUrl = getCallbackUrl('github', configService);
    expect(callbackUrl).toBe('http://localhost:8080/api/auth/callback/github');
  });
});
