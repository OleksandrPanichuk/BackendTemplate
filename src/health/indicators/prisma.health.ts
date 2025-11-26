import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key = 'database'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const result: unknown[] = await this.prisma.$queryRaw`SELECT 1`;

      const isHealthy = result.length > 0;

      if (!isHealthy) {
        return indicator.down();
      }

      return indicator.up();
    } catch (error) {
      return indicator.down();
    }
  }
}
