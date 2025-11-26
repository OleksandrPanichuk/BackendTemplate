import { S3Service } from '@app/s3';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class S3HealthIndicator {
  constructor(
    private readonly s3: S3Service,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key = 's3'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const ok = await this.s3.healthCheck();

      if (ok !== 'OK') {
        return indicator.down();
      }
      return indicator.up();
    } catch (error) {
      return indicator.down();
    }
  }
}
