import { Trim } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyBackupCodeInput {
  @ApiProperty({
    description: '8-character backup code',
    example: 'A1B2C3D4',
    minLength: 8,
    maxLength: 8,
    required: true,
    nullable: false,
    type: String,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(8, 8, { message: 'Backup code must be exactly 8 characters' })
  readonly code: string;
}
