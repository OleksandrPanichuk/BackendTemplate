import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { S3Module } from '@app/s3';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { S3HealthIndicator } from './indicators/s3.health';

@Module({
  imports: [TerminusModule, PrismaModule, RedisModule, S3Module],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, S3HealthIndicator],
})
export class HealthModule {}
