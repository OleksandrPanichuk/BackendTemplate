import { Injectable } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { ConfigService } from '@nestjs/config';
import { Env } from '@/shared/config';

@Injectable()
export class SmsService {
  private snsClient: SNSClient;

  constructor(private config: ConfigService) {
    this.snsClient = new SNSClient({
      region: this.config.get(Env.AWS_REGION)!,
      credentials: {
        accessKeyId: this.config.get(Env.AWS_ACCESS_KEY_ID)!,
        secretAccessKey: this.config.get(Env.AWS_SECRET_ACCESS_KEY)!,
      },
    });
  }

  public async sendVerificationCode(phoneNumber: string, code: string) {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: `Your verification code is: ${code}`,
    });

    await this.snsClient.send(command);
  }
}
