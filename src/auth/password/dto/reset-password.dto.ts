import { VerifyResetPasswordTokenInput } from '@/auth/password/dto/verify-reset-password-token.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from 'class-validator';
import { PASSWORD_CONFIG } from '@/auth/auth.constants';

export class ResetPasswordInput extends VerifyResetPasswordTokenInput {
  @ApiProperty({
    description: 'Password',
    example: 'StrongPassword123_!',
    required: true,
    maxLength: 255,
    minLength: 8,
    nullable: false,
    type: String,
  })
  @IsStrongPassword(PASSWORD_CONFIG, {
    message:
      'Password must contain at least 8 characters, including uppercase, lowercase, numbers, and symbols',
  })
  readonly password: string;
}
