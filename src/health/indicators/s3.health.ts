import { S3Service } from '@app/s3';
import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class S3HealthIndicator extends HealthIndicator {
  constructor(private readonly s3: S3Service) {
    super();
  }

  async isHealthy(key = 's3'): Promise<HealthIndicatorResult> {
    try {
      await this.s3.healthCheck();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'S3 check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
