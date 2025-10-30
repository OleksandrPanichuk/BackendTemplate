import { Trim } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RegenerateBackupCodesInput {
  @ApiProperty({
    description: '6-digit TOTP code to verify identity',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    required: true,
    nullable: false,
    type: String,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  readonly token: string;
}
