import { Trim } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SetupSmsInput {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+1234567890',
    pattern: '^\\+[1-9]\\d{1,14}$',
    required: true,
    nullable: false,
    type: String,
  })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +1234567890)',
  })
  readonly phoneNumber: string;
}
