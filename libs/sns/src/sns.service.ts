import { Env } from '@/shared/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SnsService {
  private snsClient: SNSClient;
  private readonly logger = new Logger(SnsService.name);

  constructor(private config: ConfigService) {
    this.snsClient = new SNSClient({
      region: this.config.get(Env.AWS_REGION)!,
      credentials: {
        accessKeyId: this.config.get(Env.AWS_ACCESS_KEY_ID)!,
        secretAccessKey: this.config.get(Env.AWS_SECRET_ACCESS_KEY)!,
      },
    });
  }

  public async send(phoneNumber: string, message: string) {
    try {
      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
      });

      await this.snsClient.send(command);
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}: ${error.message}`,
      );

      throw new InternalServerErrorException('Failed to send SMS message');
    }
  }
}
