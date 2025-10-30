import { IsEmail, IsStrongPassword } from 'class-validator';
import { PASSWORD_CONFIG } from '@/auth/auth.constants';
import { TrimAndLower } from '@/shared/decorators';
import { ApiProperty } from '@nestjs/swagger';

export class SignInInput {
  @ApiProperty({
    description: 'Email address',
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
