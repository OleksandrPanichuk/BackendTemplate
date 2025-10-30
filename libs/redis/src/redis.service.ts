import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '@/shared/config';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl = configService.get<string>(Env.REDIS_URL)!;

    super(redisUrl);

    this.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.on('error', (err) => {
      this.logger.error('Redis error', err);
    });

    this.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    await this.quit();
    this.logger.log('Redis disconnected');
  }
}
