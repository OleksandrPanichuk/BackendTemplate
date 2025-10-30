import { Trim } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DisableSmsInput {
  @ApiProperty({
    description: '6-digit SMS code',
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
  @Length(6, 6, { message: 'SMS code must be exactly 6 digits' })
  readonly code: string;
}
