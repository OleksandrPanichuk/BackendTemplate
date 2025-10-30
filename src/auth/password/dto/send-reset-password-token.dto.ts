import { TrimAndLower } from '@/shared/decorators';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerifyResetPasswordTokenInput } from '@/auth/password/dto/verify-reset-password-token.dto';

export class SendResetPasswordTokenInput extends VerifyResetPasswordTokenInput {
  @ApiProperty({
    description: 'Email address of the user requesting password reset',
    example: 'example@gmail.com',
    required: true,
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    maxLength: 255,
    minLength: 5,
    uniqueItems: true,
    nullable: false,
    type: String,
  })
  @TrimAndLower()
  @IsEmail(undefined, { message: 'Invalid email address' })
  readonly email: string;
}
