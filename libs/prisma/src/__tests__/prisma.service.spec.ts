import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-database-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        PrismaService,
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set database url from config', () => {
    expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
  });

  it('should call $connect on onModuleInit', async () => {
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('should call $disconnect on onModuleDestroy', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue();
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
