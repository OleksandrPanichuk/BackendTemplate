import { Trim } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DisableTotpInput {
  @ApiProperty({
    description:
      '6-digit TOTP code from authenticator app or 8-character backup code',
    example: '123456',
    required: true,
    nullable: false,
    type: String,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  readonly code: string;
}
