import { IsRequiredString } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetPasswordTokenInput {
  @ApiProperty({
    description: 'Reset password token',
    required: true,
    type: String,
  })
  @IsRequiredString()
  readonly token: string;
}
