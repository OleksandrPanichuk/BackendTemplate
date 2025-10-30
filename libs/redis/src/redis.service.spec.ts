import { Env } from '@/shared/config';
import { RedisService } from '@app/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === Env.REDIS_URL) {
        return 'redis://localhost:6379';
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    if (service) {
      await service.quit();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend Redis', () => {
    expect(service).toBeInstanceOf(RedisService);
  });

  it('should get Redis URL from config', () => {
    expect(configService.get).toHaveBeenCalledWith(Env.REDIS_URL);
  });

  it('should connect to Redis', () => {
    // The service auto-connects on instantiation via the parent Redis constructor
    // We just need to verify it's connected
    const status = service.status;
    expect(['connect', 'ready', 'connecting']).toContain(status);
  });

  it('should set and get a value', async () => {
    await service.set('test-key', 'test-value');
    const value = await service.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should set a value with expiry', async () => {
    await service.setex('test-key-ex', 1, 'test-value');
    const value = await service.get('test-key-ex');
    expect(value).toBe('test-value');

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const expiredValue = await service.get('test-key-ex');
    expect(expiredValue).toBeNull();
  });

  it('should delete a key', async () => {
    await service.set('test-key-del', 'test-value');
    await service.del('test-key-del');
    const value = await service.get('test-key-del');
    expect(value).toBeNull();
  });

  it('should check if key exists', async () => {
    await service.set('test-key-exists', 'test-value');
    const exists = await service.exists('test-key-exists');
    expect(exists).toBe(1);

    const notExists = await service.exists('non-existent-key');
    expect(notExists).toBe(0);
  });

  it('should get all keys matching pattern', async () => {
    await service.set('user:1', 'value1');
    await service.set('user:2', 'value2');
    await service.set('post:1', 'value3');

    const keys = await service.keys('user:*');
    expect(keys).toContain('user:1');
    expect(keys).toContain('user:2');
    expect(keys).not.toContain('post:1');
  });

  it('should handle Redis errors', (done) => {
    service.on('error', (err) => {
      expect(err).toBeDefined();
      done();
    });

    service.emit('error', new Error('Test error'));
  });

  it('should disconnect on module destroy', async () => {
    const quitSpy = jest.spyOn(service, 'quit');
    await service.onModuleDestroy();
    expect(quitSpy).toHaveBeenCalled();
  });

  it('should log connection events', () => {
    const loggerSpy = jest.spyOn(service['logger'], 'log');
    service.emit('connect');
    expect(loggerSpy).toHaveBeenCalledWith('Redis connected');
  });

  it('should log error events', () => {
    const loggerSpy = jest.spyOn(service['logger'], 'error');
    const testError = new Error('Test error');
    service.emit('error', testError);
    expect(loggerSpy).toHaveBeenCalledWith('Redis error', testError);
  });

  it('should log close events', () => {
    const loggerSpy = jest.spyOn(service['logger'], 'warn');
    service.emit('close');
    expect(loggerSpy).toHaveBeenCalledWith('Redis connection closed');
  });

  it('should require Redis URL from config', () => {
    // Verify that Redis URL is fetched from config during initialization
    expect(configService.get).toHaveBeenCalledWith(Env.REDIS_URL);
  });
});
